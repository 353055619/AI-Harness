# godw-html

godw html 制作域插件（v0.1.0，2026-10-11 设立：html 制作能力自 godw-toolkit/godw-report 的格式调度中独立成域）。

## 技能（1 自研编排 + 2 vendored）

| 技能 | 职责 |
|---|---|
| make-html | html 制作统一入口：设计先行 → 实现选型路由 → 单文件构建 → 质检门 |
| frontend-design | vendored 设计规范（anthropics 官方）：token 计划两步法、AI 味五大雷区自校准、质量地板 |
| archify | vendored 图示制作（github.com/tt-a1i/archify v3.0.1，自 godw-toolkit 平移） |

## 按名调用的兄弟插件（不吞并，保持上游插件形态）

- **web-animation-skills**（iart-ai）：网页动效九件套，产出独立 HTML
- **chart-visualization-skills**（antvis）：G2/G6/X6/信息图等图表系（上游仓为 marketplace 内联定义，本仓为其加了 `.zcode-plugin/plugin.json` 包装清单；上游更新=重克隆+重加包装）
- **impeccable**：html 质检门（58 条反模式 detect CLI）

## 与 godw-report 的分工

godw-report 管「交付什么」（格式选型/思想关/G2 精简/DELIVERY.md），其 html 格式调度到本插件 make-html；本插件管「怎么把 html 做好」。
