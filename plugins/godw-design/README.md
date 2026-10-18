# godw-design

godw 设计流水线域插件（v0.2.0，2026-10-15 创建；10-18 首轮真实试跑后机制大进化并按 modify-plan 定稿实施）。定位：补齐「需求澄清 → 四架构文档 → 可交互原型」全链的中段——2026-10-14 调研确认全网无先例，首轮真实试跑（8 轮验收）驱动了收敛机制进化。

## 流水线全景（godw-design-start 编排）

```
原始需求
  → godw-goal:clarify-goal ──→ .agents/GOAL.md（一次定稿）
  → godw-design-requirement-formalize ─→ design/change/<实例>/原始需求.md（FR/NFR 编号，冻结）
                                          + 术语.md（首建，随评审增补）
  → [阶段一 4A架构]
      1a godw-design-requirement-split → history/两腿（活文档）
      1b 四文档 + detail.json + 需求追踪.md（ID 贯穿挂链）
      1c godw-design-gate doc 模式 ↻（锚定卡+两期节奏收敛；修订循环嵌 godw-design-check）
  → [阶段二 原型系统]
      2a brief → godw-html lo-fi 线（wireframe 可选 → prototype 可交互）
      2b godw-design-gate prototype 模式 ↻（改原型同步改文档；门间联动）
      2c 收口：backlog 呈报 + gap 清单呈报 + 自动归档 design/archive/
```

实例目录：`design/change/{YYYY-MM-DD}_{设计名}/` 下 原始需求.md / 术语.md / 需求追踪.md + 4A架构/（四文档+detail.json）+ 原型系统/ + history/（两腿/登记表/报告/快照/DECISIONS）。**一个实例一次性完整交付**（无续作概念，要改=新实例重测）。

## 技能（5 自研 godw-design-* 族系 + 1 vendored）与 3 预制评委

| 组件 | 职责 |
|---|---|
| godw-design-start | 主编排：两阶段流水线 + 需求回流协议 v2（两腿吸收+GR 编号，原始需求永冻）+ 版本系统 + 生命周期（重测/归档）+ 修订循环 |
| godw-design-requirement-formalize | GOAL.md → 原始需求.md（FR/NFR 编号）+ 术语.md；完备性关卡；产出即冻结；完成后删源 |
| godw-design-requirement-split | 原始需求定向拆解两腿（只分解不发明，GR 继承），可反复运行 |
| godw-design-gate | 验收门：收敛登记表 + 评审锚定卡 + 探索→收敛两期节奏 + blocker 准入 + 判定只认回归评委（blocker 不论谁发现都阻断） |
| godw-design-check | 一致性机械门（脚本+语义核对：追踪链真假/防发明/互引/术语），修订后必跑不耗评委轮次 |
| c4-architecture | vendored：C4 语法参考（图主工具为 godw-toolkit:design-doc-mermaid） |
| **agents/**：arch-reviewer / simplicity-officer / dev-reproducer | 三固定评叶子智能体（tools 锁只读；人格方法论固化；动态上下文调用时传入） |

核心机制一句话：**换评委的壳、不换基准的魂**（锚定卡）+ **探索期沸腾、收敛期降温**（两期节奏）+ **ID 贯穿全链**（FR/NFR/GR → 追踪表 → detail trace → 原型）。

## 分段手动启动 prompt 模板

在目标项目目录开 agent 会话，按顺序粘贴（每段=手动启动该步的无人值守迭代，段间检查产物后放行；每段可独立重跑）。假设实例已定稿需求（无则先跑前置段）：

**前置 · 需求定稿**（首次）：

```
加载 godw-design 插件的 godw-design-requirement-formalize 技能：输入 .agents/GOAL.md，产出 design/change/<日期>_<设计名>/ 下的 原始需求.md（FR/NFR 编号）与 术语.md，实例名由你提议我确认。完备性关卡不过就停下报缺口。完成后删除源 GOAL.md。停下等我检查。
```

**1a · 需求分解**：

```
加载 godw-design 插件的 godw-design-start 技能，按其执行粒度只跑 1a 备料：调 godw-design-requirement-split 对实例原始需求.md 做双腿分解（history/需求-架构输入.md + 需求-原型输入.md），只分解不发明。完成后汇报两腿要点与「待澄清」清单，停下等我检查。
```

**1b · 四文档成文**：

```
加载 godw-design 插件的 godw-design-start 技能，只跑 1b 成文：按 references/arch-templates.md 产出 4A架构/ 四文档 + detail.json + 实例根需求追踪.md（先建骨架逐 FR 挂链，节标题挂 FR 标注；图走 godw-toolkit:design-doc-mermaid；字段明细只进 detail.json）。完成即跑 godw-design-check（--phase arch）自检后停，等我检查。
```

**1c · 门1 验收（无人值守循环）**：

```
加载 godw-design 插件的 godw-design-start 技能，只跑 1c 门1：调 godw-design-gate doc 模式（动态用户走查+三固定评委；锚定卡+两期节奏）。FAIL 按三轨修订（界内 gaps 走回流协议）→ godw-design-check → 重验，循环到 PASS 或 5 轮上限，无人值守不要问我。PASS 存快照后停下汇报各轮判定，等我检查。
```

**2a · 原型生产**：

```
加载 godw-design 插件的 godw-design-start 技能，只跑 2a 生产：只消费 4A架构/detail.json + history/需求-原型输入.md，先过 godw-html:workbench-conventions（工作台类），写 brief 后委托 godw-html lo-fi 线出 原型系统/prototype.html（JSON 模拟库+跳转全通+状态真实流转+角色切换可见性），并填满需求追踪表原型列，跑 godw-design-check（--phase proto）自检。停下汇报覆盖面，等我检查。
```

**2b+2c · 门2 验收与收口（无人值守循环）**：

```
加载 godw-design 插件的 godw-design-start 技能，跑 2b 门2（godw-design-gate prototype 模式；FAIL 三层修订：改低保真同步改文档，动了 4A架构 则 check 必跑+受影响链附带验证）与 2c 收口（两门成绩/产物路径/DECISIONS/backlog 呈报/建议并入原始需求的 gap 清单呈报），PASS 后自动归档 design/archive/。循环到 PASS 或 5 轮上限，无人值守不要问我。
```

## 边界与依赖

- 只管「设计流水线怎么走、质量门怎么守」。GOAL.md 定稿归 godw-goal（formalize 是入实例的唯一通道）；HTML 制作方法学归 godw-html（lo-fi 线）；Mermaid 图规范归 godw-toolkit（design-doc-mermaid）。
- 依赖按名调用的兄弟插件（须已安装启用）：godw-goal、godw-html、godw-toolkit。
- vendored 件（c4-architecture）整装不拆改，更新 = 按 `.origin.json` 整装重拉。
- 骨架裁决记录：2026-10-15 定 4A 骨架+C4；10-18 按用户指令改四独立文档（业务/信息/应用/技术）+ detail.json 唯一源；评审收敛、追踪纽带、预制评委均首轮实测驱动定稿（详见 .agents/godw-design-modify-plan.md，实施后随档）。
