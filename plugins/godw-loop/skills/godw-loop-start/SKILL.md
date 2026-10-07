---
name: godw-loop-start
description: 循环第一段（默认无人值守）：门禁（结构+GOAL 两章）→ 消化 CHAT.md 增量 → 深分析（history/archived/TRAP/reference）→ 调 godw-finder 调研 → 自主定稿提案 → 查重后写 proposed 提案。循环契约与 cron 兜底见 references/。
---

# 循环·第一段：提案 → .agents/notes/proposed/

1. **门禁**：项目结构合 godw-loop-init 预设（不合 → 停，先走 godw-loop-init）；GOAL.md 两章完整（缺或仍是桩 → 停，走 godw-goal 首建补全）。
2. **消化 CHAT.md 增量**：用户指示最优先执行、答复逐条消化（问答不阻塞，按默认先执行）；ack 由 godw-loop-doc 收口时统一追加。**无在场模式**：本技能一经启动即无人值守，不发起会话内提问——一切待确认点追加 CHAT.md 条目（From: Agent），下一轮消化。
3. **分析面（必读）**：GOAL.md · CHAT.md · history.json（决策摘要账）· archived/ 明细（历史决策怎么定的）· TRAP.md（坑账）· reference/（AGENTS.md 索引；survey 超 1 个月标注"建议重搜"）。
4. **自主定稿提案**：From: Agent，骨架一次成稿（Background/Problem/Proposal/Alternatives/Acceptance criteria/Risks，规则见 references/loop-contract.md）；有升级点（比字面诉求更充分的方案）或关键不确定点 → 追加 CHAT.md 提问条目，按字面诉求先执行。
5. **调 godw-finder**（编排技能）汲取外部信息；读 survey 与镜像，用证据校准提案（调研 ≠ 实现授权）。
6. **查重/复提**（规则见 references/loop-contract.md）：撞在途件 → 修订旧件；撞 rejected → 新提案 Background 必须显式推翻原否决理由，否则不建；撞 done → 增量扩展并互链。
7. **写提案**：`proposed/<YYYYMMDD-主题>/proposal.md`（骨架与头部见 loop-contract.md；正文中文；可一次多份；用户经 CHAT.md 口述的提案由本技能代为落盘，From: Human）。
8. 完成后交 **godw-loop-run**。
