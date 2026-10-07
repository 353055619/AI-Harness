#!/usr/bin/env python3
"""plugin-finder: 离线搜索本机已配置的 ZCode 插件市场。

数据全部来自本地文件（无需联网）：
  ~/.zcode/cli/plugins/known_marketplaces.json        市场列表
  ~/.zcode/cli/plugins/marketplaces/<id>/marketplace.json  各市场插件清单
  ~/.zcode/cli/plugins/installed_plugins.json         已安装
  ~/.zcode/cli/config.json                            启用状态

用法：
  find_plugins.py <关键词>...          按关键词搜索（中英文均可，多词 AND 计分）
  find_plugins.py --list-markets       列出已配置的市场
  find_plugins.py <词> --installed     只看已安装的
  find_plugins.py <词> --market <id>   限定市场
  find_plugins.py <词> --json          输出 JSON
字段与 schema 细节见 ../references/data-sources.md
"""
import argparse
import json
import re
import sys
from pathlib import Path

PLUGINS_DIR = Path.home() / ".zcode" / "cli" / "plugins"
CONFIG_PATH = Path.home() / ".zcode" / "cli" / "config.json"
DESC_LIMIT = 68


def load_json(path, warn_missing=False):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        if warn_missing:
            print(f"warn: 文件不存在，跳过: {path}", file=sys.stderr)
    except (json.JSONDecodeError, OSError) as e:
        print(f"warn: 解析失败，跳过: {path} ({e})", file=sys.stderr)
    return None


def market_catalog(market_id):
    """返回市场清单 dict；优先市场根 marketplace.json，回退 .claude-plugin/。"""
    root = PLUGINS_DIR / "marketplaces" / market_id
    for candidate in (root / "marketplace.json", root / ".claude-plugin" / "marketplace.json"):
        data = load_json(candidate)
        if data and isinstance(data.get("plugins"), list):
            return data
    return None


def pick_description(entry):
    desc = entry.get("description_i18n", {}) or {}
    if isinstance(desc, dict) and desc.get("zh-CN"):
        return desc["zh-CN"]
    return entry.get("description") or ""


def pick_display_name(entry):
    names = entry.get("displayName_i18n", {}) or {}
    if isinstance(names, dict) and names.get("zh-CN"):
        return names["zh-CN"]
    return entry.get("displayName") or entry.get("name") or ""


def describe_source(entry):
    """把 source 四形态压成一句话，供 agent/用户判断来源。"""
    src = entry.get("source")
    if isinstance(src, str):
        if src == "filesystem":
            cp = entry.get("cachePath", "")
            return "内置(已随宿主物化)" if cp else "内置"
        return f"本地路径 {src}"
    if isinstance(src, dict):
        kind = src.get("source") or src.get("kind") or "?"
        url = src.get("url", "")
        if kind == "git-subdir":
            return f"{url} @ {src.get('ref', '')} 子目录 {src.get('path', '')}".strip()
        if kind == "url":
            return url
        return f"{kind}: {url}".strip()
    return "?"


def iter_entries():
    """产出 (market_id, entry, renames)。跳过自述非用户可见的条目。"""
    known = load_json(PLUGINS_DIR / "known_marketplaces.json") or {}
    for m in known.get("marketplaces", []):
        mid = m.get("id")
        cat = market_catalog(mid)
        if not cat:
            print(f"warn: 市场 {mid} 本地清单缺失或无 plugins[]", file=sys.stderr)
            continue
        renames = cat.get("renames", {}) or {}
        for entry in cat.get("plugins", []):
            if not isinstance(entry, dict) or not entry.get("name"):
                continue
            yield mid, entry, renames


def load_installed():
    data = load_json(PLUGINS_DIR / "installed_plugins.json") or {}
    installed = {}
    for p in data.get("plugins", []):
        installed[(p.get("name"), p.get("marketplace"))] = p
    return installed


def load_enabled():
    cfg = load_json(CONFIG_PATH) or {}
    plugins_cfg = cfg.get("plugins", {}) or {}
    enabled = plugins_cfg.get("enabledPlugins", {}) or {}
    return {k: v for k, v in enabled.items() if v is True}


def plugin_id(entry, mid, installed, renames):
    cur = entry.get("name")
    p = installed.get((cur, mid))
    if p:
        return p.get("id", f"{cur}@{mid}")
    # renames: 旧名 → 新名，已装记录可能还在用旧名
    old = next((o for o, n in renames.items() if n == cur), None)
    p = installed.get((old, mid)) if old else None
    return p.get("id", f"{old}@{mid}") if p else f"{cur}@{mid}"


def status_of(entry, mid, installed, enabled, renames):
    """安装/活跃三态判定（官方内置插件不走 installed_plugins.json）：
    活跃 = data/<pid>/ 运行时目录存在 或 enabledPlugins 显式 true；
    已装 = installed_plugins.json 登记 或 cache/<市场>/<name>/ 已物化。"""
    pid = plugin_id(entry, mid, installed, renames)
    name = entry.get("name")
    active = (PLUGINS_DIR / "data" / pid).exists() or pid in enabled
    if active:
        return "已装·使用中", pid
    cached = (PLUGINS_DIR / "cache" / mid / name).exists()
    if (name, mid) in installed or cached:
        return "已装·未启用", pid
    return "未安装", pid


def score(terms, entry):
    """多词累计计分：name > keywords > displayName > category > author > description。"""
    name = (entry.get("name") or "").lower()
    display = pick_display_name(entry).lower()
    desc = pick_description(entry).lower()
    kws = " ".join(
        str(k) for k in (entry.get("keywords") or []) + (entry.get("tags") or [])
    ).lower()
    cat = str(entry.get("category") or "").lower()
    author = str((entry.get("author") or {}).get("name", "")).lower()
    total = 0
    for t in terms:
        tl = t.lower()
        if tl in name:
            total += 10
        if tl in kws:
            total += 8
        if tl in display:
            total += 6
        if tl in cat:
            total += 5
        if tl in author:
            total += 3
        if tl in desc:
            total += 2
    return total


def is_user_facing(entry):
    return "not user-facing" not in pick_description(entry).lower()


def fmt_desc(s):
    s = re.sub(r"\s+", " ", s).strip()
    return s[: DESC_LIMIT - 1] + "…" if len(s) > DESC_LIMIT else s


def main():
    ap = argparse.ArgumentParser(description="离线搜索已配置插件市场")
    ap.add_argument("terms", nargs="*", help="搜索关键词（中英文均可）")
    ap.add_argument("--market", help="限定市场 id，如 zcode-plugins-official")
    ap.add_argument("--installed", action="store_true", help="只显示已安装的")
    ap.add_argument("--json", action="store_true", dest="as_json", help="输出 JSON")
    ap.add_argument("--limit", type=int, default=15)
    ap.add_argument("--list-markets", action="store_true", help="列出已配置市场")
    ap.add_argument("--all", action="store_true", help="包含非用户可见条目（如运行时宿主）")
    args = ap.parse_args()

    if args.list_markets:
        known = load_json(PLUGINS_DIR / "known_marketplaces.json") or {}
        rows = [
            {"id": m.get("id"), "pluginCount": m.get("pluginCount"),
             "source": m.get("source", {}).get("url") or m.get("source", {}).get("repo"),
             "lastUpdated": m.get("lastUpdated", "")[:10]}
            for m in known.get("marketplaces", [])
        ]
        print(json.dumps(rows, ensure_ascii=False, indent=2) if args.as_json
              else "\n".join(f"{r['id']}  ({r['pluginCount']} 插件, 更新于 {r['lastUpdated']}, 源: {r['source']})" for r in rows))
        return 0

    if not args.terms:
        ap.error("请提供搜索关键词，或用 --list-markets 查看市场列表")

    installed, enabled = load_installed(), load_enabled()
    results = []
    for mid, entry, renames in iter_entries():
        if args.market and mid != args.market:
            continue
        if not args.all and not is_user_facing(entry):
            continue
        s = score(args.terms, entry)
        if s <= 0:
            continue
        status, pid = status_of(entry, mid, installed, enabled, renames)
        if args.installed and not status.startswith("已装"):
            continue
        results.append({
            "score": s, "plugin": pid, "market": mid,
            "name": entry.get("name"), "displayName": pick_display_name(entry),
            "version": entry.get("version", ""),
            "category": entry.get("category", ""),
            "author": (entry.get("author") or {}).get("name", ""),
            "status": status, "description": pick_description(entry).strip(),
            "source": describe_source(entry),
            "requiresPaidPlan": bool(entry.get("requiresPaidPlan")),
        })

    results.sort(key=lambda r: (-r["score"], r["plugin"]))
    results = results[: args.limit]

    if not results:
        print("无匹配插件。可换关键词（英文命中率更高），或 --list-markets 查看市场。")
        return 0

    if args.as_json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return 0

    print(f"| {'插件@市场':<44} | 状态 | 分类 | 描述 |")
    print("|---|---|---|---|")
    for r in results:
        print(f"| {r['plugin']:<44} | {r['status']} | {r['category'] or '-'} | {fmt_desc(r['description'])} |")
    print(f"\n共 {len(results)} 条（按相关度）。安装路径：插件市场 → 个人 → 对应市场 → Install。")
    print("需付费计划的插件已用 requiresPaidPlan 标记（JSON 模式可见）。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
