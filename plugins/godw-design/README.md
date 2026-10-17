# godw-design

godw 设计流水线域插件（v0.1.0，2026-10-15 创建）。定位：补齐「需求澄清 → 架构文档 → 可交互低保真原型」全链的中段——2026-10-14 godw-finder 两轮调研确认该组合全网无先例（MetaGPT/Kiro/Icemark/BMAD 各缺一段），本仓库两端已有（godw-goal 需求澄清、godw-html 制作域），本插件补中段即首创。

## 流水线全景（make-design 编排）

```
原始需求
  → godw-goal:clarify-goal ──→ .agents/GOAL.md（一次定稿；仅回流协议可受控修订）
  → split-goal（本插件）────→ .agents/GOAL-4A.md（架构腿）+ .agents/GOAL-UX.md（体验腿）
  → [架构段] GOAL.md + GOAL-4A.md
      → .agents/design/ARCH-4A.md（4A 四节骨架 + C4 图 + 机器可读衔接块）
  → [门1·文字层] design-gate doc 模式 ↻（不过则修订重验，安全上限 5 轮）
  → [原型段] 衔接块 + GOAL-UX.md + workbench-conventions
      → brief → godw-html lo-fi 线（wireframe 探结构 → prototype 可交互）
      → .agents/design/prototype/
  → [门2·低保真层] design-gate prototype 模式 ↻（安全上限 5 轮）
  → 收口汇报（两门成绩 + 产物路径 + 裁决记录）
```

核心机制是**自进化验收闭环**（design-gate）——本质是提前用 Agent 模拟真实用户做生产版本运维：每类用户派一个子智能体（角色三源并集全覆盖：业务用户 ∪ 文档角色 ∪ 管理员/运维/审计等生态角色），在文档上用思维业务流走完全程、在原型上实操走完全程，吐槽、需求、建议全部变成可修改项；另派开发者子智能体只凭文档做「照图复现」考试、架构师子智能体按七维质量（业务目标达成/扩展性/耦合内聚/性能/冗余/抽象/复用）审视。反馈三分类回流：工件缺陷修工件、**需求缺口经交付边界判定回写 GOAL 系文件（含 GOAL.md 受控修订 + 演进记录）**、建议择优；修改低保真时同步修改文档——全链进化到「改无可改」（PASS：全部 ≥8 且零阻断零缺口）才放行下一段，安全上限 5 轮防震荡。全程无人值守迭代，这就是「/goal 模式」在本工具链的落地：GOAL.md 定稿即目标契约，技能编排即循环载体。

## 技能（3 自研 + 1 vendored）

| 技能 | 职责 |
|---|---|
| make-design | 主编排：五段流水线（准备/架构/门1/原型/门2）+ 需求回流协议（gaps → 交付边界判定 → GOAL 系三级回写）+ 原型文档同步修订 + 无人值守循环纪律 + 裁决记录 |
| split-goal | GOAL 分解原子：将定稿 GOAL.md 拆为架构腿 GOAL-4A.md + 体验腿 GOAL-UX.md，只分解不发明、缺口显式标记「待澄清」，GOAL.md 只读、两腿可随迭代修订 |
| design-gate | 验收闭环原子：doc 模式（分类用户思维业务流走查 + 开发者复现 + 架构师七维审视）/ prototype 模式（用户实操）；角色三源并集全覆盖；评分卡三分类（blockers/gaps/suggestions）；可独立调用复用于其他工件验收 |
| c4-architecture | vendored：Mermaid C4 图方法学（Context/Container/Component/Deployment/Dynamic 五级 + 反模式清单），4A 文档的图语言 |

## 产物落点（.agents/design/）

| 文件 | 内容 |
|---|---|
| ARCH-4A.md | 4A 架构文档（模板见 make-design references/4a-template.md） |
| prototype/ | brief.md、wireframe.html（可选）、prototype.html、模拟数据等 |
| gate-arch-N.md / gate-proto-N.md | 两门各轮验收报告（子智能体原话评分 + 汇总判定） |
| DECISIONS.md | 无人值守期间的当场裁决记录（每条：歧义/裁决/理由） |

## 边界与依赖

- 本插件只管「设计流水线怎么走、质量门怎么守」；GOAL 系文件归 godw-goal，HTML 制作方法学归 godw-html（lo-fi 线：vendored effective-html 选件 + workbench-conventions）。
- 依赖按名调用的兄弟插件（须已安装启用）：godw-goal、godw-html。
- vendored 件（c4-architecture）整装不拆改，更新 = 按 `.origin.json` 整装重拉。
- 骨架裁决记录（2026-10-15）：4A 四架构作章节骨架 + C4 作图语言；arc42 12 节与 4+1 视图不采用（2026-10-14 调研：4+1 已边缘化，4A 为国内团队通用语言）。
