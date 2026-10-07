# AGENTS.md 体系模板（层数是结果不是规则）

依据（2026-10-07 检索实测）：agents.md 官方标准（nearest wins）、deepseek-harness（18 份四层实测、one home per fact、词数预算机械门）、ACM 328 配置文件实证。

## 放置表（one home per fact）

| 内容 | 唯一的家 | 别处怎么办 |
|---|---|---|
| 每轮都要遵守的常备指令 | 根 AGENTS.md（每条 1-2 行+链接到家） | 不复述，链接过来 |
| 某子树专属规则 | 该子树 AGENTS.md | 根不代写；不复述根已载规则 |
| 决策理由与取舍 | .agents/notes/（Agent Note） | 正文只留结论 |
| 坑与防再犯 | .agents/TRAP.md | 规则层只留防护结果 |
| 需求与目标 | .agents/GOAL.md（定稿冻结） | 他处不重述 |
| 调研索引 | reference/AGENTS.md（survey 清单+镜像+日期+用途） | 不另建 index 文件 |
| 步骤方法 | 技能 references | 项目里不抄 |

## 层级规则

- **至少两层**：根必建；有真差异化规则的子树必建（.agents/、reference/ 是常客；notes 域可到三到四层）。
- 无差异化规则的目录**一份不建**——层数是规则复杂度的结果，不是设计参数。
- 每份精简：根 <256 行、子树 <128 行（guard 机械门）；每条规则 1-2 行+链接到它的家。
- 事实变了**同一次变更就地更新**（不追加历史；状态会腐烂，目录和文件本身就是状态）。
- 超预算三步：先搬家（挪到该在的层）→ 再压缩 → 最后提额（理由记当轮 postmortem.md）。预算是护栏不是缩减目标。

## 构建顺序（loop-init 第 4-5 步）

1. 先跑 /init（官方勘察生成基础 AGENTS.md；已存在则增量编辑）。
2. 在产物上叠我们的体系：根改写为常备指令册（保留 /init 挖出的项目事实：命令、约定、已知坑）→ 建 .agents/AGENTS.md（读写权与放置表）→ 真差异化子树按需（workspace/、reference/ 常建）。
3. 之后每轮 complete 由 godw-loop-doc 配合 /init 增量维护。
