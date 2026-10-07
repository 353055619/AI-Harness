# cron 兜底通道 prompt 模板（v3）

自循环 workflow（godw-loop-round）为主通道；仅 workflow 不可用时用本模板注册 CronCreate 兜底。

## 注册参数

- title：`<项目名>循环兜底·每4小时`
- recurring: true，无 maxRuns；intervalUnit=hourly、interval=4、cron=`0 */4 * * *`
- prompt 不写绝对路径；注册后 automation id 写入 `.agents/automation-id.txt`（human 区写锁随之生效）
- 注册时向用户说明：机器睡眠静默缺轮不补跑；要全天班需 OS 级防睡（用户自理）

## prompt 正文（替换 <项目名> 后原样使用）

你在 <项目名> 的 godw-loop 循环中。执行步骤：

1. 读 .agents/ 下 GOAL.md、history.json、TRAP.md、CHAT.md 与 notes/ 树；完整契约在 godw-loop 插件 godw-loop-start/references/loop-contract.md，冲突以契约为准。
2. 尝试运行保存的自循环 workflow godw-loop-round（CreateWorkflow saved；godw-loop-init 收尾已注册进项目）；可用则由其承载本轮，你只监督与汇报。
3. workflow 不可用时按技能链手动跑一轮：godw-loop-start（提案）→ godw-loop-run（派发执行）→ godw-loop-complete（收口）。
4. 铁律：不写 workspace/human/；不改 GOAL.md；CHAT.md 只增；notes/ 禁止 Bash 写入；删除先进 .trash；派发子智能体 prompt 原样带禁令；宣称完成必须有当场验证。
