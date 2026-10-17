---
name: make-html
description: html 制作统一入口（原子编排）：lo-fi 线（线框/可交互原型请求 → workbench-conventions 定分区 → vendored html-wireframe/html-prototype，godw-design 原型段由此委派）与成品线（设计规范按页面类型选：landing/营销页走 design-taste-frontend 发牌工程线，dashboard/app 走 frontend-design + ui-ux-pro-max 查库 → 实现选型路由 web-animation/antv/archify → 单文件构建）双线并行，共用 impeccable detect 样式门与 humanizer-zh 文字门收口。当用户要做网页/页面/看板/信息页/原型/线框，或任何调用方委派 html 制作时使用。
---

# html 制作 → 单文件交付

## 流程

0. **lo-fi 分流**（线框/原型请求走此线，含 godw-design 原型段委派，跳过第 1-2 步）：
   - 工作台/电子流/审批类系统**必经**：加载同插件 **workbench-conventions**，先产出「分区方案 + 页面×角色可见性矩阵」再动工；
   - 结构未定 → vendored **html-wireframe**（低保真纪律，2-3 个结构方向供选择，不追求像成品）；
   - 定稿 → vendored **html-prototype** 出可交互交付：**不是静态页**——JSON/localStorage 模拟数据库、页面跳转全通、状态真实流转、角色切换可见性随之变化；
   - 设计方向由 effective-html 自带 **design-artifact** 组合裁定，**不叠加 frontend-design**（两套设计规范冲突，整装体系自洽优先）；
   - 产出仍走第 3 步构建纪律与第 4 步质检门。

1. **设计先行（必经，成品线，按页面类型选规范，两套不混用）**：
   - landing/营销/作品集等公开页 → vendored **design-taste-frontend**：跑其 `draw.mjs` 发牌三组研究方向（选型后带出字型/配色/版式组合），按其 house style 构建，产出后按其 `inspect.mjs` 真浏览器检查 + 三宽度截图评审循环；
   - dashboard/app/工具类界面 → vendored **frontend-design**：按其两步工作法产出 token 计划（4-6 个命名色值/字体角色/ASCII 线框/设计原则），并查 vendored **ui-ux-pro-max** 知识库定风格/配色/字体配对与对应技术栈实现（`--domain`/`--stack` 查询；运行其 scripts/search.py 按实际安装路径 `skills/ui-ux-pro-max/scripts/` 调用，不用其文档里的 `.claude` 前缀路径——上游为 Claude 插件布局，本插件为 ZCode 布局），对照 brief 自查「这是为此项目做的选择，还是任何项目都会生成的默认」——通过后才动工。
2. **实现选型路由（成品线）**：
   - 网页动效/交互 → **web-animation 系**（iart-ai 插件：gsap-web / page-transition-animation / glassmorphism / micro-interaction / svg-animation / lottie-animation 等，按其 SKILL.md 选型）
   - 数据图表 → **antv 系**（chart-visualization-skills 插件：antv-g2-chart / chart-visualization 等，G2 内联进单文件）
   - 图示/架构图 → **archify**（同插件 vendored）
   - 纯静态排版 → 按 frontend-design 规范直写，不引动效库
   - 类型可叠加（图表页也可有动效），总量受 frontend-design「大胆只花一处」纪律约束
3. **构建**：单文件 html（内联 CSS/JS，离线可开）；响应式、键盘焦点、reduced-motion、可访问性按 frontend-design 质量地板执行（lo-fi 线按 html-prototype 自带的响应式与可访问性纪律执行）。
4. **质检门（必经，双门各自留证据，不跳步）**：
   - 样式门：impeccable detect（--json 证据落盘，退出码 0 过门）；
   - 文字门：页内全部文字（含标题/按钮/空态提示）过 vendored humanizer-zh（godw-toolkit，31 条中文模式）——impeccable 管样式反模式，humanizer-zh 管文字反模式，互补不重叠；
   - 任一门不过回对应步骤修，不带病交付。

## 边界

- 只管「怎么把 html 做好」；交付什么内容、给谁看、结论如何前置，由调用方（godw-report / godw-design 或用户直呼）决定。
- lo-fi 线的验收（角色走查评分）归调用方 godw-design 的 design-gate，本技能不重复设门。
- 依赖按名调用的上游插件：web-animation-skills、chart-visualization-skills、impeccable（须已安装启用）。
- vendored 件（frontend-design / design-taste-frontend / ui-ux-pro-max / archify / effective-html 选件）整装不拆改，更新=按 .origin.json 整装重拉。
