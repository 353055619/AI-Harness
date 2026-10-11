# godw-toolkit

godw 原子技能包（v0.4.0，2026-10-07 v3 改版：循环拆往 godw-loop、搜索拆往 godw-finder；2026-10-11 godw-goal 拆出为独立插件）。

## 技能（2 + vendored 14）

| 技能 | 职责 |
|---|---|
| godw-session-init | session 工作契约（11 条，原 godw-init 更名） |
| godw-report | 交付呈现：delivery/ + .agents/DELIVERY.md + .agents/status.html（每轮看板）；web/html 强制 impeccable detect 门 |

vendored 14 件（带 .origin.json，只读）：archify · motion-foundations · remotion-{best-practices, captions, create, docs, interactivity, maps, markup, multimedia, render, saas, studio, upgrade}。

## 搭配

- **godw-loop**（循环引擎：loop-init/start/run/complete/postmortem/doc + guard hooks + 自循环 workflow）
- **godw-finder**（搜索调研：编排 + plugin/find-skills/web/social 四原子）
- **godw-goal**（需求澄清：clarify-goal 定目标 + vendored 访谈引擎四件 grill-me/grilling/grill-with-docs/domain-modeling，2026-10-11 拆出）

四插件成对安装；安装从 godw-plugin-optimization 仓 workspace/agent/ 开发区经 install-plugin-file.sh 装至 ~/.agents/plugins/ + ZCode cache，UI 刷新生效。

## 版本

- 0.4.0（2026-10-11）：godw-goal 连同新增 vendored grill-me/grilling（mattpocock/skills）拆出为独立 godw-goal 插件；本包聚焦 session 契约与交付呈现。
- 0.3.0（2026-10-07）：v3 大改版——godw-init→godw-session-init；godw-goal 定稿制+5Why 引擎；godw-report 增 status.html；godw-start/pursue/review/research 拆出（进 godw-loop 与 godw-finder）；hooks 随 guard 移入 godw-loop。
- 0.2.5 及以前见 git 历史（godw 四段流水线口径）。
