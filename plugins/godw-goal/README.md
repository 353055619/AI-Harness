# godw-goal

godw 需求澄清域插件（v0.2.2，2026-10-11 自 godw-toolkit 拆出升级为独立插件；同日技能更名 clarify-goal 并去编排耦合；2026-10-17 纳入 vendored prototype 验证工具）。

## 技能（1 自研原子 + 5 vendored）

| 技能 | 职责 |
|---|---|
| clarify-goal | 定目标原子：诉求升级法四步 + 5Why+Mom Test 组合链，一次一问澄清，严格两章 GOAL.md 一次定稿（原 godw-goal 技能，只首建不修订，不预设调用方） |
| grill-me | vendored 入口：对松散计划做高强度访谈（上游为薄入口，内部转调 grilling） |
| grilling | vendored 引擎：决策树 frontier 分轮访谈，每题带推荐答案，事实自查决策问人，frontier 空即收口 |
| grill-with-docs | vendored 入口：有代码库对齐的同一访谈，边谈边沉淀 ADR 与术语表（转调 grilling + domain-modeling） |
| domain-modeling | vendored 原子：访谈中产出 ADR 与 GLOSSARY（自带两份格式文档），grill-with-docs 的依赖 |
| prototype | vendored 验证工具：一次性原型回答设计问题（LOGIC 状态机演示 HTML / UI 多方案变体 URL 切换双分支），澄清收口后的"先验证再定稿"环节 |

## 引擎分工（clarify-goal 编排，互不篡改）

- **升级法链**（clarify-goal 自带）：挖真实需求——功能→目标→顾虑→动机，一次一问，95% 信心收口
- **grilling**（vendored 整装）：把松散计划压成可承诺方案——frontier 分轮批量提问，按其自带规则原样执行
- **grill-with-docs**（vendored 整装）：同上但有代码库对齐，决策沉淀为 ADR/术语表
- **prototype**（vendored 整装）：收口后要验证设计问题时的一次性原型，按其自带规则原样执行

## grill 系列文档的落点

- **术语表**：`.agents/GLOSSARY.md`（多上下文大仓为 `.agents/GLOSSARY-MAP.md`；各上下文自己的 GLOSSARY 留在原位）——编排层（clarify-goal 调用时）指定，**偏离上游默认的项目根**，引擎本体未改
- **决策记录**：`docs/adr/0001-<slug>.md` 顺序编号，懒创建——上游默认位置，不改道
- godw-loop 目录全景已登记上述位置（循环项目认得它们）

上游更新方式：tools-update 不进自研插件内部，grill-me/grilling 的更新 = 按 `.origin.json` 整装重拉（不拆不改）。

依赖：无外部依赖。循环引擎在 godw-loop，session 契约与交付呈现仍在 godw-toolkit。
