# 评委雷 R4 派发任务书（--prepare 生成，勿手改实例）

- 评委：Agent(subagent_type='godw-design:dev-reproducer')
- 实例（含雷）：</Users/godw/GodwGarage/projects/AI-Harness/plugins/godw-design/evals/last-run/R4-instance>
- 锚定卡：评分锚定：10=可直接上线 / 8=小瑕疵不碍用（通过线）/ 5=核心受阻有绕路 / 2=核心走不通。已裁决清单：无（考题卷）。
- 附件：实例的 需求追踪.md（判定范围）；dev-reproducer 照例不给原始需求与身份卡
- 任务：按该评委职责对实例做评审（与真实门同口径）
- **预期裁决**：答卷 blockers/「只能猜」条目点名 应用架构 §9 或「自行处理」模糊处——照图复现必须能指出哪一步走不下去
- 操作：把评委原样输出存为 evals/last-run/judge-answers/R4.md，然后跑 --score
