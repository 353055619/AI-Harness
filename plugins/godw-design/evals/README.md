# evals/ 回归考题集——「先考后上岗」

门禁本身没有回归保险：评委 prompt、锚定卡、check 规则、编排器裁决逻辑改版后灵不灵，以前只能等真实实例暴露。这套考题把保险补上——**改任何评委/规则，发版前必跑考题**。

## 纪律

- **发版硬门**：`node evals/run.mjs --prepare` 退出码 0（好卷误杀 = 0 且机械雷 R1-R3 全逮）。不过不许发版。
- **改评委 prompt / 锚定卡 / 考题规则时**：额外跑评委雷 R4-R6（`--prepare` 出任务书 → 按任务书派三评委 → 答案存 `last-run/judge-answers/` → `--score` 对分 3/3）。
- **改 check 规则时**：`--prepare` 的好卷误杀就是你的回归信号——误杀 >0 说明规则误伤了合法产物。
- 考题集是活的：真实实例暴露新偷懒形态 → 提案补雷（改 run.mjs 的注入函数与预期裁决），回流通道同 optimize 文档 1.5。

## 卷子

| 卷 | 内容 | 用途 |
|---|---|---|
| `fixtures/2099-01-01_悬赏厅最小卷` | 2 角色 / FR-01..03 / NFR-01 / 2 页 / 单文件原型 | 最小规格误杀检测 |
| `fixtures/2099-01-02_悬赏厅完整卷` | 3 角色 / FR-01..05 / NFR-01..02 / 4 页 / 多文件原型 | 完整规格误杀检测 + 全部雷的注入基底 |

两卷都必须 check 五阶段全绿。**改卷子内容 = 改考题**：改完必须重跑 `--prepare` 确认仍全绿。

## 埋雷清单（6 雷）

| 雷 | 埋法（run.mjs 运行时注入，不落盘到卷子） | 应逮者 | 类型 |
|---|---|---|---|
| R1 | PRD 全部 AC 行抹掉 FR-05 挂链 | check `ac-fr-missing`（prd） | 机械，全自动 |
| R2 | 追踪表 FR-01 行节号引用改成 9.9（假链） | check `trace-fake-ref`（document） | 机械，全自动 |
| R3 | 业务架构删掉 UC 引用最密的 §3.x 流程节 | check `uc-flow-ref`（document） | 机械，全自动 |
| R4 | 应用架构补「其余交互细节由系统自行智能处理」豁免句 | dev-reproducer 记 blocker | 评委，--prepare 出任务书 |
| R5 | PRD 塞「全网热度预测+AI 情感分析+站外推送」过度设计 AC | simplicity-officer 砍单 | 评委，同上 |
| R6 | 业务架构 §1 塞「架构合理清晰…令人满意」空泛自评 | arch-reviewer 锚定纪律（无反例不给高分） | 评委，同上 |

口径：逮雷召回 100%（机械雷硬门）；评委雷关键词对分 + 人工复核（`--score` 报告）。

## 用法

```bash
# ① 发版前（硬门）
node evals/run.mjs --prepare        # 期望输出：误杀 0 / R1-R3 全逮 / 硬门 PASS

# ② 改评委后（纪律项）：按 last-run/R{4,5,6}-brief.md 派三评委（任务书自带锚定卡与实例路径），
#    评委原样输出存 last-run/judge-answers/R{4,5,6}.md，然后：
node evals/run.mjs --score          # 期望：R4-R6 全逮 / 纪律项 PASS
```

产物均在 `last-run/`（prepare-report.json / score-report.json / 注雷实例 / 任务书），跑一次覆盖一次。
