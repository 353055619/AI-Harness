---
name: godw-loop-complete
description: 循环第三段：并行三子智能体（godw-loop-postmortem 评审 / godw-report 交付+status.html / godw-loop-doc 台账）→ 显著退步走回滚（reject.md 记教训入 archived）→ 归档打 tag → 续轮。
---

# 循环·第三段：收口 → .agents/notes/archived/

1. **并行三个子智能体**（新鲜上下文；派发 prompt 原样带禁令；写者互斥，见契约）：
   - **godw-loop-postmortem**：敌意评审+评分，落盘 `changes/<主题>/postmortem.md`（只写这一个文件）；
   - **godw-report**：滚动重生成 delivery/ + .agents/DELIVERY.md + **.agents/status.html**（status.html 每轮必更）；
   - **godw-loop-doc**：history.json 追加（含 score 回填）、AGENTS.md 增量维护、CHAT.md ack（消化记录）、TRAP.md 同因合并。
2. **显著退步处置**（单分 < 最近 5 个 done 题均值 − 0.5，或有未消 blocker）：git 回滚上一绿 tag；`changes/<主题>/` 写 reject.md（失败原因+教训——宝贵失败经验）；整文件夹移入 archived/；必要时更新 history/TRAP.md。**不回 proposed**。
3. **正常收口**：changes/<主题> 整文件夹移入 archived/（无 reject.md 即 done）；git commit + 绿态 tag（round-<序号>，按 history 题数递增）。
4. **续轮**：回 godw-loop-start（自循环 workflow 场景由脚本迭代；cron 兜底场景由 automation 下一跳触发）。
5. **本轮 no-op**（run 空转）：history 记 noop 条目，直接续轮。
