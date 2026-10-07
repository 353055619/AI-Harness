#!/usr/bin/env python3
"""skill-finder: 从 GitHub 下载一个 skill（SKILL.md 目录）并安装到用户级或项目级。

用法：
  install_skill.py owner/repo[:子路径][@ref] --level user|project [--name 名称] [--force] [--dry-run]
  install_skill.py <github-url> --level user
  install_skill.py --list [--level user|project|all]
  install_skill.py --uninstall <名称> --level user|project [--force]

安装级别：
  user    → ~/.agents/skills/<名称>/     （全局可用，推荐通用技能）
  project → ./.agents/skills/<名称>/     （仅当前项目，cwd 为准）

安全规则：拒绝路径穿越（.. / 绝对路径）；目标已存在默认拒绝（--force 才覆盖）；
写 .origin.json 记录来源；--uninstall 拒绝删除没有 .origin.json 的手工/内置技能。
目录约定见 ../references/install-conventions.md
"""
import argparse
import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

USER_SKILLS = Path.home() / ".agents" / "skills"
UA = {"User-Agent": "skill-finder/0.1"}
MAX_FILES = 200
MAX_FILE_BYTES = 5 * 1024 * 1024


def gh_api(path, timeout=15):
    h = {"Accept": "application/vnd.github.v3+json", "User-Agent": "skill-finder/0.1"}
    if os.environ.get("GITHUB_TOKEN"):
        h["Authorization"] = f"Bearer {os.environ.get('GITHUB_TOKEN')}"
    req = urllib.request.Request(f"https://api.github.com{path}", headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def raw_get(owner, repo, ref, path, timeout=20):
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def parse_spec(spec):
    """owner/repo[:subpath][@ref] 或 GitHub URL → (owner, repo, subpath, ref)。"""
    spec = spec.strip()
    if spec.startswith("http"):
        m = re.match(r"https?://github\.com/([^/]+)/([^/]+)(/.*)?", spec)
        if not m:
            raise SystemExit(f"无法解析 GitHub URL: {spec}")
        owner, repo, rest = m.group(1), m.group(2).removesuffix(".git"), m.group(3) or ""
        sub, ref = None, None
        m2 = re.match(r"/tree/([^/]+)/(.+)", rest)
        if m2:
            ref, sub = m2.group(1), m2.group(2).strip("/")
        return owner, repo, sub, ref
    m = re.match(r"^([\w.-]+)/([\w.-]+?)(?:\.git)?(?:@([\w.\-/]+?))?(?::(.+))?$", spec)
    if not m:
        raise SystemExit(f"无法解析: {spec}（期望 owner/repo[:子路径][@ref]）")
    return m.group(1), m.group(2), m.group(4), m.group(3)


def resolve_ref(owner, repo):
    try:
        return gh_api(f"/repos/{owner}/{repo}")["default_branch"]
    except Exception:
        for br in ("main", "master"):
            try:
                raw_get(owner, repo, br, "README.md")
                return br
            except Exception:
                continue
    raise SystemExit(f"无法确定 {owner}/{repo} 的默认分支（API 限流？）")


def fetch_tree(owner, repo, ref):
    tree = gh_api(f"/repos/{owner}/{repo}/git/trees/{urllib.parse.quote(ref)}?recursive=1")
    if tree.get("truncated"):
        print("warn: 仓库过大，文件列表被截断", file=sys.stderr)
    return [(e["path"], e.get("size", 0)) for e in tree.get("tree", []) if e.get("type") == "blob"]


def locate_skill_dir(blobs, subpath):
    """返回 (子路径, 文件相对路径列表)。"""
    if subpath:
        prefix = subpath.strip("/") + "/"
        rel = [p for p, _ in blobs if p == subpath or p.startswith(prefix)]
        if not any(p.removeprefix(prefix) == "SKILL.md" for p in rel):
            raise SystemExit(f"{subpath} 下没有 SKILL.md，不是有效 skill 目录")
        return subpath, [p.removeprefix(prefix) for p in rel if p != subpath]
    skillmds = [p for p, _ in blobs if p == "SKILL.md" or p.endswith("/SKILL.md")]
    if len(skillmds) == 1:
        sub = "/".join(skillmds[0].split("/")[:-1])
        return (sub, [p for p, _ in blobs]) if not sub else (sub, [p.removeprefix(sub + "/") for p, _ in blobs])
    if len(skillmds) > 1:
        cands = "\n".join("  - " + "/".join(p.split("/")[:-1]) for p in skillmds[:20])
        raise SystemExit(f"仓库里有多个 skill，请用 owner/repo:子路径 指定：\n{cands}")
    raise SystemExit("仓库里没有 SKILL.md，不是 skill 仓库")


def safe_target(base, rel):
    p = PurePosixPath(rel)
    if p.is_absolute() or ".." in p.parts:
        raise SystemExit(f"拒绝不安全路径: {rel}")
    t = (base / p).resolve()
    if not str(t).startswith(str(base.resolve()) + os.sep) and t != base.resolve():
        raise SystemExit(f"拒绝越界路径: {rel}")
    return t


def frontmatter_name(md_bytes):
    m = re.match(rb"^---\s*\n(.*?)\n---", md_bytes, re.S)
    if not m:
        return None
    n = re.search(rb"^name:\s*[\"']?([\w.-]+)", m.group(1), re.M)
    return n.group(1).decode() if n else None


def do_install(spec, args):
    owner, repo, subpath, ref = parse_spec(spec)
    ref = ref or resolve_ref(owner, repo)
    print(f"来源: {owner}/{repo} @ {ref}" + (f" 子路径: {subpath}" if subpath else ""))

    blobs = fetch_tree(owner, repo, ref)
    sub, rels = locate_skill_dir(blobs, subpath)
    if sub != subpath:
        print(f"定位到 skill 目录: {sub or '(仓库根)'}")

    base = Path(args.dir).expanduser().resolve() if args.dir else (
        USER_SKILLS if args.level == "user" else Path.cwd() / ".agents" / "skills").resolve()
    name = args.name or (sub.split("/")[-1] if sub else repo)
    target = base / name

    files = []
    for rel in rels:
        rel_posix = str(PurePosixPath(rel))
        if "__MACOSX" in rel_posix or "/.git/" in rel_posix or rel_posix.startswith(".git/"):
            continue
        files.append(rel_posix)
    if len(files) > MAX_FILES:
        raise SystemExit(f"文件数 {len(files)} 超过上限 {MAX_FILES}，请检查子路径")

    # 先拉 SKILL.md 做校验与展示（dry-run 也走这步）
    try:
        idx = files.index("SKILL.md")
    except ValueError:
        raise SystemExit("目标目录缺少 SKILL.md")
    sk_md = raw_get(owner, repo, ref, f"{sub}/SKILL.md" if sub else "SKILL.md")
    fm_name = frontmatter_name(sk_md)
    if not args.name and fm_name and re.fullmatch(r"[\w.-]+", fm_name) and fm_name != name:
        print(f"按 SKILL.md frontmatter 将目录名 {name} 校正为 {fm_name}")
        name, target = fm_name, base / fm_name
    if not fm_name:
        print("warn: SKILL.md 无 name 字段（不符合 agentskills.io 规范）", file=sys.stderr)

    total = sum(s for p, s in blobs if p.startswith((sub + "/" if sub else "")))
    print(f"技能名: {name}｜文件数: {len(files)}｜约 {total // 1024} KB｜目标: {target}")

    if args.dry_run:
        print(f"\n[DRY-RUN] 将下载 {len(files)} 个文件到 {target}，SKILL.md frontmatter:")
        print("-" * 60)
        print(sk_md.decode("utf-8", "replace")[:600])
        print("-" * 60)
        return 0

    if target.exists() and not args.force:
        raise SystemExit(f"目标已存在: {target}（确认后加 --force 覆盖）")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)

    for rel in files:
        dest = safe_target(target, rel)
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = raw_get(owner, repo, ref, f"{sub}/{rel}" if sub else rel)
        if len(data) > MAX_FILE_BYTES:
            print(f"warn: 跳过超大文件 {rel} ({len(data) // 1024} KB)", file=sys.stderr)
            continue
        dest.write_bytes(data)
    (target / ".origin.json").write_text(json.dumps({
        "installedBy": "skill-finder", "source": "github",
        "repo": f"{owner}/{repo}", "ref": ref, "subpath": sub,
        "url": f"https://github.com/{owner}/{repo}" + (f"/tree/{ref}/{sub}" if sub else ""),
        "installedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ 已安装到 {target}（新会话生效；来源记录 .origin.json）")
    return 0


def level_dirs(level):
    pairs = [("user", USER_SKILLS), ("project", Path.cwd() / ".agents" / "skills")]
    return pairs if level == "all" else [p for p in pairs if p[0] == level]


def do_list(args):
    found = False
    for lvl, base in level_dirs(args.level):
        if not base.is_dir():
            continue
        for d in sorted(base.iterdir()):
            if not (d / "SKILL.md").exists():
                continue
            origin = d / ".origin.json"
            src = json.loads(origin.read_text()).get("url", "-") if origin.exists() else "-"
            print(f"{lvl:<7} {d.name:<28} {src}")
            found = True
    if not found:
        print("（无已安装技能）")
    return 0


def do_uninstall(args):
    for lvl, base in level_dirs(args.level):
        d = base / args.uninstall
        if not d.is_dir():
            continue
        if not (d / ".origin.json").exists() and not args.force:
            raise SystemExit(f"{d} 没有 .origin.json（手工/内置技能），拒绝卸载；确需删除请加 --force")
        shutil.rmtree(d)
        print(f"已卸载 {d}")
        return 0
    raise SystemExit(f"未找到技能 {args.uninstall}（{args.level} 级）")


def main():
    ap = argparse.ArgumentParser(description="从 GitHub 安装 skill 到用户级/项目级")
    ap.add_argument("spec", nargs="?", help="owner/repo[:子路径][@ref] 或 GitHub URL")
    ap.add_argument("--level", choices=["user", "project"], default="user")
    ap.add_argument("--dir", help="显式指定安装根目录（调试用）")
    ap.add_argument("--name", help="指定技能目录名（默认取子路径/仓库名，并按 frontmatter name 校正）")
    ap.add_argument("--force", action="store_true", help="覆盖已存在的同名目录")
    ap.add_argument("--dry-run", action="store_true", help="只展示下载计划与 SKILL.md，不写入")
    ap.add_argument("--list", action="store_true", help="列出已安装技能及来源")
    ap.add_argument("--uninstall", metavar="名称", help="卸载指定技能")
    args = ap.parse_args()

    if args.list:
        return do_list(args)
    if args.uninstall:
        return do_uninstall(args)
    if not args.spec:
        ap.error("请提供 owner/repo[:子路径] 或使用 --list / --uninstall")
    return do_install(args.spec, args)


if __name__ == "__main__":
    raise SystemExit(main())
