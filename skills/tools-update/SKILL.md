---
name: tools-update
description: Update all upstream-sourced skills and plugins under ~/.agents/ to their latest upstream versions. Use whenever the user asks to 更新技能 / 更新插件 / 更新原子技能 / tools-update / update skills or plugins, mentions remotion / iart-ai / antvis / archify / ECC skills may be outdated, or right after a fresh godw bundle is placed under ~/.agents/. Covers inventory scan, per-origin update (git pull / re-clone overwrite / vendored skill refresh), backup, and ZCode cache refresh reminder.
---

# tools-update：更新 ~/.agents/ 下的上游技能与插件

原则：**上游为准、先看后动、可回滚、自研不动**。所有机械操作交给脚本，不要手工逐个 clone。

## 用法

```sh
# 1. 先看（默认 dry-run，不联网不改盘，只列清单和计划）
python3 ~/.agents/skills/tools-update/scripts/tools_update.py

# 2. 确认计划后执行
python3 ~/.agents/skills/tools-update/scripts/tools_update.py --apply

# 只更新指定项（支持逗号分隔与 * 通配）
python3 ~/.agents/skills/tools-update/scripts/tools_update.py --apply --only 'kinetic-typography,remotion-*'

# 扫描其他根目录（如尚未搬入 ~/.agents/ 的 bundle）
python3 ~/.agents/skills/tools-update/scripts/tools_update.py --root /path/to/bundle

# 给无 .git 也无 repository 字段的插件仓登记上游地址（一次性）
python3 ~/.agents/skills/tools-update/scripts/tools_update.py --set-upstream ~/.agents/plugins/chart-visualization-skills https://github.com/antvis/chart-visualization-skills
```

## 分类与动作（脚本自动判定）

| 判定 | 动作 |
|---|---|
| 目录含 `.claude-plugin/`（上游插件仓） | 有 `.git` → `git pull --ff-only`；无 `.git` → 上游地址（plugin.json 的 repository 字段，或登记表）浅克隆到临时区后 `rsync --delete` 整仓覆盖（排除 .git） |
| 目录含 `SKILL.md` 且 `.origin.json` 有 url（vendored 技能） | 解析 url（支持 github `/tree/<ref>/<路径>` 子目录式与仓库式）→ 浅克隆 → 覆盖技能目录（**排除 .origin.json**，凭证永不被上游覆盖）→ 更新 installed 日期 |
| 目录含 `.zcode-plugin/`（自研插件：godw-toolkit / godw-loop / godw-finder） | **跳过，仅报告**——本地是权威源，上游 GitHub 是它的下游，绝不能反向拉覆盖 |
| `SKILL.md` 但无凭证（如 algo-coach） | 跳过，报告「无凭证」，不得猜测上游 |

更新执行后自动做**市场版本同步**：读每个插件自报版本（`.claude-plugin/` 或 `.zcode-plugin/` 的 plugin.json），写回 `~/.agents/plugins/marketplace.json` 对应条目的 version（写前备份）。否则克隆覆盖后清单版本滞后，市场页继续显示旧版。dry-run 时列出「市场版本滞后」预览。

## 安全规则

1. 默认 dry-run；`--apply` 才动盘。改盘前把现状备份到 `~/.agents/.tools-update/backup/<时间戳>/`，出问题整目录拷回即可。
2. 上游仓库里的东西原样覆盖；我们只允许存在三样添加物：技能目录的 `.origin.json` 凭证、登记表 `~/.agents/.tools-update/registry.json`、marketplace.json 的版本同步写入。
3. 单项失败不影响其余项（逐项隔离，失败进报告，退出码非 0）。
4. 每次运行写 `~/.agents/.tools-update/last-run.json`（逐项结果 + 市场同步 + 时间戳）。

## 更新后的生效动作（ZCode 侧，必讲勿省；源更新≠生效）

源 `~/.agents/` 更新后 ZCode 不会自动跟随，按类别执行并核对：

- **市场快照**：directory 源会自动刷新（无需重新注册市场），但运行缓存 `~/.zcode/cli/plugins/cache/` 不跟随。
- **已装插件更新**：`zcode plugins update <name>@<marketplace>` 重物化缓存（或 UI 点 Update）。
- **新装插件**：install 后**必做** `zcode plugins enable <name>@<marketplace>`——装≠启用。启用态是 `~/.zcode/cli/config.json` 里 `plugins.enabledPlugins` 映射，不在其中的插件默认 disabled（技能不加载、CLI 显示 [disabled]），漏这步就是「市场没更新」假象的根因。
- **技能（~/.agents/skills）**：新开会话即生效，无任何登记步骤。
- **退役插件**：源目录移除 + marketplace.json 撤条目后，还要 `zcode plugins uninstall <name>@<marketplace>`，否则 enabledPlugins / cache / data/ 三处残留。

报告末尾列出本次更新的名字清单 + 上述对应动作，方便用户核对。

## 报告格式

逐项一行：`名称 | 类别 | 上游 | 方式 | 计划/结果`，版本滞后单独成块，末尾汇总：可更新 N / 已更新 N / 失败 N / 跳过 N（自研 x、无凭证 y）+ 生效动作。dry-run 与 apply 同格式，前者「计划」后者「结果」。
