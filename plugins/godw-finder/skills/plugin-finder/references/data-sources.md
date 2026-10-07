# 数据源速查（脚本失效时按此直接读文件）

全部在 `~/.zcode/cli/plugins/` 下，只读即可，不要写入。

## 读取链路

1. `known_marketplaces.json` → `marketplaces[].id`（另有 source/pluginCount/lastUpdated）
2. `marketplaces/<id>/marketplace.json`（缺失则回退 `marketplaces/<id>/.claude-plugin/marketplace.json`）→ `plugins[]`
3. `installed_plugins.json` → `plugins[].id`（形如 `name@marketplace`）
4. `~/.zcode/cli/config.json` → `plugins.enabledPlugins`（仅记录用户改过的开关）
5. `data/<pid>/` 存在 = 该插件当前活跃；`cache/<市场id>/<name>/` 存在 = 已物化/下载

## 三市场差异

| 市场 | 条目数 | 特有字段 | 备注 |
|---|---|---|---|
| zcode-plugins-official | 40 | `description_i18n["zh-CN"]`、`displayName_i18n`、`requiresPaidPlan`、`_artifact`、`cachePath` | 14 条 bundled 插件 `source` 为字符串 `"filesystem"`，配 `cachePath` 绝对路径；另有 `node-repl-host` 自述 "Not user-facing"，默认过滤 |
| claude-plugins-official | 314 | `renames`（顶层旧名→新名映射 9 条） | 完整 git 克隆；根级 marketplace.json 与 .claude-plugin/ 下内容有差异，**读根级** |
| developer-kit | 11 | — | marketplace.json 与 .claude-plugin/ 完全一致 |

## plugins[] 条目字段

- `name`（必有）、`description`、`version`、`category`（单数字符串）、`keywords`/`tags`（数组）
- `author: {name, email?}`、`homepage`、`icon`、`displayName`
- `source` 四形态：
  1. 对象 `{source:"url", url, sha?}` — git 仓库直装
  2. 对象 `{source:"url", type:"zip", url, sha256, path}` — zip 包
  3. 对象 `{source:"git-subdir", url, path, ref, sha}` — 仓库子目录
  4. 字符串 `"./plugins/<目录>"` — 相对市场根的本地路径（拼接 `marketplaces/<id>/` 即得插件目录，内含 `.zcode-plugin/plugin.json`，可进一步看其 skills/commands）
- `"filesystem"` 字符串 + `cachePath` — 官方内置，无需安装

## 状态三态判定

- **已装·使用中**：`data/<pid>/` 存在，或 `enabledPlugins[pid] === true`
- **已装·未启用**：`installed_plugins.json` 有登记，或 `cache/<市场id>/<name>/` 存在
- **未安装**：其余

renames 提示：claude 市场改过名的插件，旧安装记录仍用旧名，需按 `renames` 映射回新名。
