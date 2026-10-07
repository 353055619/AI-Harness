---
name: godw-loop-doc
description: 循环台账技能，两种调用：初建（godw-loop-init 调——信息完备后一次性落全部预设账本）与轮次收口（godw-loop-complete 调——history 追加含 score 回填/CHAT ack/AGENTS 增量维护/TRAP 同因合并）——godw-loop 体系的文档收口面。
---

# 循环台账 → .agents/ 各账本

## 初建（godw-loop-init 调用，一次性）

前提：GOAL.md 两章已定稿、/init 已跑——信息完备，无需用户输入。

1. **CHAT.md 种子**：接口说明头（用法：用户在此追加指示/答复，agent 在此追加提问/ack；只增不改）。
2. **TRAP.md**：表头（一条一行：日期+坑+处置）。
3. **history.json**：种子 `{"topics": []}`。
4. **AGENTS.md 体系**：在 /init 产物上构建——`.agents/AGENTS.md`（读写权与放置表）+ 真差异化子树按需；根 AGENTS.md 增量增强（挂 GOAL/CHAT 链接；根 <256 行、子树 <128 行）。

## 轮次收口（godw-loop-complete 调用，每轮；独占以下四件）

高内聚分工（其余不碰——GOAL.md 冻结、postmortem.md 归评审、delivery/+DELIVERY.md+status.html 归 godw-report、proposal 新建归 godw-loop-start、plan.md 与工作产物归 godw-loop-run）：

1. **history.json**：追加本轮条目（schema 见 godw-loop-start/references/loop-contract.md：id/type/from/outcome/score/summary/archived 链接；no-op 轮记 outcome=noop）。只追加，不改旧条目。
2. **CHAT.md ack**：追加 ack 条目记录消化情况（哪条已按答复执行、哪条仍待用户）——只增不改旧条目，ack 即消化游标；start 自主定稿的待确认项在此汇合。
3. **AGENTS.md 体系**：增量维护——事实变了就地更新（不追加历史）；根 <256 行、子树 <128 行；超限先搬家（挪到该在的层）再压缩，提额理由报给当轮 postmortem 记录。
4. **TRAP.md**：同因多条合并为一条（保内容不丢）；只增不删。
