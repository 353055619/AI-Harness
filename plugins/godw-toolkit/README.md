# godw-toolkit

godw 原子技能包（v0.5.0，2026-10-07 v3 改版：循环拆往 godw-loop、搜索拆往 godw-finder；2026-10-11 godw-goal 拆出、html 制作连 archify 拆往 godw-html）。

## 技能（2 + vendored 14）

| 技能 | 职责 |
|---|---|
| godw-session-init | session 工作契约（11 条，原 godw-init 更名） |
| godw-report | 交付呈现：delivery/ + .agents/DELIVERY.md + .agents/status.html（每轮看板）；web/html 强制 impeccable detect 门 |

vendored 14 件（带 .origin.json，只读）：humanizer-zh（中文去 AI 味编辑规范，godw-report 文字交付操作化）· motion-foundations · remotion-{best-practices, captions, create, docs, interactivity, maps, markup, multimedia, render, saas, studio, upgrade}（archify 已迁 godw-html）。

## 搭配

- **godw-loop**（循环引擎：loop-init/start/run/complete/postmortem/doc + guard hooks + 自循环 workflow）
- **godw-finder**（搜索调研：编排 + plugin/find-skills/web/social 四原子）
- **godw-goal**（需求澄清：clarify-goal 定目标 + vendored 访谈引擎四件 grill-me/grilling/grill-with-docs/domain-modeling，2026-10-11 拆出）
- **godw-html**（html 制作：make-html 统一入口 + vendored frontend-design/archify，2026-10-11 设立）

五插件成对安装；安装从 godw-plugin-optimization 仓 workspace/agent/ 开发区经 install-plugin-file.sh 装至 ~/.agents/plugins/ + ZCode cache，UI 刷新生效。

## 版本

- 0.5.2（2026-10-11）：godw-report 全部输出文字（含 html 页面文字、status.html、视频文案）统一过 humanizer-zh——汇报就说人话；impeccable 只管样式不管文字。
- 0.5.1（2026-10-11）：vendored humanizer-zh（op7418，MIT，31 条中文模式）；godw-report 文字交付（markdown/DELIVERY.md）过 humanizer-zh，与 html 的 impeccable 门对称。
- 0.5.0（2026-10-11）：html 制作独立成域——godw-report 的 html 格式改调 godw-html 插件 make-html；archify 迁往 godw-html；vendored 14→13。
- 0.4.0（2026-10-11）：godw-goal 连同新增 vendored grill-me/grilling（mattpocock/skills）拆出为独立 godw-goal 插件；本包聚焦 session 契约与交付呈现。
- 0.3.0（2026-10-07）：v3 大改版——godw-init→godw-session-init；godw-goal 定稿制+5Why 引擎；godw-report 增 status.html；godw-start/pursue/review/research 拆出（进 godw-loop 与 godw-finder）；hooks 随 guard 移入 godw-loop。
- 0.2.5 及以前见 git 历史（godw 四段流水线口径）。
