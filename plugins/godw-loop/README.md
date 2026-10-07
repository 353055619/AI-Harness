# godw-loop

godw 永续循环引擎插件。godw-loop-init 一次调用编排开局（godw-goal 澄清定稿 → /init → godw-loop-doc 初建账本 → 门禁+workflow 注册），三段主循环 start（提案）→ run（派发执行）→ complete（评审收口）默认无人值守——用户接口收敛为 CHAT.md（只增）+直投 proposal；notes 一题一文件夹（3P 文件组），TRAP 坑账 + history 决策摘要账，自循环 workflow 承载（workflows/godw-loop-round.ts，init 收尾 SaveWorkflow 注册进项目），guard 写保护 hooks。

- 技能：godw-loop-init（--create/--update 开局编排）/ godw-loop-start / godw-loop-run / godw-loop-complete / godw-loop-postmortem / godw-loop-doc
- 搭配：godw-toolkit（session-init/goal/report）、godw-finder（搜索调研）成对使用
- hooks：依赖 python3；human 区锁/GOAL 存在即冻结（首建放行）/CHAT 只增/notes 机械门/AGENTS.md 预算/history 校验
- 循环契约：skills/godw-loop-start/references/loop-contract.md
- 版本：0.2.0（2026-10-07 planv2：初始化段重排+CHAT.md 接口收敛+start 无在场模式+guard v5；首版 0.1.0 自 godw-toolkit v3 改版拆出）
