---
name: godw-design-check
description: 一致性校验原子技能（godw-design 家族，修订循环的机械门，0.6.0 五阶段全覆盖）：对 design 实例做两级校验。机械级（check.mjs，五阶段）——requirement：七章节骨架/FR-NFR 编号连续/In-Out 非空/占位残留/术语表三列/GOAL.md 双源/§2 角色行四列；split：架构腿五节/腿角色 ⊆ §2∪推导/身份卡三节+每卡四句/考题六类不缺类/矩阵与考题双向对齐/找茬者挂 FR/INDEX 行数=资料文件数；document：detail 自洽+permissions 命名+seedData 在位+detail.roles↔身份卡对账+追踪表链路+四文档版本行/禁词/ID 杜撰+trace 无缺失（升级为失败）+用例覆盖三件套（UC 表/每 FR ≥1 用例/每角色用例视图图节点=UC 全集/流程节真实存在）+时序图参与者对齐+分叉≤2+状态图↔detail.states+页面流转图节点+BR-xx 编号+度量可量化+NFR→质量场景逐条+mermaid 源码级校验（图型/引号）+likec4 validate+gen 防漂移+model 在位；prd：PRD 目录/总览/版本行/Input 溯源行/EARS lint（五词含 THE）/AC 唯一·连续·≤30/AC 挂 FR（每条 ≥1）/每 FR ≥1 AC/每模块 ≥1 IF 型异常 AC/全局状态五类/模板残留与占位/禁词/总览↔模块双向链接/页面双向覆盖/NEEDS CLARIFICATION 计数；proto：manifest 三向一致（manifest↔detail pages↔实际文件）/原型懒惰模式静态扫描（参考文档占位/待实现/TODO/alert 桩/href="#" 假链）/--crawl 结果折叠（死链与运行态懒惰）/seedData 对齐抽查；--registry 登记表判定线计算（open blockers/界内 gaps/靠猜清零=passCandidate）。输出 ranAt/newestSourceMtime 真跑凭证。语义级（agent 核对）：防假链/防发明元素/互引节号/术语一致/交叉索引/靠猜对账/用例-流程语义对齐/AC 可判对错/双写红线/考题落点。触发时机：五阶段完成门与每次修订后、进重验评委前必跑——必须 Bash 真跑并原样引用输出（防"声称跑过"）；机械 FAIL 由编排器自动派修订子 agent 循环（不耗评委轮次，Token 不设限）；也可独立调用。
---

# 一致性校验 → 校验报告（机械门，秒级，不耗评委轮次）

## 输入（强制）

- 实例路径（`design/change/<实例>/`；唯一实例自动定位，多实例须指明）。
- 校验阶段（决定口径与启用规则集）：
  - `requirement`——阶段1 formalize 完成门（原始需求.md+术语.md 就绪、GOAL 已删）
  - `split`——阶段2-a 完成门（架构腿+身份卡+INDEX 就绪）
  - `document`——阶段2 成文后与门1 修订循环（遗留 `arch` 为别名）
  - `prd`——阶段3 成文与修订循环
  - `proto`——阶段4-a 完成后与 4-b（可加 `--crawl <报告>` 折叠走查器爬取结果）
- 可选 `--registry`：对 history/gate-registry.md 做判定线计算（open blockers/界内 gaps/靠猜 是否清零）。

## 执行：先机械级（脚本），后语义级（agent 核对）

### 第一步：机械级（跑 [scripts/check.mjs](scripts/check.mjs)）

```bash
node <技能目录>/scripts/check.mjs <实例路径> --phase requirement|split|document|prd|proto [--crawl <crawl.json>] [--registry]
```

脚本输出 JSON 结果（exit 0=过 / 1=失败清单 / 2=用法错误）。各阶段规则集：

**requirement（阶段1）**
- 七章节骨架齐全（背景与问题/用户与对象/交付边界/功能需求/非功能约束/已有资产/术语索引）；FR/NFR 编号连续无跳号重号；§3.1 In 条目非空、§3.2 Out 显式存在；占位残留扫描（待补充/TBD/待定/`<…>`）；术语.md 三列表；`.agents/GOAL.md` 已删（防双源）；§2 角色行四列齐全。

**split（阶段2-a）**
- 架构腿五节在位；腿角色 ⊆ 原始需求 §2 角色 ∪ 显式「推导」标注；身份卡三节+每角色卡四句齐全；考题六类不缺类（缺类须「不适用+理由」）；矩阵表头考题 ⊆ 考题清单且考题全入矩阵、矩阵行角色 ⊆ 身份卡组；找茬者清单每条挂 FR/NFR；INDEX.md 行数 = 参考资料文件数。

**document（阶段2；detail/四文档/追踪表/模型）**
- detail.json 自洽（原有 9 条）+ permissions `<资源>:<动作>` 小写 + seedData 在位 + detail.roles ↔ 身份卡角色对账（身份卡外角色未裁决=失败）+ **detail 元素无 trace 未标 deferred 由警告升级为失败**。
- 需求追踪表链路（分阶段口径同前）；四文档版本行、ID 杜撰、**禁不可验证词**（高性能/适当处理/良好体验/极佳体验/业界领先）。
- **用例覆盖三件套**：§3.0 表 UC-xx 编号在位；每条 FR ≥1 用例（uc-fr-coverage）；§2 每角色 ≥1 用例且有专属用例视图小节（uc-role-coverage）；每角色 mermaid 图节点 = 该角色 UC 全集（uc-diagram-consistency，图多一少一都打回）；用例挂的 §3.x 流程节真实存在（uc-flow-ref）。
- 时序图参与者 ∈ 角色∪系统名（升级为失败）、无时序图即失败；分叉块 alt/opt/par ≤2/图；信息架构状态图在位且覆盖 detail.entities[].states 全部状态；应用架构页面流转图节点 ∈ detail pages（升级为失败）；每条 NFR 出现在技术架构§3 质量场景；含业务规则的流程小节必有 BR-xx 编号；§1 成功度量含量化数字。
- mermaid 源码级校验（**0.6.0 起不依赖 mmdc**）：图型合法、引号配对；likec4 validate + **gen 防漂移**（重跑 `likec4 gen mermaid` 比对文档内嵌块，模型改了没重新生成即打回）。

**prd（阶段3）**
- 原有规则（目录/总览/版本行/EARS lint/AC 唯一 ≤30/禁词/总览链接/页面双向覆盖/NC 计数）+
- **EARS lint 修正**：允许 THE 开头无条件式（五词 WHEN/IF/WHILE/WHERE/THE，对齐 Mavin）；
- **AC 挂 FR 三查**：每条 AC 行末挂 ≥1 FR/GR（ac-fr-missing）；每条 FR ≥1 条 AC 覆盖（ac-fr-coverage）；每模块 ≥1 条 IF 型异常 AC（module-if-ac-missing）；AC 编号模块内连续（ac-numbering-gap）；
- 每文件头部 Input 溯源行挂 FR/GR/T-xx；总览§3 全局状态五类齐全（空态/无权限/服务器异常/重复提交/内容被删）；模板注释 `<!--` 与 `<…>` 占位残留扫描；模块文件未在总览链接（prd-module-unlinked）。

**proto（阶段4）**
- `原型系统/manifest.json` 必备且 schema 合法（pages[].id/file/route/roles/ucIds）；**三向一致**：manifest ↔ detail.json pages ↔ 实际文件；
- **懒惰模式静态扫描**（用户实测痛点）：`参考…文档`/`详见…文档|PRD|架构`、待实现/敬请期待/coming soon/占位、TODO、`onclick="…alert("` 桩、`href="#"` 假链——命中即失败；
- `--crawl <报告>`：折叠 walk.mjs crawl 的运行态死链与懒惰命中（4-b 前必附，不附出警告）；
- data.js 种子 ↔ detail.seedData 实体名对齐抽查（启发式警告）。

**--registry（登记表判定线计算）**：解析 gate-registry.md 表格（编号|类型|问题|来源|状态），输出 `{openBlockers, openGapIn, openGuess, backlog, passCandidate}`——passCandidate = 三类 open 全零；状态列空白 = registry-status-empty 失败。编排层把它与「本轮新 blockers=0 + 核心答卷卡住=0」合成最终 PASS。

脚本失败 → 输出逐条失败清单，**直接打回修订**（编排器自动派修订子 agent 循环，不进语义级、不耗评委轮次）。

**真跑凭证（1.28）**：输出含 `ranAt`（运行时刻）与 `newestSourceMtime`（被检文件当时最新修改时刻）。修订者必须 **Bash 真跑**本脚本并把**原始 JSON 原样贴进修订记录/gate 报告**；编排层核对贴出的 `ranAt` 晚于被检文件**当前**最新修改时间——不晚于 = 视为未跑，打回重跑。**禁止凭阅读代码宣称通过。**

### 第二步：语义级（agent 逐项核对，机械查不出的真假）

1. **防假链**：追踪表登记的「业务架构节/应用架构节」在文档中真实存在，且该节内容确实承载对应需求（抽查挂错链）。
2. **防发明**：四文档中找不到任何需求出处的设计元素 → 报告（供简洁审查官砍单）；detail 元素 trace 合法性已机械化。
3. **互引有效**：文档间「见 信息架构§X」类交叉引用的节号真实存在。
4. **术语一致**：四文档用词与 术语.md 对照——同词异义或未收录新术语 → 警告（不算失败）。
5. **交叉索引核对**：文档节标题挂的 [FR-xx] 标注 ⊆ 追踪表该 FR 行登记的承载节（防漏登）；反向防假登。
6. **靠猜对账**：gate 报告附录答卷 JSON 的每个「靠猜」都已在登记表登记且无一条标 backlog。
7. **用例-流程语义对齐**：§3.0 每个用例能在所挂流程的**步骤内容**中找到（机器只查流程节存在性，内容承载靠语义）；身份卡考题找不到对应用例 = 失败。
8. **AC 可判对错抽查**：一条 AC 被两种合理实现都满足即失败。
9. **PRD 双写红线**：PRD 出现与 detail.json 同构的字段级表格 = 失败。
10. **考题 ↔ PRD 对齐**：每道身份卡考题 T-xx 在 PRD 有功能落点或明确 Non-Goals。

## 输出：校验报告（追加到当前修订轮的 gate 报告前，或独立 `history/check-N.md`）

```markdown
# 一致性校验 · <时间> · 阶段 <requirement/split/document/prd/proto>
- 机械级：PASS / FAIL（失败清单逐条）
- 语义级：PASS / FAIL（假链/发明/互引逐条）+ 警告（术语类）
- registry（如跑）：openBlockers/openGapIn/openGuess/backlog/passCandidate
- 结论：放行进评委 / 打回修订（附修复提示）
```

## 纪律

- **机械优先**：脚本能查的不劳 agent，agent 只做语义核对。
- **不修只报**：本技能只校验报告问题，不修改任何文档（修订归调用方；评委归 gate）。
- **不耗轮次**：本校验不算入评委安全上限——机械 FAIL 由编排器自动派修订子 agent 循环（上限 10 次，Token 不设限），直到干净才见评委。
- **独立可呼**：不依附流水线，任何时点可对实例单独跑一次体检。
