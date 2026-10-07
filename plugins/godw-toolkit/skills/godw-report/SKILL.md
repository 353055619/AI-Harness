---
name: godw-report
description: 汇报呈现总入口：格式选型（markdown/html/archify/video）→ 调度对应原子技能产出 → 证据复核 + G2 精简收尾。循环模式被 godw-loop-complete 并行调用，每轮滚动生成 delivery/ + .agents/DELIVERY.md + .agents/status.html；手动调用做完整呈现。吸收原 godw-package 的验证完成门。
---

# 汇报呈现

思想先行：汇报是交付信心产品（方法论见 godw-goal/references/principles.md）。两种用法：

1. **循环滚动**（子 agent，被 godw-loop-complete 每轮并行调用）：按 GOAL 第二章交付格式重生成 delivery/（项目根），覆盖旧版；同步更新 .agents/DELIVERY.md；**每轮必更 .agents/status.html**——循环现状一页看板（proposed 队列 Human/Agent 计数、changes 在途与卡点、最近 5 个 done 题分数趋势、TRAP 条数），全离线单文件，同样过 impeccable detect 门留 JSON 证据。轻量验证（能打开 / 能读 / 链接活），重验留给用户点名。
2. **完整呈现**（手动 `/godw-report [markdown|html|archify|video]`，空格分隔可多选；未给参数按判定表推荐并与用户确认一次）：
   - 判定表、思想关（结论前置 / 1 分钟读完 / 他的口径 / 附件化，缺一不过）见 references/selection.md。
   - 调度（全部走原子技能，无 godw* 格式执行者）：markdown → agent 直写；html → 网页类用 web-animation 系（gsap-web / page-transition-animation / glassmorphism / micro-interaction / svg-animation / lottie-animation 等，按其 SKILL.md 选型），图示走 archify，图表走上游 antvis 插件（antv-g2-chart / chart-visualization 子技能，G2 内联进单文件）；archify → archify（上游技能直连，选型其 SKILL.md 自带）；video → 视频制作系按品类选型（explainer-video / chart-animation / wrapped-video 等），Remotion 工程走 remotion-best-practices 官方系，成片形态用 caption-animation / kinetic-typography / lower-thirds / short-form-video 等按需叠加。iart-ai 系与 antvis 以上游插件形态提供（`~/.agents/plugins/` 同级插件仓，装好后按技能名调用）；remotion 官方系、ECC 摘取与 archify 随包。多选先 markdown 定思想载体，再同源换皮，产物落同一项目。
   - 验证关：每格式按其技能验证节执行、证据落盘；独立复核只看证据不看结论，逐项对上才标过。web/html 交付另强制过 impeccable detect 门（判据与命令见 references/selection.md 验证关；status.html 同管）。
   - G2 精简 + slop 清单（见 references/selection.md）：先保义删到不能再删，再删 10%。
3. 产出 delivery/ 成品（项目根）+ .agents/DELIVERY.md（结论前置 / 打开方式 / 假设；验证两栏：已验证附证据路径、未覆盖如实列出）。
