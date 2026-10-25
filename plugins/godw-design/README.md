# godw-design

godw 设计流水线域插件（v0.7.0，2026-10-15 创建；三轮真实试跑驱动机制进化；10-22 四阶段+PRD+LikeC4；10-25 门禁全覆盖+mmdc 移除；10-25 晚 回归考题+分桶基线+视觉断言）。定位：补齐「需求澄清 → 四架构文档 → PRD → 可交互原型」全链的中段。

## 流水线全景（godw-design-orchestrator 编排，四阶段）

```
阶段1 原始需求（人在环，确认定稿才冻结）
  原始需求 → godw-goal:clarify-goal → .agents/GOAL.md
  → godw-design-requirement-formalize → 实例 原始需求.md（FR/NFR 编号，冻结）+ 术语.md + 参考资料/ 归位
  ▸ 完成门机械化：check --phase requirement（骨架/编号/边界/占位/双源）
阶段2 4A架构 + 模型
  2-a godw-design-requirement-split → 架构腿 + 身份卡.md（冻结）+ INDEX 建账
     ▸ 完成门机械化：check --phase split（五节/四句/六类/矩阵对齐/INDEX 对账）
  2-b 四文档 + detail.json + model.c4 + 需求追踪.md
     ▸ 用例覆盖：§3.0 表（UC-xx+关联 FR）+ §3.1 每角色用例视图（图节点=该角色 UC 全集，源码级校验）
  2-c godw-design-gate doc 模式 ↻（答卷表：能做/卡住/靠猜；修订循环嵌 check --phase document）
阶段3 PRD（功能交付规格）
  3-a godw-design-prd-compose → PRD/（总览 + 模块文件；EARS AC 行末挂 FR——每 FR ≥1 AC、每模块 ≥1 异常 AC）
  3-b godw-design-gate prd 模式 ↻（对抗审查；PASS 判定线由 check --registry 机器计算）
阶段4 原型系统
  4-a godw-html lo-fi 线（读 detail.json + PRD/）+ **manifest.json**（页面↔角色↔UC）
     ▸ 自检机械化：walk.mjs crawl（死链/「参考xxx文档」占位/alert 桩/假链）+ check --phase proto --crawl
  4-b godw-design-gate prototype 模式 ↻（crawl 全绿才派评委；真跑 walk.mjs 出证据，每题带 covers:[UC-xx]；
     收卷后 walk.mjs coverage 核对每页 ≥1 goto、每角色 UC 全覆盖；**视觉断言 3c**：抽 PRD 界面可观察 AC
     派视觉验收官看 trace 截图逐条判定，verdict 入证据链；对照 PRD：写了没做=blocker）
  4-c 收口呈报 + 自动归档 design/archive/（**统一成绩单**：轮次 / FAIL 分桶 L1机械|L2语义|L3评委 / 收敛时长 / 新逮数）
机械 FAIL 一律自动派修订子 Agent 循环（不耗评委轮次，上限 10 次；Token 不设限修到达标）；
hooks 双保险系统级兜底：PreToolUse 冻结围栏（拦改已冻结原始需求/快照）+ Stop 收工门（完成声明须凭证在位）。
```

编排器**参数化调用**：`/goal 加载 godw-design-orchestrator，执行 <start|document|prd|prototype>`；无参数 = 按目录实况自动识别所处阶段与步骤（state.md 对账，以目录为准）推进到本阶段末停；阶段1 冻结门人在环不自动跨。

实例目录：`design/change/{YYYY-MM-DD}_{设计名}/` 下 state.md / 原始需求.md / 术语.md / 身份卡.md / 参考资料/（INDEX.md+archive/）/ 需求追踪.md（含 PRD 列）/ 4A架构/（四文档+detail.json+**model.c4**）/ PRD/ / 原型系统/（含 **manifest.json**）+ history/（架构腿/登记表/三门报告/三快照/crawl 报告/DECISIONS）。**一个实例一次性完整交付**（要改=新实例重测）。

## 技能（6 自研 godw-design-* 族系 + 1 vendored）与 3 预制评委

| 组件 | 职责 |
|---|---|
| godw-design-orchestrator | 主编排：四阶段流水线 + 参数化调用 + 目录实况自动识别 + state.md 对账 + 冻结门 + 需求回流协议 v2 + 版本系统 + 生命周期 + **修订自动化（机械 FAIL 自动循环）** |
| godw-design-requirement-formalize | GOAL.md → 原始需求.md（FR/NFR 编号）+ 术语.md；完备性关卡；产出即冻结；完成后删源；完成门 check requirement |
| godw-design-requirement-split | 原始需求定向拆解架构腿 + 身份卡.md（冻结）+ INDEX 建账；完成门 check split |
| godw-design-prd-compose | 阶段3-a：PRD/ 成文——总览 + 模块文件（**EARS AC 挂 FR**+异常 AC+Non-Goals）；歧义双通道；禁词自查 |
| godw-design-gate | 三模式验收门：doc / prd / prototype（**crawl 硬前置**+walk 证据+**covers 覆盖核对**+**视觉断言 3c**）+ 收敛登记表 + 锚定卡 + 两期节奏 + 评委独立性 + **FAIL 分桶统计与收敛基线（3 轮+2 停线）**；**PASS 判定线 check --registry 机器计算** |
| godw-design-check | 机械门五阶段 `--phase requirement|split|document|prd|proto`（约 80 条规则，**0.7.0 起 FAIL 分桶 L1/L2 + trace-fake-ref 假链规则**）+ `--registry` 判定线；真跑凭证 ranAt |
| c4-architecture | vendored：C4 概念参考（系统级图已由 model.c4/LikeC4 生成） |
| **agents/**：arch-reviewer / simplicity-officer / dev-reproducer / **visual-judge** | 四固定评叶子智能体（tools 锁只读；打分保留；prd 门只派简洁官；visual-judge 管视觉断言层——只凭截图判 PRD 界面 AC，带通道自检） |
| **hooks/**：冻结围栏 + 收工门 | PreToolUse 拦改已冻结 原始需求.md 与 history/snapshots/**；Stop 声明「阶段完成/PASS/已冻结」须凭证在位 **且 check 凭证新鲜（ranAt > 源文件最新修改，fail-open）**；无活跃实例秒放行 |
| **evals/**：回归考题集 | **先考后上岗**：两套合成好卷（五阶段全绿基准）+ 6 雷埋雷回归（R1-R3 机械雷全自动=发版硬门；R4-R6 评委雷 --prepare 出任务书/--score 对分）——改评委 prompt/锚定卡/check 规则发版前必跑 |

核心机制一句话：**换评委的壳、不换基准的魂**（锚定卡+冻结身份卡）+ **能判对错的题优先**（答卷表 + EARS AC 机器 lint + FR↔AC↔UC 覆盖全机器核对）+ **证据即验收**（walk.mjs 截图+runId+crawl+coverage，无证据作废重派）+ **单一事实源分层**（detail.json 字段 / model.c4 架构图+gen 防漂移 / PRD 功能规格 / manifest 页面）+ **ID 贯穿全链**（FR/NFR/GR/UC → 追踪表 → detail trace → manifest → 原型）。

## 启动方式（四档参数式）

**调用即一句**：`/goal 加载 godw-design-orchestrator，执行 <档>`；续跑 `/goal 加载 godw-design-orchestrator`（无参数自动识别）。四档：

| 档 | 覆盖 | 启动 | 你的人工检查点 |
|---|---|---|---|
| start 📋 | 阶段1 + 2-a | 普通粘贴 | 实例名确认、完备性缺口表态、冻结确认 |
| document 🤖 | 2-b + 2-c | /goal | 开工自动预检 likec4，缺了会停下提示安装 |
| prd 🤖 | 3-a + 3-b | /goal | NEEDS CLARIFICATION 会呈报等你裁决 |
| prototype 🤖 | 4-a/b/c | /goal | 开工自动预检 playwright（目标项目 `npm i playwright`） |

## 边界与依赖

- 只管「设计流水线怎么走、质量门怎么守」。GOAL.md 定稿归 godw-goal；HTML 制作方法学归 godw-html；Mermaid 图型分工规范归 godw-toolkit design-doc-mermaid（图校验本插件自查：check 源码级 + likec4 gen 防漂移，**0.6.0 起 mmdc 移除不再是依赖**）。
- 兄弟插件依赖：godw-goal、godw-html、godw-toolkit。外部 CLI（编排器停线提示安装）：`likec4`（模型校验/出图/防漂移）、`playwright`（原型门 crawl/走查）。
- vendored c4-architecture：C4 概念参考。
- 裁决记录：2026-10-15 定 4A+C4；10-18 四独立文档+收敛机制；10-21 四阶段编排器前身+身份卡+答卷表（0.3.0）；10-22 证据化验收（0.4.0）；10-22 四阶段+PRD+LikeC4 模型源（0.5.0）；10-25 门禁全覆盖+mmdc 移除（0.6.0，详见 .agents/godw-design-modify-plan.md 1.32）；10-25 回归考题+分桶基线+stop-gate 新鲜度+成绩单+视觉断言（0.7.0，详见 .agents/godw-design-optimizev1.md——视觉断言源自当日对照试验：机械断言漏视觉类 bug、视觉断言 3/3 零误报）。
