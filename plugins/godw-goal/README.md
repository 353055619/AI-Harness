# godw-goal

godw 需求澄清域插件（v0.1.0，2026-10-11 自 godw-toolkit 拆出升级为独立插件）。

## 技能（1 自研编排 + 2 vendored）

| 技能 | 职责 |
|---|---|
| godw-goal | 定目标：诉求升级法四步 + 5Why+Mom Test 组合链，一次一问澄清，严格两章 GOAL.md 一次定稿（自 godw-toolkit 平移，能力不变） |
| grill-me | vendored 入口：对松散计划做高强度访谈（上游为薄入口，内部转调 grilling） |
| grilling | vendored 引擎：决策树 frontier 分轮访谈，每题带推荐答案，事实自查决策问人，frontier 空即收口 |

## 两引擎分工（godw-goal 编排，互不篡改）

- **升级法链**（godw-goal 自带）：挖真实需求——功能→目标→顾虑→动机，一次一问，95% 信心收口
- **grilling**（vendored 整装）：把松散计划压成可承诺方案——frontier 分轮批量提问，按其自带规则原样执行

上游更新方式：tools-update 不进自研插件内部，grill-me/grilling 的更新 = 按 `.origin.json` 整装重拉（不拆不改）。

依赖：无外部依赖。循环引擎在 godw-loop，session 契约与交付呈现仍在 godw-toolkit。
