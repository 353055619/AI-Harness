# godw-design

godw 设计流水线域插件（v0.3.0，2026-10-15 创建；两轮真实试跑驱动机制进化，2026-10-21 按第三轮 modify-plan 定稿实施）。定位：补齐「需求澄清 → 四架构文档 → 可交互原型」全链的中段。

## 流水线全景（godw-design-orchestrator 编排，三阶段）

```
阶段一 原始需求（人在环，确认定稿才冻结）
  原始需求 → godw-goal:clarify-goal → .agents/GOAL.md
  → godw-design-requirement-formalize → 实例 原始需求.md（FR/NFR 编号，冻结）+ 术语.md + 参考资料/ 归位
阶段二 4A架构 + 身份卡
  1a godw-design-requirement-split → history/两腿 + 身份卡.md（身份卡组+考题六类+身份×题矩阵，冻结）+ 参考资料/INDEX.md 建账
  1b 四文档 + detail.json + 需求追踪.md（ID 贯穿挂链，每图一问）
  1c godw-design-gate doc 模式 ↻（身份卡派评委+答卷表；修订循环嵌 godw-design-check）
阶段三 原型系统
  2a brief → godw-html lo-fi 线（wireframe 可选 → prototype 可交互，多文件组织）
  2b godw-design-gate prototype 模式 ↻（身份卡实操答卷；改原型同步改文档）
  2c 收口呈报（含参考资料未内化项）+ 自动归档 design/archive/
```

编排器**每次调用按目录实况自动识别所处阶段与步骤**（state.md 进度面板启动对账，不一致以目录为准），推进到本阶段末尾出阶段报告停；阶段一冻结门人在环不自动跨——续跑只需一句「继续」。

实例目录：`design/change/{YYYY-MM-DD}_{设计名}/` 下 state.md / 原始需求.md / 术语.md / 身份卡.md / 参考资料/（INDEX.md+archive/）/ 需求追踪.md + 4A架构/（四文档+detail.json）+ 原型系统/ + history/（两腿/登记表/报告/快照/DECISIONS）。**一个实例一次性完整交付**（无续作概念，要改=新实例重测）。

## 技能（5 自研 godw-design-* 族系 + 1 vendored）与 3 预制评委

| 组件 | 职责 |
|---|---|
| godw-design-orchestrator | 主编排（原 godw-design-start 更名）：三阶段流水线 + 目录实况自动识别续跑 + state.md 对账 + 冻结门 + 需求回流协议 v2（两腿吸收+GR 编号，原始需求永冻，参考资料内化同通道）+ 版本系统 + 生命周期（重测/归档）+ 修订循环 |
| godw-design-requirement-formalize | GOAL.md → 原始需求.md（FR/NFR 编号）+ 术语.md；完备性关卡；产出即冻结；完成后删源；参考资料只归位（登记账归 1a） |
| godw-design-requirement-split | 原始需求定向拆解两腿（只分解不发明，GR 继承）+ **产出身份卡.md（身份卡组+考题六类+身份×题矩阵，冻结）** + 参考资料 INDEX.md 建账；两腿可反复运行 |
| godw-design-gate | 验收门：收敛登记表 + 评审锚定卡 + **冻结身份卡派动态评委（发目标句不发流程；答卷表：能做/卡住/靠猜）** + 探索→收敛两期节奏 + blocker 准入 + 判定只认回归评委（核心答卷卡住=0 且靠猜清零） |
| godw-design-check | 一致性机械门（脚本+语义核对：追踪链真假/防发明/互引/术语/靠猜对账/配图名单对齐），修订后必跑不耗评委轮次 |
| c4-architecture | vendored：C4 语法参考（图主工具为 godw-toolkit:design-doc-mermaid） |
| **agents/**：arch-reviewer / simplicity-officer / dev-reproducer | 三固定评叶子智能体（tools 锁只读；打分保留；动态上下文调用时传入） |

核心机制一句话：**换评委的壳、不换基准的魂**（锚定卡+冻结身份卡）+ **探索期沸腾、收敛期降温**（两期节奏）+ **能判对错的题优先**（答卷表：卡住/靠猜比分数实在）+ **证据即验收**（原型门真跑 Playwright 走查器：每步截图+runId，无证据答卷作废重派，主 agent 只核对不代笔）+ **ID 贯穿全链**（FR/NFR/GR → 追踪表 → detail trace → 原型）。

## 启动方式（三档 + 一句续跑）

在目标项目目录开 agent 会话。因编排器自动识别，**续跑 prompt 已简化为一句**；首次从零开始按三档：

**第 1 档 · start**（📋 普通粘贴；阶段一需求定稿 + 1a 备料；人在环：实例名确认、完备性关卡、待澄清表态、冻结确认）：

```
加载 godw-design 插件的 godw-design-orchestrator 技能，执行 start 档：前置调 godw-design-requirement-formalize（输入 .agents/GOAL.md，产出 design/change/<日期>_<设计名>/ 的 原始需求.md〔FR/NFR 编号〕+ 术语.md；有参考资料（参考原型/业务流程文档/上级架构文档）我会给路径，请归位到实例 参考资料/；完备性关卡不过就停下报缺口；完成后删除源 GOAL.md），实例名由你提议我确认。随后调 godw-design-requirement-split 备料（两腿+身份卡.md+参考资料 INDEX 建账）。每步完成停下等我检查并给下一步卡片。
```

**第 2 档 · document**（🤖 **必须以 /goal 启动**；1b 四文档成文 + 1c 门1 验收迭代到收敛）：

```
/goal 加载 godw-design 插件的 godw-design-orchestrator 技能，执行 document 档：1b 按 references/arch-templates.md 产出 4A架构/ 四文档 + detail.json + 需求追踪.md（先建骨架逐 FR 挂链；图走 godw-toolkit:design-doc-mermaid 且每图一问；字段明细只进 detail.json；完成后 bash 真跑 godw-design-check --phase arch 并原样保留 JSON 输出——ranAt 是真跑凭证）；1c 调 godw-design-gate doc 模式（身份卡派动态评委答卷表+三固定评委；FAIL 按三轨修订→check→重验，界内 gaps 走回流协议）。档内无人值守迭代到门1 PASS 或 5 轮上限，PASS 存快照后停下汇报并给下一步卡片。
```

**第 3 档 · prototype**（🤖 **必须以 /goal 启动**；2a 原型生产 + 2b 门2 验收 + 2c 收口归档）：

```
/goal 加载 godw-design 插件的 godw-design-orchestrator 技能，执行 prototype 档：2a 只消费 4A架构/detail.json + history/需求-原型输入.md，先过 godw-html:workbench-conventions（工作台类），写 brief 后委托 godw-html lo-fi 线出多文件原型（index.html + pages/ + data.js + assets/，JSON 模拟库+跳转全通+状态真实流转+角色切换可见性），填满追踪表原型列并跑 godw-design-check --phase proto（真跑留 JSON）；2b 开工先跑 node <godw-design-gate>/scripts/walk.mjs doctor 环境预检（缺 playwright 就停下提示我执行 npm i playwright，不降级），再调 godw-design-gate prototype 模式（动态评委写场景真跑走查器出截图+runId 证据后答卷，无证据答卷作废重派；FAIL 三层修订：改原型同步改文档，动了 4A架构 则 check 必跑+受影响链附带验证）；2c 收口（两门成绩/产物/DECISIONS/backlog 呈报/建议并入原始需求的 gap 清单/参考资料未内化项）并自动归档 design/archive/。档内无人值守迭代到门2 PASS 或 5 轮上限。
```

**续跑**（任意中断后）：`/goal 继续执行 godw-design-orchestrator`（唯一实例自动定位；多实例时注明实例名）。

## 边界与依赖

- 只管「设计流水线怎么走、质量门怎么守」。GOAL.md 定稿归 godw-goal（formalize 是入实例的唯一通道）；HTML 制作方法学归 godw-html（lo-fi 线）；Mermaid 图规范归 godw-toolkit（design-doc-mermaid）。
- 依赖按名调用的兄弟插件（须已安装启用）：godw-goal、godw-html、godw-toolkit。
- 原型门走查器（godw-design-gate/scripts/walk.mjs）依赖 playwright：在目标项目根 `npm i playwright` 即可（浏览器优先用机器已装 Chrome/Edge，没有才 `npx playwright install chromium`）；2b 的 doctor 预检缺了会停线提示。
- vendored 件（c4-architecture）整装不拆改，更新 = 按 `.origin.json` 整装重拉。
- 骨架裁决记录：2026-10-15 定 4A 骨架+C4；10-18 四独立文档+detail.json 唯一源+收敛机制+预制评委（两轮实测驱动）；2026-10-21 三阶段编排器+state.md+身份卡+考题答卷表+参考资料内化（详见 .agents/godw-design-modify-plan.md，实施后随档）。
