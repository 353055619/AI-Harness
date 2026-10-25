---
name: godw-design-orchestrator
description: 设计流水线主编排（godw-design 家族唯一入口）：四阶段流水线——阶段1 原始需求（人在环：clarify-goal → godw-design-requirement-formalize → 原始需求.md 冻结）→ 阶段2 4A架构+模型（2-a 备料〔架构腿+身份卡+考题+参考资料 INDEX 建账〕/ 2-b 成文〔四文档+detail.json+model.c4，LikeC4 生成架构图〕/ 2-c 门1 文字层验收）→ 阶段3 PRD（3-a prd-compose 成文〔EARS 验收标准，按功能模块分文件〕/ 3-b 对抗审查验收）→ 阶段4 原型系统（4-a 可交互原型+manifest.json / 4-b 合验门〔对照 PRD 走原型+walk.mjs 证据+crawl 死链懒惰扫描+coverage 覆盖核对〕/ 4-c 收口归档）。参数化调用：start|document|prd|prototype 四档（后三档 🤖/goal），无参数=按实例目录实况自动识别所处阶段（state.md 对账，以目录为准）推进到本阶段末停；冻结门（阶段1 定稿）人在环不自动跨。**0.6.0 门禁全覆盖**：每阶段完成门机械化（check 五阶段 requirement/split/document/prd/proto + walk crawl/coverage），机械 FAIL 自动派修订子 Agent 循环不耗评委轮次（Token 不设限修到达标）；hooks 冻结围栏+收工门系统级兜底；mmdc 已移除（图校验走 check 源码级+likec4 gen 防漂移）。评审收敛靠锚定卡+身份卡+两期节奏，跨层一致靠 ID 贯穿+需求追踪表。产物落 design/change/{日期}_{设计名}/，完成后自动归档 design/archive/。用户要做软件需求设计的架构文档、PRD 与低保真原型时使用。
---

# 设计流水线编排器 → 四阶段：原始需求 → 4A架构 → PRD → 原型系统（三门验收，全链进化）

## 输入（强制）

- **调用参数（可选）**：`start | document | prd | prototype` 四档之一。有参数 → 执行指定档到档末停；无参数 → 按目录实况自动识别（见下）。参数与实况冲突时以实况为准并提示调用方。
- 需求来源两条固定路径（不做多来源探测）：
  - **路径一（首次）**：`.agents/GOAL.md` 存在（clarify-goal 已定稿）→ 阶段1 调同插件 **godw-design-requirement-formalize** 转写为实例的 `原始需求.md` + `术语.md`（用户提供的参考资料原样归位实例 `参考资料/`，登记账由 2-a 建账）；
  - **路径二（重测）**：`design/archive/`（优先）或 `design/change/` 下存在同设计名的上一轮实例 → 复制其 `原始需求.md` 进新实例为起点（原始需求冻结，每轮等价）。
  - 都不存在 → 先调 **godw-goal:clarify-goal** 澄清收口再回来；本技能不代办澄清。
- 自阶段1 结束（用户确认原始需求冻结）起即无人值守授权：原始需求.md 就是目标契约，全程不再问用户，歧义当场裁决并记录（收口时如实汇报）。

## 四阶段与自动识别（每次调用先做）

用户感知四阶段，内部步骤以「阶段<数字>-<字母>」编号：

| 阶段 | 用户产物 | 内部步骤 |
|---|---|---|
| **阶段1 · 原始需求** | 原始需求.md（冻结）+ 术语.md + 参考资料/ 归位 | 前置 formalize（**人在环：确认定稿才冻结**） |
| **阶段2 · 4A架构** | 4A架构/ 四文档 + detail.json + **model.c4** + 需求追踪.md + 身份卡.md | 2-a 备料（架构腿+身份卡+考题+INDEX）→ 2-b 成文 → 2-c 门1 |
| **阶段3 · PRD** | PRD/（总览 + 每功能模块文件） | 3-a prd-compose 成文 → 3-b 对抗审查 |
| **阶段4 · 原型系统** | 原型系统/ 可交互原型 + 收口报告 | 4-a 生产 → 4-b 合验门 → 4-c 收口归档 |

**自动识别规则**（按目录实况判断，不靠会话记忆）：

1. **实例定位**：`design/change/` 唯一实例自动选定；多实例并存 → 停下问用户选哪个；无实例 → 阶段1 开工（含实例命名确认，人在环）。
2. **步骤定位按产物存在性**：无 `原始需求.md` 或未确认冻结 → 阶段1；无 `4A架构/detail.json` → 2-a/2-b；有 detail 而无 `history/snapshots/gate1-pass/` → 2-c 门1；有 gate1 快照而无 `PRD/` → 3-a；有 PRD 而无 `history/snapshots/gate-prd-pass/` → 3-b；有 gate-prd 快照而无 `原型系统/` 成品 → 4-a；无 `history/snapshots/gate2-pass/` → 4-b；齐 → 4-c（已归档则报告完成态）。
3. **state.md 对账**：启动时读实例根 `state.md` 与目录实况比对，不一致**以目录为准**并顺手修正 state.md——面板给人看，目录是唯一真相。
4. **冻结门不自动跨**：阶段1 结束=用户确认原始需求定稿，编排器只能停线等候，不替用户冻结；其余阶段末出阶段报告（衔接卡片）停，放行权归调用方。
5. **推进粒度**：识别后从当前步骤连跑到**本阶段末尾**停；调用方指定只跑某步时照办（分段可独立重跑，文档修订后重跑对应门重新验收天然支持）。

### state.md（实例根进度面板，给人看）

编排器每推进一步即更新：

```markdown
# state · <设计名>
- 当前阶段：<3 · PRD>
- 当前步骤：<阶段3-a · prd-compose 成文>
- 上一步：<阶段2-c 门1 PASS（5 轮收敛；快照 gate1-pass）>
- 下一步：<阶段3-b 调 godw-design-gate prd 模式对抗审查>
- 等你做什么：<无 ｜ 确认原始需求冻结 ｜ 对待澄清/NEEDS CLARIFICATION 表态>
- 更新于：<YYYY-MM-DD HH:mm>
```

## 执行粒度与启动四档

默认连跑一次收口；也支持分段。**调用已参数化**：`/goal 加载 godw-design-orchestrator，执行 <档>` 一句即可（档=启动参数）；无参数 = 自动识别续跑。多实例并存须指明实例名。

| 档（参数） | 覆盖步骤 | 启动方式 | 理由 |
|---|---|---|---|
| **start** | 阶段1 formalize + 阶段2-a 备料 | 📋 普通粘贴 | 人在环：实例名确认、完备性关卡、待澄清表态、冻结确认 |
| **document** | 阶段2-b 成文 + 2-c 门1 | 🤖 **必须 /goal** | 成文+迭代到收敛是连续自主任务，goal 完成审计是无人值守载体 |
| **prd** | 阶段3-a 成文 + 3-b 对抗审查 | 🤖 **必须 /goal** | PRD 成文+审查迭代到收敛，同上 |
| **prototype** | 阶段4-a 生产 + 4-b 合验门 + 4-c 收口归档 | 🤖 **必须 /goal** | 同上，且含最终归档动作 |

## 阶段衔接规范（每步结束必须输出）

任一步（前置/2-a/2-b/2-c/3-a/3-b/4-a/4-b/4-c）执行完停下时，**必须**在汇报末尾输出结构化「下一步」卡片——交接可复制，任何会话任何人照卡片粘贴即可继续：

```markdown
## 下一步
- **阶段**：<如下一步，如 阶段3-a · PRD 成文>
- **调用技能**：<godw-design-orchestrator（参数 prd，按其执行粒度只跑 3-a…3-b）>
- **启动方式**：<🤖 /goal 前缀粘贴（document/prd/prototype 档）｜📋 普通粘贴（start 档）> + 一句为什么
- **输入产物**：<本步产出中下一步要读的文件清单>
- **预期输出**：<下一步产物清单>
- **启动 prompt**：<可直接复制的完整 prompt 代码块（含 /goal 前缀与否）>
- **你的检查点**：<放行前应人工检查什么（如待澄清是否已表态）>
```

## 产物根目录：design/（懒创建）

```
项目根/design/
├── change/                              # 进行中的设计
│   └── {YYYY-MM-DD}_{设计名}/           # 日期=创建日期；四大块=流水线四阶段
│       ├── state.md                     # 进度面板（编排器每步更新；启动对账以目录为准）
│       ├── 原始需求.md                   # 需求本体（两章；FR-xx/NFR-xx 逐条编号；冻结）
│       ├── 术语.md                       # 全链术语表（formalize 首建，随评审增补留痕）
│       ├── 身份卡.md                     # 2-a 产出即冻结：身份卡组+考题六类+身份×题矩阵（gate 角色/考题唯一来源）
│       ├── 参考资料/                     # 外部资料原样落位 + INDEX.md 登记账 + archive/（已内化归档）
│       ├── 需求追踪.md                   # 中心纽带：一行一需求承载链（FR/NFR/GR，含 PRD 列）
│       ├── 4A架构/
│       │   ├── 业务架构.md / 信息架构.md / 应用架构.md / 技术架构.md
│       │   ├── detail.json              # 字段级明细唯一事实源（机读）
│       │   └── model.c4                 # LikeC4 模型源：角色/系统/模块/依赖（上下文与容器图由它生成）
│       ├── PRD/                          # 阶段3 产物：PRD-<设计名>.md 总览 + 每功能模块 PRD-<模块名>.md
│       ├── 原型系统/
│       │   ├── index.html / pages/ / data.js / assets/   # 多文件可交互交付
│       └── history/                     # 全部过程文档
│           ├── 需求-架构输入.md          # 架构腿（活文档；原型腿已并入 PRD）
│           ├── gate-registry.md          # 问题收敛登记表（判定基准）
│           ├── gate-arch-N.md / gate-prd-N.md / gate-proto-N.md   # 三门各轮报告
│           ├── snapshots/gate1-pass/、gate-prd-pass/、gate2-pass/  # 三门过门快照
│           └── DECISIONS.md              # 裁决留痕
└── archive/                              # 已完成的设计（同结构快照，日期保持创建日期）
```

文档链即交付链：**原始需求 → 身份卡/架构腿 → 4A架构（含 model.c4）→ PRD → 原型系统**；术语/追踪表/身份卡/参考资料登记账是贯穿性全局工件；架构腿、登记表、gate 报告、DECISIONS 是过程工件。

## 需求回流协议 v2（原始需求冻结后的进化机制）

验收暴露的需求缺口（gaps）不当 bug 记录，当场分流：

1. **判边界**：交付边界 = 原始需求.md 的「交付边界（In/Out）」清单。gap 服务于已定义用户达成已定义目标 → 界内；引入新用户群/新方向/新价值主张 → 越界。
2. **界内 → 吸收**：需求-架构输入.md 与 PRD 是「设计侧需求工作视图」（原始需求分解 + 已裁决增量的并集），吸收必须记 DECISIONS.md 出处（轮次/来源角色/裁决理由），并给增量编 **GR-xx**（gate requirement）入追踪表——架构类增量进架构腿，功能/界面类增量同步 PRD 功能清单与 AC；**原始需求.md 永不改**（agent 无修改权，用户改=手动带外）。参考资料内化（INDEX 待内化项中明确的业务规则）同走本通道。
3. **越界 → 停止呈报**：范围蔓延不是迭代能解决的，把越界 gaps 原话呈报用户裁决。
4. **收口呈报「建议并入原始需求的 gap 清单」**：用户认可的高价值裁决手动并入原始需求.md（带外）——下一轮重测自然继承，避免重复发现重复裁决。

## 版本系统

- 四文档与 PRD 每篇头部 `版本 vN · YYYY-MM-DD · 一行变更摘要`（N 对齐所在门轮次）；detail.json 顶层 `_version` / `_updated`。
- 版本日志 = history/ 各轮 gate 报告（记录每轮改了什么），不另建 changelog。
- **过门快照**：2-c PASS 快照四文档 + detail.json + model.c4 + 需求追踪.md 到 `history/snapshots/gate1-pass/`；3-b PASS 快照 PRD/ 到 `gate-prd-pass/`；4-b PASS 快照原型系统/ 到 `gate2-pass/`；中间轮不存（防膨胀）。

## 流程

### 阶段1（人在环）：需求定稿

1. 路径一：调同插件 **godw-design-requirement-formalize**（输入 `.agents/GOAL.md`，输出实例 `原始需求.md` + `术语.md`，FR/NFR 编号；其完备性关卡不过则停线补澄清）。
2. 实例命名：建目录前 agent 根据需求提议设计名、请用户首肯；目录 `{YYYY-MM-DD}_{设计名}` 落 `design/change/`（子目录懒创建）。
3. 重测（路径二）时：`design/change/` 下已有**同设计名的未完成旧轮** → 停下提示用户处置（继续旧轮/人工删除/确认并存）后再建新实例。
4. **完成门机械化**：formalize 完成后 **bash 真跑 `godw-design-check --phase requirement` 并原样贴 JSON**（七章节骨架/编号连续/In-Out 非空/占位残留/GOAL 已删/角色四列；不过 → 自动派修订子 agent 循环修到全绿，不问用户不耗任何轮次）。
5. **阶段末尾=冻结门**：原始需求.md 定稿须用户确认，确认前不放行（全流水线唯一人在环门）。

### 阶段2 4A架构 + 模型

**2-a 备料**：调同插件 **godw-design-requirement-split**——原始需求.md 定向拆解为架构腿（`history/需求-架构输入.md`）+ **产出实例根 `身份卡.md`**（身份卡组+考题六类+身份×题矩阵，只从原始需求派生、产出即冻结，先于 2-b——出题的人不看答案）+ **参考资料建账 `参考资料/INDEX.md`**。**完成门机械化**：split 完成后 bash 真跑 `godw-design-check --phase split`（架构腿五节/身份卡四句齐全六类不缺类/矩阵对齐/找茬者挂 FR/INDEX 行数对账/腿角色 ⊆ §2∪推导；不过自动派修订循环修到全绿）。架构腿「待澄清」非空时：能按业界默认安全裁决的记 DECISIONS.md 放行；影响成败的硬缺口停止呈报。

**2-b 成文**：读 `原始需求.md` + `history/需求-架构输入.md`（**document 档开工先做环境预检**：`likec4 --version` 可用，缺则停线提示 `npm i -g likec4`）：
1. **先建 `model.c4`**（LikeC4 模型源）：角色=actor、本系统与外部系统、功能模块=容器、关键依赖关系；`specification` 自定义元素类型；views：系统上下文 + 容器切分。**易错点（实测）**：元素 id 必须 ASCII（字母开头，中文写进标题引号——`actor applicant "申请人"`）；自由文本必须加引号（`title "中文"`）；`include *` 只在 `view of <元素>` 作用域视图合法，无作用域视图显式列元素。
2. `likec4 validate` 过 → `likec4 gen mermaid` 生成上下文/容器图 → 嵌入 业务架构§5 / 应用架构§1（**这两类图不手写**）；人看视图用 `likec4 export png` / `likec4 serve`。**模型变更后必须重新生成嵌入**——check 的 gen 防漂移规则会重跑 gen 比对文档块，漂移即打回。
3. **先建 `需求追踪.md` 骨架**（从原始需求抄 FR/NFR 清单，含 PRD 列「待PRD」），成文过程逐条挂链；四文档节标题挂 `[FR-xx]` 标注。
4. 严格按 [references/arch-templates.md](references/arch-templates.md) 撰写四文档 + `detail.json`（字段级明细唯一事实源，正文同构字段表=模板违规）。手写图（时序/流程/ER/状态）**不引入 mmdc 渲染**——成文后 `godw-design-check --phase document` 做源码级校验（图型合法/引号配对/参与者与页面节点名单对齐/时序图分叉≤2），报错回喂重修后再送门1。
5. 架构质量自查（对应架构评审官七维，先自己过一遍再送审）。

**2-c 门1·文字层**：调同插件 **godw-design-gate** 模式 `doc`（动态用户评委按冻结身份卡+考题以**答卷表**验收〔能做/卡住/靠猜〕+ 开发者复现官 + 架构评审官 + 简洁审查官；探索期→收敛期两段节奏）。

- **修订循环**：FAIL → 按三轨清单修订（blockers 修工件；界内 gaps 走回流协议吸收+GR 编号；suggestions 择优）→ 修订纪律：先改 detail.json/model.c4 再改正文、按追踪表受影响行同步、涉术语同步术语.md、**每次替换/编辑后必须 grep 复核命中结果再继续**（二轮实测三次静默 no-op 教训，锚点漂移即停手重定位）→ **调同插件 godw-design-check 校验——修订子 agent 必须 bash 真跑并原样贴 JSON 输出（ranAt 晚于最新修订才有效）；不过打回修订，不耗评委轮次** → 过 → 重验（回归+新鲜评委）。**安全上限 5 轮**，PASS 即收敛存快照 gate1-pass；超限停止呈报。
- **机械修订自动化（0.6.0）**：check/crawl 类机械门禁 FAIL → 编排器**自动派修订子 agent 循环**（修→真跑 check→贴凭证→不过再修），**不耗评委轮次、不问用户**；机械循环上限 10 次仍不过 → 停线呈报根因。Token 不设限——修到达标为止，省轮次不省质量。
- 过门不冻结：后续阶段反馈若打到架构文档照改（见 4-b 门间联动）。

### 阶段3 PRD

**3-a 成文**：调同插件 **godw-design-prd-compose**——读 原始需求.md + detail.json + 业务架构§3.0 用例总览 + 身份卡考题，产出 `PRD/`（总览 + 每功能模块文件；EARS 验收标准；字段只引 detail；歧义双通道）。同时清 参考资料 INDEX 中影响 PRD 的待内化项（记 DECISIONS）。

**3-b 对抗审查**：调同插件 **godw-design-gate** 模式 `prd`（身份卡评委思维走查 PRD 答卷 + 找茬者优先上走歪题 + 简洁审查官砍膨胀与双写）。

- **修订循环**：FAIL → 改 PRD（界内 gaps 走回流：功能类增量进 PRD 功能清单与 AC + GR 编号）→ check --phase prd 真跑贴凭证 → 重验。`[NEEDS CLARIFICATION]` 条目汇总呈报用户裁决：能定的回 Assumptions 或正文，不能定的留标记进 backlog。**安全上限 5 轮**，PASS 存快照 gate-prd-pass/；超限停止呈报。
- 本门的目的是**把 PRD 缺陷修在原型返工之前**；PRD 与原型的最终一致性仍由 4-b 合验门判定。

### 阶段4 原型系统

**4-a 生产**：读 `4A架构/detail.json`（**只消费它，不重读四文档**）+ `PRD/`（功能清单与 AC 是原型需求的直接来源；原 brief 已退役，页面清单=PRD 总览+模块功能清单，可见性矩阵=detail pages.roles，模拟数据方案=detail seedData）：
1. **生成**（委托 godw-html lo-fi 线，按其 make-html 的 lo-fi 分流）：结构未定先 **html-wireframe** 出 2-3 方向；定稿走 **html-prototype** 出可交互交付——**默认多文件组织**：`原型系统/` 下 `index.html`（壳+路由+账号切换）+ `pages/`（每页一个模块）+ `data.js`（JSON 模拟数据库）+ `assets/`（公共样式脚本）；页面 ≥6 或业务复杂**必须**多文件，≤5 页小场景可单文件 prototype.html。无论组织形态：**不是静态页**——模拟库跳转全通、状态真实流转、角色切换可见性随矩阵变化；data.js 独立使评委与 check 可直接读模拟数据。**必产 `原型系统/manifest.json`**：`{"pages":[{"id"(=detail pages.id),"file","route","roles"(可见角色),"ucIds"(该页承载的用例 UC-xx)}]}`——三向一致性（manifest↔detail pages↔实际文件）由 check 机械核对，是 4-b 覆盖核对的基准。
2. **填追踪表**：4-a 完成后需求追踪.md 原型页面列全部填满（不再允许「待原型」）。
3. **自检机械化（0.6.0）**：bash 跑 `node <godw-design-gate 技能目录>/scripts/walk.mjs crawl <原型系统/> --out history/evidence/crawl-latest.json`（全站死链+懒惰模式〔「参考xxx文档」占位/待实现/alert 桩/假链〕+资源失败）+ `node <godw-design-check 技能目录>/scripts/check.mjs <实例> --phase proto --crawl history/evidence/crawl-latest.json`；任一 FAIL → 自动派修订子 agent 循环修到全绿（不问用户）；flows 每步可走通/状态机全状态可达/AC 覆盖自查仍按原嘱咐人工核对（交 4-b 评委兜底）。

**4-b 合验门·原型层**：调 **godw-design-gate** 模式 `prototype`（开工先 `node <godw-design-gate 技能目录>/scripts/walk.mjs doctor` 环境预检，缺 playwright/浏览器 → 停线提示 `npm i playwright` 等装齐，**不降级成推演**；4-a 的 crawl 报告必须全绿，否则先回机械修订循环；动态用户评委按冻结身份卡+考题**真跑走查器出证据**，场景 JSON 每题须带 `covers:[UC-xx]`（该题演示的用例），含管理员/运维管理面；**对照 PRD 验收：PRD 写了原型没做 = blocker，PRD 没写但原型做了 = 靠猜类缺陷**）。评委答卷收齐后编排层跑 `node walk.mjs coverage <原型系统/manifest.json> <history/evidence/>` **覆盖核对：每 manifest 页 ≥1 次 goto、每角色的 UC 全集被场景 covers 覆盖**——缺口即 FAIL 打回补场景。FAIL → **修改低保真同步修改 PRD 与文档**（不必吝惜 token），问题根源在哪层改哪层：纯实现改原型；PRD 缺陷改 PRD（下轮 3-b 复验对应题）；设计问题改 4A架构（先 detail 后正文）；需求问题走回流。**门间联动**：动了 `4A架构/` 或 `PRD/` 则该轮 **godw-design-check 必跑**（phase 相应 document/prd）+ 回归评委任务书附「受影响 FR/GR 链一致性」附带验证；**仅当改动触及核心不变量或边界规则时回炉 2-c 重验**（防死循环）。安全上限 5 轮（机械修订循环另计不耗轮次），PASS 存快照 gate2-pass/。

**4-c 收口**：汇报 + 自动归档：
- 三门各轮成绩（登记表收敛曲线）、产物路径（原始需求 / 身份卡 / 需求追踪 / 4A架构含 model.c4 / PRD / 原型系统 / 验收报告）、DECISIONS 裁决清单、**backlog 呈报**、**「建议并入原始需求的 gap 清单」呈报**、**参考资料未内化项呈报**、遗留事项。
- **自动归档**：实例从 `design/change/` 挪 `design/archive/`（创建日期不变）；超限停线/悬置/废弃的**不归档**，留 change 由用户人工处置。

## 无人值守纪律（贯穿全程）

1. **不问用户**：原始需求定稿即授权（阶段1 冻结门除外——那是全流水线唯一人在环点）；歧义当场裁决记 DECISIONS.md，收口如实汇报。
2. **机械门禁自动修（0.6.0）**：check/crawl/coverage 类机械 FAIL 一律自动派修订子 agent 循环（上限 10 次，不耗评委轮次不问用户）；评委语义 FAIL 走人工三轨修订。**Token 不设限**——用户口径「能交给 Agent 干的就交给 Agent 干，不要怕 Token 消耗，干好最重要」。
3. **迭代即常态**：三门是提前预演生产版本运维——宁可门内多打死几轮，不让问题漏到下一段。但**收敛≠零问题**：登记表清零即收敛，长尾进 backlog，不为清空 backlog 无限加料（简洁是质量维度）。
4. **超限即停**：任一门 5 轮不收敛 → 停止呈报（多为需求矛盾/边界争议），不带病放行。
5. **完成即停**：三门全过即收口，不擅自扩展（不主动出高保真、不写真实后端）。

## 边界

- 只管「设计流水线怎么走、质量门怎么守」。`.agents/GOAL.md` 的定稿归 godw-goal 域；原始需求.md 由本插件 formalize 产出后冻结（回流协议 v2 是设计侧唯一进化通道，hooks 冻结围栏兜底拦截）；HTML 制作方法学归 godw-html；Mermaid 图型分工规范归 godw-toolkit 的 design-doc-mermaid（图校验本插件自查：check 源码级 + likec4 gen 防漂移，不依赖 mmdc）；评审协议细节归 godw-design-gate；一致性校验归 godw-design-check——本技能只做衔接与守门。
- 依赖按名调用的插件（须已安装启用）：godw-goal（clarify-goal 前置）、godw-html（lo-fi 线）、godw-toolkit（design-doc-mermaid 图型分诊）。
- 外部工具（document 档预检缺则停线提示安装）：`likec4`（模型校验/出图/防漂移，`npm i -g likec4`）；原型门另需目标项目 `npm i playwright`。mmdc 已于 0.6.0 移除，不再是依赖。
