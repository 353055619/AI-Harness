#!/usr/bin/env python3
"""skill-finder: 多引擎搜索互联网上的 agent skill（SKILL.md 生态）。

内置引擎（按条件自动启用，--engines 可指定子集）：
  skillsmp    skillsmp.com 聚合搜索 API（匿名 50 req/天，主发现引擎）
  anthropic   anthropics/skills 官方仓库枚举（结果缓存 24h）
  awesome     awesome-claude-skills / awesome-claude-code 精选清单解析（缓存 24h）
  ghcode      GitHub Code Search（需要环境变量 GITHUB_TOKEN）
  meyo        Meyo DeepSkill Market（需要已装 ~/.agents/skills/deep-skill-finder；带 clientId 遥测）
  npx         仅探测 npx 是否可用，提示 `npx skills find` 交互搜索（不实际调用）

用法：
  search_skills.py <关键词>... [--engines a,b,c] [--limit N] [--json] [--timeout S]
输出：Markdown 候选表（统一 schema 合并去重）+ 各引擎状态。
引擎 API 细节见 ../references/engines.md
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

CACHE_DIR = Path(tempfile.gettempdir()) / "skill-finder"
CACHE_TTL = 24 * 3600
UA = {"User-Agent": "skill-finder/0.1"}
ENGINE_WEIGHT = {"anthropic": 100, "awesome": 60, "skillsmp": 50, "meyo": 40, "ghcode": 20}
MEYO_SCRIPT = Path.home() / ".agents" / "skills" / "deep-skill-finder" / "scripts" / "deep_skill_search.py"


def http_get(url, timeout, headers=None, as_json=False):
    h = dict(UA)
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    return json.loads(raw) if as_json else raw.decode("utf-8", "replace")


def github_headers():
    h = {"Accept": "application/vnd.github.v3+json"}
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


def cached_fetch(key, url, timeout):
    """24h 本地缓存，省 GitHub/聚合站配额。返回文本或 None。"""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{key}.txt"
    if path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL:
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass
    try:
        text = http_get(url, timeout)
    except Exception as e:
        raise RuntimeError(f"{type(e).__name__}: {e}") from e
    path.write_text(text, encoding="utf-8")
    return text


def parse_github_url(u):
    """github web/raw URL → (owner, repo, subpath)；非 GitHub 返回 None。"""
    u = u.strip().rstrip("/)").removesuffix(".git")
    m = re.match(r"https?://github\.com/([^/]+)/([^/]+)(/[^\s]*)?", u)
    if m:
        owner, repo, rest = m.group(1), m.group(2), m.group(3) or ""
        m2 = re.match(r"/(?:tree|blob)/([^/]+)/(.+)", rest)
        if m2:
            sub = m2.group(2)
            if "/blob/" in rest:
                sub = "/".join(sub.split("/")[:-1])  # 文件链接 → 取所在目录
            return owner, repo, sub.strip("/") or None
        return owner, repo, None
    m = re.match(r"https?://raw\.githubusercontent\.com/([^/]+)/([^/]+)/([^/]+)/(.+)", u)
    if m:
        sub = m.group(4)
        if sub.endswith("SKILL.md"):
            sub = "/".join(sub.split("/")[:-1])
        return m.group(1), m.group(2), sub.strip("/") or None
    return None


def frontmatter_name_desc(md_text):
    m = re.match(r"^---\s*\n(.*?)\n---", md_text, re.S)
    if not m:
        return None, None
    fm = m.group(1)
    n = re.search(r"^name:\s*[\"']?([\w.-]+)", fm, re.M)
    d = re.search(r"^description:\s*>\-?\s*\n((?:\s+.+\n)+)|^description:\s*[\"']?(.+?)[\"']?\s*$", fm, re.M)
    desc = ((d.group(1) or "").strip() or (d.group(2) or "").strip()) if d else None
    return (n.group(1) if n else None), desc


# ---------------- 引擎实现：各自返回统一条目列表 ----------------

def _item(name, owner, repo, subpath, desc, stars, engine, url=None):
    return {"name": name, "repo": f"{owner}/{repo}", "subpath": subpath,
            "url": url or f"https://github.com/{owner}/{repo}"
                + (f"/tree/main/{subpath}" if subpath else ""),
            "stars": stars or 0, "description": (desc or "").strip(), "engines": [engine]}


def engine_skillsmp(terms, opt):
    q = urllib.parse.quote(" ".join(terms))
    data = http_get(f"https://skillsmp.com/api/v1/skills/search?q={q}&sortBy=stars&limit=20",
                    opt["timeout"], as_json=True)
    # 包络兼容：顶层数组 / {items|results|skills} / {data:{skills|items|results}}
    rows = data if isinstance(data, list) else None
    if rows is None and isinstance(data, dict):
        for key in ("data", "items", "results", "skills"):
            v = data.get(key)
            if isinstance(v, list):
                rows = v
                break
            if isinstance(v, dict):
                rows = next((v[k] for k in ("skills", "items", "results")
                             if isinstance(v.get(k), list)), None)
                if rows:
                    break
    out = []
    for r in rows or []:
        gh = parse_github_url(r.get("githubUrl") or r.get("skillUrl") or "")
        if not gh:
            continue
        owner, repo, sub = gh
        out.append(_item(r.get("name") or (sub or repo), owner, repo, sub,
                         r.get("description"), r.get("stars"), "skillsmp"))
    return out


def engine_anthropic(terms, opt):
    cache = CACHE_DIR / "anthropics-skills.json"
    if cache.exists() and time.time() - cache.stat().st_mtime < CACHE_TTL:
        catalog = json.loads(cache.read_text(encoding="utf-8"))
    else:
        listing = http_get("https://api.github.com/repos/anthropics/skills/contents/skills",
                           opt["timeout"], github_headers(), as_json=True)
        catalog = []
        for item in listing:
            if item.get("type") != "dir":
                continue
            d = item["name"]
            try:
                md = http_get(f"https://raw.githubusercontent.com/anthropics/skills/main/skills/{d}/SKILL.md",
                              opt["timeout"])
            except Exception:
                continue
            n, desc = frontmatter_name_desc(md)
            catalog.append({"dir": d, "name": n or d, "description": desc or ""})
        cache.write_text(json.dumps(catalog, ensure_ascii=False), encoding="utf-8")
    out = []
    for c in catalog:
        text = f"{c['name']} {c['dir']} {c['description']}".lower()
        if any(t.lower() in text for t in terms):
            out.append(_item(c["name"], "anthropics", "skills", f"skills/{c['dir']}",
                             c["description"], None, "anthropic"))
    if not terms:
        out = [_item(c["name"], "anthropics", "skills", f"skills/{c['dir']}",
                     c["description"], None, "anthropic") for c in catalog]
    return out


_AWESOME_SOURCES = [
    ("awesome-behisecc", "https://raw.githubusercontent.com/BehiSecc/awesome-claude-skills/main/README.md"),
    ("awesome-travisvn", "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/master/README.md"),
    ("awesome-claude-code", "https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/README.md"),
]


def engine_awesome(terms, opt):
    entry_re = re.compile(r"^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[-—–:.]?\s*(.*)$")
    out = []
    for key, url in _AWESOME_SOURCES:
        # awesome-claude-code 是大杂烩，只取 Skills 小节
        only_skills_section = "claude-code" in key
        try:
            text = cached_fetch(key, url, opt["timeout"])
        except Exception as e:
            print(f"warn: awesome 源 {key} 拉取失败: {e}", file=sys.stderr)
            continue
        in_skills = not only_skills_section
        for line in text.splitlines():
            if only_skills_section:
                if re.match(r"^#+\s", line):
                    in_skills = "skill" in line.lower()
                    continue
                if not in_skills:
                    continue
            m = entry_re.match(line)
            if not m:
                continue
            label, link, desc = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
            gh = parse_github_url(link)
            if not gh:
                continue
            owner, repo, sub = gh
            hay = f"{label} {desc} {repo} {sub or ''}".lower()
            if terms and not any(t.lower() in hay for t in terms):
                continue
            out.append(_item(sub.split("/")[-1] if sub else label, owner, repo, sub, desc, None, "awesome"))
    return out


def engine_ghcode(terms, opt):
    if not os.environ.get("GITHUB_TOKEN"):
        raise RuntimeError("未检测到 GITHUB_TOKEN，跳过（该引擎需认证）")
    q = urllib.parse.quote(f"filename:SKILL.md {' '.join(terms)}")
    data = http_get(f"https://api.github.com/search/code?q={q}&per_page=20",
                    opt["timeout"], github_headers(), as_json=True)
    out = []
    for it in data.get("items", []):
        repo = it.get("repository", {}).get("full_name", "")
        if not repo or "/" not in repo:
            continue
        owner, rp = repo.split("/", 1)
        path = it.get("path", "")
        sub = "/".join(path.split("/")[:-1]) or None
        out.append(_item(path.split("/")[-2] if "/" in path else rp, owner, rp, sub,
                         "", None, "ghcode"))
    return out


def engine_meyo(terms, opt):
    if not MEYO_SCRIPT.exists():
        raise RuntimeError("未安装 deep-skill-finder（~/.agents/skills/deep-skill-finder），跳过")
    try:
        proc = subprocess.run(
            [sys.executable, str(MEYO_SCRIPT), " ".join(terms)],
            capture_output=True, text=True, timeout=opt["timeout"] + 50)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Meyo 搜索超时（>60s）")
    if proc.returncode != 0 and not proc.stdout.strip():
        raise RuntimeError(f"exit={proc.returncode} {proc.stderr.strip()[:200]}")
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise RuntimeError("Meyo 输出非 JSON，可能服务不可用")
    out = []
    for r in data.get("community", []):
        out.append(_item(r.get("name"), "deepskill.market", r.get("name"), None,
                         r.get("description") or r.get("reason"), r.get("downloadCount"), "meyo",
                         url="https://www.deepskill.market"))
    return out


ENGINES = {"skillsmp": engine_skillsmp, "anthropic": engine_anthropic,
           "awesome": engine_awesome, "ghcode": engine_ghcode, "meyo": engine_meyo}


def merge_and_rank(items, terms):
    merged = {}
    for it in items:
        key = (it["repo"], it["subpath"] or "")
        if key in merged:
            old = merged[key]
            old["engines"] = sorted(set(old["engines"]) | set(it["engines"]), 
                                    key=lambda e: -ENGINE_WEIGHT.get(e, 0))
            old["stars"] = max(old["stars"], it["stars"])
            if len(it["description"]) > len(old["description"]):
                old["description"] = it["description"]
            if it["name"] and (not old["name"] or it["engines"][0] == "anthropic"):
                old["name"] = it["name"]
        else:
            merged[key] = it
    def rank(it):
        s = max(ENGINE_WEIGHT.get(e, 0) for e in it["engines"])
        s += min(it["stars"], 2000) / 100.0
        nl, dl = it["name"].lower(), it["description"].lower()
        for t in terms:
            if t.lower() in nl:
                s += 5
            if t.lower() in dl:
                s += 2
        return -s
    return sorted(merged.values(), key=rank)


def main():
    ap = argparse.ArgumentParser(description="多引擎搜索互联网 agent skill")
    ap.add_argument("terms", nargs="*", help="搜索关键词（中英文均可）")
    ap.add_argument("--engines", help="引擎子集，逗号分隔：skillsmp,anthropic,awesome,ghcode,meyo")
    ap.add_argument("--limit", type=int, default=15)
    ap.add_argument("--json", action="store_true", dest="as_json")
    ap.add_argument("--timeout", type=int, default=12, help="单请求超时秒数")
    args = ap.parse_args()
    if not args.terms:
        ap.error("请提供搜索关键词")
    opt = {"timeout": args.timeout}

    selected = {k: v for k, v in ENGINES.items()
                if not args.engines or k in args.engines.split(",")}
    statuses, items = {}, []
    for name, fn in selected.items():
        try:
            got = fn(args.terms, opt)
            items.extend(got)
            statuses[name] = f"ok ({len(got)})"
        except Exception as e:
            statuses[name] = f"失败: {e}"
    if shutil.which("npx"):
        statuses["npx(探测)"] = "可用：可让用户跑 `npx skills find <关键词>` 交互搜索"

    ranked = merge_and_rank(items, args.terms)[: args.limit]

    if args.as_json:
        print(json.dumps({"results": ranked, "engineStatus": statuses},
                         ensure_ascii=False, indent=2))
        return 0

    if not ranked:
        print("各引擎均无结果。可换英文关键词重试，或看下方引擎状态排查。")
    else:
        print("| 技能 | 来源 | stars | 命中引擎 | 描述 |")
        print("|---|---|---|---|---|")
        for it in ranked:
            src = it["repo"] + (f"/{it['subpath']}" if it["subpath"] else "")
            desc = re.sub(r"\s+", " ", it["description"])[:60]
            print(f"| {it['name']} | {src} | {it['stars'] or '-'} | {'/'.join(it['engines'])} | {desc} |")
        print(f"\n安装：python3 <skill目录>/scripts/install_skill.py <owner/repo[:子路径]> --level user|project")
        print("Meyo 来源的技能请改用 deep-skill-finder 自带的 deep_skill_install.py 安装（该服务带 clientId 遥测）。")
    print("\n引擎状态：")
    for k, v in statuses.items():
        print(f"  - {k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
