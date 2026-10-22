# godw-design

godw 设计流水线域插件（v0.5.0，2026-10-15 创建；三轮真实试跑驱动机制进化，2026-10-22 四阶段+PRD+LikeC4 定稿实施）。定位：补齐「需求澄清 → 四架构文档 → PRD → 可交互原型」全链的中段。

## 流水线全景（godw-design-orchestrator 编排，四阶段）

```
阶段1 原始需求（人在环，确认定稿才冻结）
  原始需求 → godw-goal:clarify-goal → .agents/GOAL.md
  → godw-design-requirement-formalize → 实例 原始需求.md（FR/NFR 编号，冻结）+ 术语.md + 参考资料/ 归位
阶段2 4A架构 + 模型
  2-a godw-design-requirement-split → 架构腿 + 身份卡.md（身份卡组+考题六类+矩阵，冻结）+ 参考资料/INDEX.md 建账
  2-b 四文档 + detail.json + model.c4（LikeC4 模型源：系统上下文/容器图由它生成）+ 需求追踪.md（ID 贯穿挂链）
  2-c godw-design-gate doc 模式 ↻（答卷表：能做/卡住/靠猜；修订循环嵌 godw-design-check）
阶段3 PRD（功能交付规格）
  3-a godw-design-prd-compose → PRD/（PRD-<设计名> 总览 + 每功能模块 PRD-<模块名>；EARS 验收标准 AC）
  3-b godw-design-gate prd 模式 ↻（对抗审查：身份卡评委思维走查 + 找茬者走歪题 + 简洁官砍膨胀）
阶段4 原型系统
  4-a godw-html lo-fi 线（读 detail.json + PRD/，多文件可交互原型）
  4-b godw-design-gate prototype 模式 ↻（真跑 walk.mjs 出截图+runId 证据；对照 PRD：写了没做=blocker）
  4-c 收口呈报（backlog/NEEDS CLARIFICATION/未内化资料）+ 自动归档 design/archive/
```

编排器**参数化调用**：`/goal 加载 godw-design-orchestrator，执行 <start|document|prd|prototype>`；无参数 = 按目录实况自动识别所处阶段与步骤（state.md 对账，以目录为准）推进到本阶段末停；阶段1 冻结门人在环不自动跨。

实例目录：`design/change/{YYYY-MM-DD}_{设计名}/` 下 state.md / 原始需求.md / 术语.md / 身份卡.md / 参考资料/（INDEX.md+archive/）/ 需求追踪.md（含 PRD 列）/ 4A架构/（四文档+detail.json+**model.c4**）/ PRD/ / 原型系统/ + history/（架构腿/登记表/三门报告/三快照/DECISIONS）。**一个实例一次性完整交付**（要改=新实例重测）。

## 技能（6 自研 godw-design-* 族系 + 1 vendored）与 3 预制评委

| 组件 | 职责 |
|---|---|
| godw-design-orchestrator | 主编排：四阶段流水线 + 参数化调用（start/document/prd/prototype）+ 目录实况自动识别 + state.md 对账 + 冻结门 + 需求回流协议 v2（架构腿与 PRD 吸收+GR 编号）+ 版本系统 + 生命周期（重测/归档）+ 修订循环 |
| godw-design-requirement-formalize | GOAL.md → 原始需求.md（FR/NFR 编号）+ 术语.md；完备性关卡；产出即冻结；完成后删源；参考资料只归位 |
| godw-design-requirement-split | 原始需求定向拆解架构腿（只分解不发明，GR 继承）+ 身份卡.md（冻结）+ INDEX 建账；原型腿已退役（职责归 PRD+detail） |
| godw-design-prd-compose | 阶段3-a：PRD/ 成文——总览（模块表+全局界面状态清单）+ 每功能模块文件（用户故事+**EARS 验收标准 AC**+交互与异常呈现+Non-Goals）；Assumptions 与 [NEEDS CLARIFICATION] 双通道；禁词自查；只产出 PRD |
| godw-design-gate | 三模式验收门：doc（思维业务流答卷）/ **prd（对抗审查）** / prototype（真跑 walk.mjs 出证据+对照 PRD）+ 收敛登记表 + 锚定卡 + 两期节奏 + 评委独立性（主 agent 只核对不代笔） |
| godw-design-check | 机械门 `--phase arch|prd|proto`：追踪链/防发明/互引/术语/**EARS lint**/禁词/页面双向覆盖/model.c4+likec4 validate/靠猜对账；真跑凭证 ranAt |
| c4-architecture | vendored：C4 概念参考（系统级图已由 model.c4/LikeC4 生成） |
| **agents/**：arch-reviewer / simplicity-officer / dev-reproducer | 三固定评叶子智能体（tools 锁只读；打分保留；prd 门只派简洁官） |

核心机制一句话：**换评委的壳、不换基准的魂**（锚定卡+冻结身份卡）+ **能判对错的题优先**（答卷表 + EARS 验收标准机器可 lint）+ **证据即验收**（walk.mjs 截图+runId，无证据作废重派）+ **单一事实源分层**（detail.json 字段 / model.c4 架构图 / PRD 功能规格）+ **ID 贯穿全链**（FR/NFR/GR → 追踪表 → detail trace → 原型）。

## 启动方式（四档参数式）

**调用即一句**：`/goal 加载 godw-design-orchestrator，执行 <档>`；续跑 `/goal 加载 godw-design-orchestrator`（无参数自动识别）。四档：

| 档 | 覆盖 | 启动 | 你的人工检查点 |
|---|---|---|---|
| start 📋 | 阶段1 + 2-a | 普通粘贴 | 实例名确认、完备性缺口表态、冻结确认 |
| document 🤖 | 2-b + 2-c | /goal | 开工自动预检 likec4/mmdc，缺了会停下提示安装 |
| prd 🤖 | 3-a + 3-b | /goal | NEEDS CLARIFICATION 会呈报等你裁决 |
| prototype 🤖 | 4-a/b/c | /goal | 开工自动预检 playwright（目标项目 `npm i playwright`） |

## 边界与依赖

- 只管「设计流水线怎么走、质量门怎么守」。GOAL.md 定稿归 godw-goal；HTML 制作方法学归 godw-html；Mermaid/LikeC4 图规范归 godw-toolkit design-doc-mermaid 与本插件 model.c4 规范。
- 兄弟插件依赖：godw-goal、godw-html、godw-toolkit。外部 CLI（编排器停线提示安装）：`likec4`（模型校验与出图）、`mmdc`（时序图编译校验）、`playwright`（原型门）。
- vendored c4-architecture：C4 概念参考。
- 裁决记录：2026-10-15 定 4A+C4；10-18 四独立文档+收敛机制；10-21 四阶段编排器前身+身份卡+答卷表（0.3.0）；10-22 证据化验收（0.4.0）；10-22 四阶段+PRD+LikeC4 模型源（0.5.0，详见 .agents/godw-design-modify-plan.md）。
