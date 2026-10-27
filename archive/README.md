# archive — 退役插件归档

本目录存放退役但保留待拾起的插件原样快照。git 跟踪、随仓库提交；不参与 sync.sh 安装（rsync 只同步根下 `skills/` 与 `plugins/`），不会装进 `~/.agents`。

## 当前归档

| 插件 | 归档日期 | 归档时版本 | 原因 |
|---|---|---|---|
| godw-loop | 2026-10-27 | 0.3.0 | 永续循环改由 ZCode 原生 /goal 会话目标驱动后闲置，用户裁决退役；循环编排能力原样保留待拾起 |

## 恢复步骤（以 godw-loop 为例）

1. `git mv archive/plugins/godw-loop plugins/godw-loop`
2. `plugins/marketplace.json` 加回条目（name / source / version / description 从 git 历史退役前提交里抄）
3. 版本号 bump 一位 → `./sync.sh` → `zcode plugins install godw-loop@godw-plugins-marketplace && zcode plugins enable godw-loop@godw-plugins-marketplace`
4. 兄弟插件里的「已归档」注记改回正常指向（全仓 grep godw-loop 可见全部位置：godw-report 循环模式、godw-finder 调度方、godw-toolkit/godw-goal 描述、tools-update 白名单）
