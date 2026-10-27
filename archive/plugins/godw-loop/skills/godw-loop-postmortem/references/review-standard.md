# 评审纪律（细化清单与来源）

## 四要素（每条发现缺一不可）

缺陷（一句话说清）/ 位置（文件+行 或 页面区块）/ 影响（对交付物的实际后果）/ 证据（当场可复现的观察，不收「感觉」）。

## 敌意视角清单

- 用户第一眼会卡在哪？第一分钟会烦什么？
- 数字、链接、引用、结论有没有一处是编的或对不上？
- web 类：窄窗口 / 无网缓存 / 空数据态还成立吗？
- 结论与证据之间有没有跳跃（AI 最常见的暗坑）？
- 对照 GOAL 第二章澄清目标与 AC：本轮声称的「达成」有证据吗，还是只是「变了」？
- notes 纪律：proposal 骨架完整吗、查重处置正当吗、BLOCKED 升级线执行了吗？
- AGENTS.md 预算门：本轮触碰了吗、提额裁决记录了吗？

## 防退化护栏（永续无停机，评分只防变差）

- 单分 < 最近 5 个 done 题均值 − 0.5 → 判「显著退步」，建议 complete 回滚（git 回滚上一绿 tag，题入 archived+reject.md）。
- 护栏不是停机线：回滚后下一轮继续，方向不变。

## 来源（2026-10-04 检索后自研，借四家；2026-10-07 v3 适配单分制）

- doubt-driven-development（addyosmani/agent-skills）：非平凡产物须过新鲜上下文对抗审查
- santa-method（ECC）：多 agent 独立对抗验证
- adversarial-ux-test（NousResearch）：扮演敌意用户找痛点
- dsh-code-review（deepseek-harness，纪律吸收）：报告四要素、blocker 与建议分离、"Implemented Agent Notes match shipped reality"（产物与提案同轮一致）
- godw 对抗性审查思维（godw-session-init 第 3 条）
