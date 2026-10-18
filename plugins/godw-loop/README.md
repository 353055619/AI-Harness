# godw-loop

godw 永续循环引擎插件。godw-loop-init 一次调用编排开局（clarify-goal 澄清定稿 → /init → godw-loop-doc 初建账本 → 门禁+goal 启动指引），三段主循环 start（提案）→ run（派发执行）→ complete（评审收口）默认无人值守——自治驱动=ZCode 原生 /goal 会话目标（一次设置自动迭代，每轮迭代走三段技能链）；用户接口收敛为 CHAT.md（只增）+直投 proposal；notes 一题一文件夹（3P 文件组），TRAP 坑账 + history 决策摘要账，guard 写保护 hooks。

- 技能：godw-loop-init（--create/--update 开局编排）/ godw-loop-start / godw-loop-run / godw-loop-complete / godw-loop-postmortem / godw-loop-doc
- 搭配：godw-toolkit（session-init/goal/report）、godw-finder（搜索调研）成对使用
- hooks：依赖 python3；human 区只读/GOAL 存在即冻结（首建放行）/CHAT 只增/notes 机械门/AGENTS.md 预算/history 校验
- 测试：bash scripts/test-guard.sh（guard 规则回归，走 hook 真实 stdin 通道；guard.py 改动须随附新用例）
- 循环契约：skills/godw-loop-start/references/loop-contract.md
- 版本：0.3.0（2026-10-18 v4：自循环 workflow 与 cron 兜底退役，驱动改 ZCode 原生 /goal 会话目标，guard v6 human 区无条件只读；0.2.0=2026-10-07 planv2；首版 0.1.0 自 godw-toolkit v3 改版拆出）
