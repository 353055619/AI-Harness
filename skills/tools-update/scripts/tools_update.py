#!/usr/bin/env python3
"""tools-update：更新 ~/.agents/（或 --root 指定根）下的上游技能与插件。

分类规则见 ../SKILL.md。默认 dry-run（不联网不改盘）；--apply 才动盘，动盘前整目录备份。
"""
import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from fnmatch import fnmatch

KIND_PLUGIN_UP = "上游插件仓"
KIND_PLUGIN_LOCAL = "自研插件"
KIND_SKILL_VENDORED = "vendored 技能"
KIND_SKILL_LOCAL = "无凭证技能"
KIND_UNKNOWN = "未识别"

PRUNE = {".git", ".tools-update", ".trash", "node_modules", "__pycache__", ".DS_Store"}


def sh(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def state_dir(root):
    return os.path.join(root, ".tools-update")


def load_registry(root):
    return load_json(os.path.join(state_dir(root), "registry.json")) or {}


def classify(d):
    """返回 (kind, meta)。meta 含上游解析所需信息。"""
    if os.path.isfile(os.path.join(d, ".claude-plugin", "marketplace.json")) or \
       os.path.isfile(os.path.join(d, ".claude-plugin", "plugin.json")):
        repo = None
        pj = load_json(os.path.join(d, ".claude-plugin", "plugin.json"))
        if pj and isinstance(pj.get("repository"), str):
            repo = pj["repository"]
        elif pj:
            r = pj.get("repository")
            if isinstance(r, dict) and isinstance(r.get("url"), str):
                repo = r["url"]
        return KIND_PLUGIN_UP, {"repository": repo}
    if os.path.isfile(os.path.join(d, ".zcode-plugin", "plugin.json")):
        return KIND_PLUGIN_LOCAL, {}
    if os.path.isfile(os.path.join(d, "SKILL.md")):
        origin = load_json(os.path.join(d, ".origin.json")) or {}
        url = origin.get("url") or origin.get("upstream") or ""
        if isinstance(url, str) and url.startswith(("http://", "https://", "github.com")):
            return KIND_SKILL_VENDORED, {"url": url, "origin": origin}
        return KIND_SKILL_LOCAL, {}
    return KIND_UNKNOWN, {}


def scan(root):
    """遍历 root（深度≤3），产出 [(relpath, kind, meta)]；已分类目录不再下钻。"""
    items = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [x for x in dirnames if x not in PRUNE and not x.startswith(".")]
        rel = os.path.relpath(dirpath, root)
        if rel.count(os.sep) > 3:
            dirnames[:] = []
            continue
        kind, meta = classify(dirpath)
        if kind != KIND_UNKNOWN:
            items.append((rel, kind, meta))
            dirnames[:] = []  # 单元内部不再扫描
    items.sort()
    return items


def parse_skill_url(url, name):
    """url → (repo_url, subpath|None)。支持 github /tree/<ref>/<路径> 与仓库式。"""
    url = url.strip()
    if url.startswith("github.com"):
        url = "https://" + url
    m = re.match(r"https://github\.com/([^/]+/[^/]+)/tree/[^/]+/(.+)$", url)
    if m:
        return f"https://github.com/{m.group(1)}", m.group(2).rstrip("/")
    m = re.match(r"https://github\.com/([^/]+/[^/]+?)(?:\.git)?/?$", url)
    if m:
        return f"https://github.com/{m.group(1)}", None
    return url, None


def match_only(rel, name, patterns):
    if not patterns:
        return True
    return any(fnmatch(name, p) or fnmatch(rel, p) for p in patterns)


def backup(root, rel, ts):
    src = os.path.join(root, rel)
    dst = os.path.join(state_dir(root), "backup", ts, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copytree(src, dst)


def plugin_manifest_version(plugin_dir):
    for marker in (".claude-plugin", ".zcode-plugin"):
        pj = load_json(os.path.join(plugin_dir, marker, "plugin.json"))
        if pj and isinstance(pj.get("version"), str):
            return pj["version"]
    return None


def sync_marketplace(root, ts, apply):
    """marketplace.json 条目 version ← 插件自报版本（.claude-plugin/.zcode-plugin 的 plugin.json）。
    返回变更行列表。apply=False 只预览；apply=True 先备份 marketplace.json 再写回。
    背景：克隆覆盖更新上游插件后清单版本会滞后，市场页就显示旧版。"""
    lines = []
    for mkt_path in (os.path.join(root, "marketplace.json"),
                     os.path.join(root, "plugins", "marketplace.json")):
        mkt = load_json(mkt_path)
        if not isinstance(mkt, dict) or not isinstance(mkt.get("plugins"), list):
            continue
        base = os.path.dirname(mkt_path)
        changed = False
        for ent in mkt["plugins"]:
            if not isinstance(ent, dict):
                continue
            name, old = ent.get("name"), ent.get("version")
            src = ent.get("source") or ""
            if not name or not isinstance(old, str):
                continue
            if src.startswith("./"):
                src = src[2:]
            new = plugin_manifest_version(os.path.join(base, src or name))
            if new and new != old:
                ent["version"] = new
                changed = True
                lines.append(f"市场版本同步：{name} {old} → {new}（{os.path.relpath(mkt_path, root)}）")
        if changed and apply:
            dst = os.path.join(state_dir(root), "backup", ts, os.path.relpath(mkt_path, root))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(mkt_path, dst)
            with open(mkt_path, "w", encoding="utf-8") as f:
                json.dump(mkt, f, ensure_ascii=False, indent=2)
    return lines


def update_plugin(root, rel, meta, registry, ts):
    d = os.path.join(root, rel)
    if os.path.isdir(os.path.join(d, ".git")):
        r = sh(["git", "-C", d, "pull", "--ff-only"])
        if r.returncode == 0:
            return "ok", f"git pull 完成 {r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''}"
        return "fail", f"git pull 失败：{(r.stderr or r.stdout).strip().splitlines()[:1]}"
    upstream = meta.get("repository") or registry.get(os.path.realpath(d))
    if not upstream:
        return "fail", "无 .git 也无 repository 字段/登记表上游，先用 --set-upstream 登记"
    backup(root, rel, ts)
    tmp = tempfile.mkdtemp(prefix="tools-update-")
    try:
        r = sh(["git", "clone", "--depth", "1", upstream, os.path.join(tmp, "repo")])
        if r.returncode != 0:
            return "fail", f"克隆失败：{(r.stderr or '').strip().splitlines()[:1]}"
        rs = sh(["rsync", "-a", "--delete", "--exclude", ".git",
                 os.path.join(tmp, "repo") + "/", d + "/"])
        if rs.returncode != 0:
            return "fail", f"rsync 失败：{rs.stderr.strip()[:120]}"
        return "ok", f"已按上游覆盖（{upstream}），旧版在 backup/{ts}/{rel}"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def update_skill(root, rel, meta, registry, ts):
    name = os.path.basename(rel)
    d = os.path.join(root, rel)
    repo, subpath = parse_skill_url(meta["url"], name)
    tmp = tempfile.mkdtemp(prefix="tools-update-")
    try:
        r = sh(["git", "clone", "--depth", "1", repo, os.path.join(tmp, "repo")])
        if r.returncode != 0:
            return "fail", f"克隆失败：{(r.stderr or '').strip().splitlines()[:1]}"
        cands = [os.path.join(tmp, "repo", subpath)] if subpath else [
            os.path.join(tmp, "repo", "skills", name), os.path.join(tmp, "repo", name)]
        src = next((c for c in cands if os.path.isfile(os.path.join(c, "SKILL.md"))), None)
        if not src:
            return "fail", f"克隆里找不到 {name} 的 SKILL.md（候选：{[os.path.relpath(c, tmp) for c in cands]}）"
        backup(root, rel, ts)
        rs = sh(["rsync", "-a", "--delete", "--exclude", ".origin.json", src + "/", d + "/"])
        if rs.returncode != 0:
            return "fail", f"rsync 失败：{rs.stderr.strip()[:120]}"
        op = os.path.join(d, ".origin.json")
        origin = load_json(op) or {}
        now = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
        origin["installed"] = datetime.date.today().isoformat()
        origin["installedAt"] = now  # skill-finder 系凭证用该字段，一并刷新
        with open(op, "w", encoding="utf-8") as f:
            json.dump(origin, f, ensure_ascii=False, indent=2)
        return "ok", f"已更新到上游最新（{repo}），旧版在 backup/{ts}/{rel}"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser(description="更新上游技能与插件（默认 dry-run）")
    ap.add_argument("--apply", action="store_true", help="真正执行（默认只列计划）")
    ap.add_argument("--only", default="", help="只处理匹配项，逗号分隔，支持 * 通配")
    ap.add_argument("--root", default=os.path.expanduser("~/.agents"), help="扫描根目录")
    ap.add_argument("--set-upstream", nargs=2, metavar=("DIR", "URL"), help="登记插件仓上游地址")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if args.set_upstream:
        d, url = args.set_upstream
        reg_path = os.path.join(state_dir(root), "registry.json")
        reg = load_registry(root)
        os.makedirs(state_dir(root), exist_ok=True)
        reg[os.path.realpath(d)] = url
        with open(reg_path, "w", encoding="utf-8") as f:
            json.dump(reg, f, ensure_ascii=False, indent=2)
        print(f"已登记：{d} → {url}（{reg_path}）")
        return 0

    patterns = [p.strip() for p in args.only.split(",") if p.strip()]
    registry = load_registry(root)
    items = scan(root)
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    rows, results, fails = [], [], 0
    for rel, kind, meta in items:
        name = os.path.basename(rel)
        sel = match_only(rel, name, patterns)
        if kind in (KIND_PLUGIN_LOCAL, KIND_SKILL_LOCAL):
            why = "本地权威，不更新" if kind == KIND_PLUGIN_LOCAL else "无凭证，不猜测上游"
            rows.append([name, kind, "-", "-", why if sel else "跳过（未选中）"])
            continue
        if not sel:
            rows.append([name, kind, "-", "-", "跳过（未选中）"])
            continue
        if not args.apply:
            mode = "git pull" if (kind == KIND_PLUGIN_UP and os.path.isdir(os.path.join(root, rel, ".git"))) else (
                "克隆覆盖" if kind == KIND_PLUGIN_UP else "克隆覆盖技能目录")
            upstream = meta.get("repository") or registry.get(os.path.realpath(os.path.join(root, rel))) or meta.get("url", "-")
            if kind == KIND_PLUGIN_UP and mode == "克隆覆盖" and not upstream:
                rows.append([name, kind, "-", "-", "需先 --set-upstream 登记上游"])
                continue
            rows.append([name, kind, upstream, mode, "计划更新（dry-run）"])
            continue
        try:
            status, msg = (update_plugin if kind == KIND_PLUGIN_UP else update_skill)(
                root, rel, meta, registry, ts)
        except Exception as e:  # 单项失败隔离
            status, msg = "fail", f"异常：{e}"
        if status == "fail":
            fails += 1
        rows.append([name, kind, "-", "-", msg])
        results.append({"name": name, "kind": kind, "status": status, "msg": msg})

    w = [max(len(str(r[i])) for r in rows + [["名称", "类别", "上游", "方式", "计划/结果"]]) for i in range(5)]
    for r in rows:
        print(" | ".join(str(r[i]).ljust(w[i]) for i in range(5)))
    sync_lines = sync_marketplace(root, ts, args.apply)
    if sync_lines:
        print(("\n市场版本滞后（apply 时自动同步）：" if not args.apply else "\n市场版本同步："))
        for line in sync_lines:
            print(f"  {line}")
    n_up = sum(1 for r in rows if "计划更新" in r[4] or r[4].startswith(("已更新", "已按上游", "git pull 完成")))
    n_skip = len(rows) - n_up - fails - sum(1 for r in rows if r[4].startswith("git pull 失败") or "失败" in r[4] or "异常" in r[4])
    print(f"\n汇总：共 {len(rows)} 项｜{'已更新' if args.apply else '计划更新'} {n_up}｜失败 {fails}｜跳过 {len(rows) - n_up - fails}")
    if args.apply:
        os.makedirs(state_dir(root), exist_ok=True)
        with open(os.path.join(state_dir(root), "last-run.json"), "w", encoding="utf-8") as f:
            json.dump({"time": ts, "root": root, "results": results,
                       "market_sync": sync_lines}, f, ensure_ascii=False, indent=2)
        print("生效提醒（源更新≠生效，ZCode 侧另需）：")
        print("  已装插件：zcode plugins update <name>@<marketplace>（重物化运行缓存）")
        print("  新装插件：装后必做 zcode plugins enable <name>@<marketplace>（装≠启用，"
              "启用态在 ~/.zcode/cli/config.json 的 plugins.enabledPlugins，缺这步技能不加载）")
        print("  技能：新开会话即生效；退役插件：zcode plugins uninstall 清登记/缓存/启用态")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
