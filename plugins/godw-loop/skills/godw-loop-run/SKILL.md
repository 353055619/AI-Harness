---
name: godw-loop-run
description: 循环第二段：清 changes/ 遗留（BLOCKED 两轮升级线）→ FIFO 派发（Human 提案优先）→ implement 移入 changes/ 或 reject 归档 → 生成 plan.md（plan mode 文档结构）→ 按计划执行，产物落 changes/<主题>/。
---

# 循环·第二段：派发与执行 → .agents/notes/changes/

1. **清遗留**：changes/ 有在途题（读 BLOCKED 判断卡点）先续跑；BLOCKED 连续 2 轮无进展 → 强制 reject（reject.md 写明卡点，卡点另记 TRAP.md 一条一行），移入 archived/，取下一份。
2. **FIFO 派发**：proposed/ 中 `From: Human` 的最早一份优先，否则最早一份（From: Agent）。对每份决策：
   - **implement** → 整文件夹移入 changes/，进入第 3 步；
   - **reject** → 写 reject.md（主干=一句否决理由；Human 提案须充分说理并追加 CHAT.md 条目提请用户知悉）→ 移入 archived/ → 按派发顺序取下一份。
3. **生成 plan.md**：`changes/<主题>/plan.md`，仿 plan mode 计划文档结构：目标 → 目标形态 → 文件清单 → 执行顺序 → 边界；验收标准取自 proposal 的 Acceptance criteria（AC 式逐条可判定）。
4. **执行**：按 plan 逐项落实，产物直接落 changes/<主题>/；每完成一项对照 AC 自检（宣称完成必须有当场验证过的输出）；遇坑当场记 TRAP.md，不攒收尾。
5. **收尾分支**：AC 全过 → 交 **godw-loop-complete**；做不完 → 写/更新 `changes/<主题>/BLOCKED`（原因+起日+连续轮数）留 changes/，交 complete 记账；空队列/全拒 → 本轮 no-op，交 complete 记 noop。

铁律：不写 workspace/human/；不改 GOAL.md；CHAT.md 只增；删除先进 .trash；notes/ 文件内容禁经 Bash 写入（mv/rm 仅限状态转移动作）。
