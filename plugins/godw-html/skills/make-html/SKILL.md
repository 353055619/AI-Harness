---
name: make-html
description: html 制作统一入口（原子编排）：lo-fi 线（线框/可交互原型请求 → workbench-conventions 定分区 → vendored html-wireframe/html-prototype，godw-design 原型段由此委派）与成品线（设计规范按页面类型选：landing/营销页走 design-taste-frontend 发牌工程线，dashboard/app 走 frontend-design + ui-ux-pro-max 查库 → 实现选型路由 web-animation/antv/archify → 单文件构建）双线并行，构建期执行结构与文字纪律（主线 1.5 屏、细节折叠/弹窗/分区切换收纳、界面元素不写自我解释的副文案），共用 impeccable detect 样式门与 humanizer-zh 文字门收口。当用户要做网页/页面/看板/信息页/原型/线框，或任何调用方委派 html 制作时使用。
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
3. **构建**：单文件 html（内联 CSS/JS，离线可开）；动工前先过下方「结构与文字纪律」定页面骨架；响应式、键盘焦点、reduced-motion、可访问性按 frontend-design 质量地板执行（lo-fi 线按 html-prototype 自带的响应式与可访问性纪律执行）。
4. **质检门（必经，三门串行各自留证据，不跳步）**：
   - 样式门：impeccable detect（--json 证据落盘，退出码 0 过门）；
   - **渲染门**：`node <插件根>/scripts/render_gate.mjs <产出.html> --smoke`（本插件自带，纯 node+CDP 连本机 Chrome，设 GODW_CHROME 可指定浏览器）——收集运行时错误/资源加载失败，375/768/1280 三宽度截图与横向溢出检测，交互冒烟点遍导航按钮；**退出码 0 过门，2 不过**；证据落盘 `<产出目录>/render-gate-evidence/`（render-gate.json + 三张截图）；**必须亲眼看三张截图对照所选设计规范评审**，发现视觉问题回第 2 步修；
   - 文字门：页内全部文字（含标题/按钮/空态提示）过 vendored humanizer-zh（godw-toolkit，31 条中文模式），并复查副文案禁令（见结构与文字纪律）—— impeccable 管样式反模式，渲染门管"真的能看"，humanizer-zh 管文字反模式，三者互补不重叠；
   - 任一门不过回对应步骤修，不带病交付。两线共用本步（lo-fi 线的角色走查评分仍归调用方 design-gate）。

## 结构与文字纪律（第 3 步执行，第 4 步复查，两线通用）

html 相对 markdown 的价值在交互、图表与分层收纳。产出和 markdown 差不多的长滚动页，或界面上到处是自我解释的小字，就是没发挥这个价值——这两条纪律因此存在。

**1. 页面结构：主线一屏半，细节全收纳**

- 主线内容（用户最该看到的东西）1.5 屏内放完。预估滚动超过 3 屏的正文先别写：要么内容本身是书面批阅材料，退回调用方改选 markdown；要么用 html 的收纳手段重组——tab/hash 分区切换（单文件内的"页面路由"）、details/summary 折叠卡、弹窗、hover 提示。
- 报告/汇报型页面（godw-report html 路线）：主线 = 结论 + 2-3 张核心图表，一屏半讲完；过程、明细、逐条证据全部折叠收纳；至少一张真图表（SVG/antv），纯文字排版等于没发挥 html。

**2. 文字纪律：不写自我解释的副文案，让版面自己说话**

- 界面元素的含义由位置、样式与上下文表达，不用文字复述功能。反例：按钮写着「重试」，旁边再起一行小字「点击按钮即可重试」——这是 AI 味最重的一类文字。
- 判断法：把这句小字删掉，用户还能不能懂？能懂就删。正文段落该有的解释不受此限，禁的是对界面元素的功能复述。
- 说明文字只在「不看就会做错」时出现（危险操作、格式要求），且优先用 placeholder / title / hover 承载，不起正文行。

## 边界

- 只管「怎么把 html 做好」；交付什么内容、给谁看、结论如何前置，由调用方（godw-report / godw-design 或用户直呼）决定。
- lo-fi 线的验收（角色走查评分）归调用方 godw-design 的 design-gate，本技能不重复设门。
- 依赖按名调用的上游插件：web-animation-skills、chart-visualization-skills、impeccable（须已安装启用）。
- vendored 件（frontend-design / design-taste-frontend / ui-ux-pro-max / archify / effective-html 选件）整装不拆改，更新=按 .origin.json 整装重拉。
