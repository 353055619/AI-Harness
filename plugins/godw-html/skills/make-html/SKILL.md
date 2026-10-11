---
name: make-html
description: html 制作统一入口（原子编排）：frontend-design 设计规范 token 计划 → 实现选型路由（网页动效 web-animation 系 / 数据图表 antv 系 / 图示 archify）→ 单文件构建 → impeccable detect 质检门收口。当用户要做网页/页面/看板/信息页，或调用方（如 godw-report 的 html 格式）委派 html 制作时使用。
---

# html 制作 → 单文件交付

## 流程四步

1. **设计先行（必经）**：加载同插件 vendored **frontend-design** 技能，按其两步工作法产出 token 计划（4-6 个命名色值 / 字体及角色 / ASCII 线框 / 设计原则），对照 brief 自查「这是为此项目做的选择，还是任何项目都会生成的默认」——通过后才动工。
2. **实现选型路由**：
   - 网页动效/交互 → **web-animation 系**（iart-ai 插件：gsap-web / page-transition-animation / glassmorphism / micro-interaction / svg-animation / lottie-animation 等，按其 SKILL.md 选型）
   - 数据图表 → **antv 系**（chart-visualization-skills 插件：antv-g2-chart / chart-visualization 等，G2 内联进单文件）
   - 图示/架构图 → **archify**（同插件 vendored）
   - 纯静态排版 → 按 frontend-design 规范直写，不引动效库
   - 类型可叠加（图表页也可有动效），总量受 frontend-design「大胆只花一处」纪律约束
3. **构建**：单文件 html（内联 CSS/JS，离线可开）；响应式、键盘焦点、reduced-motion、可访问性按 frontend-design 质量地板执行。
4. **质检门（必经）**：impeccable detect 检测（--json 证据落盘，退出码 0 过门）；不过门回第 2 步修，不带病交付。

## 边界

- 只管「怎么把 html 做好」；交付什么内容、给谁看、结论如何前置，由调用方（godw-report 或用户直呼）决定。
- 依赖按名调用的上游插件：web-animation-skills、chart-visualization-skills、impeccable（须已安装启用）。
- vendored 件（frontend-design / archify）整装不拆改，更新=按 .origin.json 整装重拉。
