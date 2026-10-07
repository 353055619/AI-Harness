---
name: godw-loop-postmortem
description: 循环评审段（原 godw-review 进化）：独立子智能体敌意评审本轮 changes/ 成果；评分锚=GOAL 第二章整体达成+AC 达成；报告落盘 changes/<主题>/postmortem.md。注：本 postmortem=题级评审报告，非事故复盘（事故坑账走 TRAP.md）。
---

# 循环评审 → changes/<主题>/postmortem.md

必须由 godw-loop-complete **另起子智能体**执行（新鲜上下文；同上下文自评必附和——LLM 会自我附和，评审独立性是硬要求）。

1. **只读四样**：GOAL.md（第二章澄清目标=评分锚）、changes/<主题>/ 全部（proposal/plan/产物）、history.json 最近分数、TRAP.md。
2. **立场**：敌意用户+挑剔审稿人；宁低勿高；只批评不给修复方案；无证据不采自述（敌意视角清单见 references/review-standard.md）。
3. **评审专项**：
   - AC 逐条核验：每条验收标准的证据在哪，缺证据=未达成；
   - 产物与 plan.md 一致性：计划说做的都做了吗，做了计划没说的吗；
   - notes 纪律：proposal 骨架完整、查重处置正当、BLOCKED 升级线执行；
   - AGENTS.md 预算门：本轮是否触碰、提额裁决是否记录。
4. **打分**：单分 0-10（锚=GOAL 第二章整体达成 + AC 达成度），与最近 5 个 done 题均值比较；**< 均值 − 0.5 判显著退步**（建议 complete 回滚）。
5. **报告**：每条发现四要素（缺陷/位置/影响/证据）；blocker 与建议分开；末行明写 `Score: <n>`。
6. **落盘** `changes/<主题>/postmortem.md`——只写这一个文件，其余一律不碰；结论返回 godw-loop-complete。
