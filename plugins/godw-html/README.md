# godw-html

godw html 制作域插件（v0.2.0，2026-10-11 设立：html 制作能力自 godw-toolkit/godw-report 的格式调度中独立成域；2026-10-15 增设 lo-fi 线支撑 godw-design 原型段）。

## 技能（2 自研 + 6 vendored）

| 技能 | 职责 |
|---|---|
| make-html | html 制作统一入口，双线：**成品线**（设计规范按页面类型选 → 实现选型路由 → 单文件构建 → 质检门）；**lo-fi 线**（workbench-conventions 定分区 → html-wireframe 探结构 → html-prototype 可交互交付） |
| workbench-conventions | 自研工作台惯例：审批四区（宜搭/飞书出处）、split-view（Fiori/Camunda 出处）、页面×角色可见性矩阵——工作台类页面出稿前必经 |
| frontend-design | vendored 设计规范（anthropics 官方）：token 计划两步法、AI 味五大雷区自校准、质量地板（成品线 dashboard/app 用） |
| design-taste-frontend | vendored 落地页工程线（leonxlnx taste-skill v2）：247 站方向发牌 + 真浏览器 inspect + 截图评审循环（成品线 landing/营销页用） |
| ui-ux-pro-max | vendored 可检索设计知识库（nextlevelbuilder）：79 风格/192 配色/74 字体配对/119 UX 规则/22 栈实现（成品线查库用） |
| archify | vendored 图示制作（github.com/tt-a1i/archify v3.0.1，自 godw-toolkit 平移） |
| html | vendored lo-fi 系路由器（plannotator/effective-html）：wireframe/prototype/plan/diagram 分诊（plan/diagram 两 specialist 未纳入，router 自带缺席降级） |
| html-wireframe | vendored 低保真线框 specialist（effective-html）：结构/层级/导航探索，2-3 方向对比 |
| html-prototype | vendored 可交互原型 specialist（effective-html）：mockup/prototype 双模式、状态模型、交互完整性——godw-design 原型段核心依赖 |
| design-artifact | vendored 创意方向基底（effective-html）：被各 specialist 组合引用的传递依赖 |

## lo-fi 线与 godw-design 的分工

本插件管「低保真/原型 html 怎么做好」（惯例分区 + effective-html 方法论）；godw-design 管「设计流水线怎么走、验收门怎么守」（衔接块消费、角色走查评分）。godw-design 原型段按名调用本插件 make-html 的 lo-fi 分流。

## 按名调用的兄弟插件（不吞并，保持上游插件形态）

- **web-animation-skills**（iart-ai）：网页动效九件套，产出独立 HTML
- **chart-visualization-skills**（antvis）：G2/G6/X6/信息图等图表系（上游仓为 marketplace 内联定义，本仓为其加了 `.zcode-plugin/plugin.json` 包装清单；上游更新=重克隆+重加包装）
- **impeccable**：html 质检门（58 条反模式 detect CLI），双线共用

## 与 godw-report 的分工

godw-report 管「交付什么」（格式选型/思想关/G2 精简/DELIVERY.md），其 html 格式调度到本插件 make-html（成品线）；本插件管「怎么把 html 做好」。

上游更新方式：vendored 件按各自 `.origin.json` 整装重拉（不拆不改）；effective-html 许可证见根目录 `EFFECTIVE-HTML-LICENSE.txt`。
