# 循环契约 v3（godw-loop 全族共用；start/run/complete/postmortem/doc 同守）

依据：dsh Agent Notes 体系（路径即状态、骨架强制、supersession 检查）、Anthropic NOTES/context rot、doubt-driven-development、Ralph 循环纪律；v1/v2 演化史见 godw-loop-init/references/design-notes.md。

## notes 规范（一题一文件夹，状态单一事实源）

- 路径：`.agents/notes/{proposed|changes|archived}/<YYYYMMDD-主题>/`；文件夹名=首次提出日期+主题，流转**永不改名**；无 meta.json、无 Status 行——状态只看目录与文件存在性（reject.md 在=rejected；BLOCKED 在=卡点；3P 齐+无 reject.md=done）。
- proposal.md 头部（前四行，guard 机械校验）：

```markdown
# Agent Note: <标题>

Type: feature | bug-fix | simplification | architecture | process | testing
From: Agent | Human
```

- 骨架：Background（GOAL 诉求+历史决策+TRAP，Problem 的前提）→ Problem → Proposal（可将来时）→（自由节）→ Alternatives considered（每条真实备选+为什么输，**强制**）→ Acceptance criteria（逐条可判定）→ Risks（风险+主动放弃）。正文中文。
- 类别判别：architecture=交付源码的结构决策，process=外围工具与流程；refactor 不设（归 simplification，判别式=可观察行为变没变）。

## 查重与复提

查重范围=全树主题与 history summary。撞在途件（proposed/changes）→ 修订旧件；撞 archived rejected → 新提案 Background **显式推翻原否决理由**才可建（原 reject.md 冻结，互链）；撞 archived done → 增量扩展（Background 链接原案+声明增量边界）。

## 状态流转（移动文件夹+必备文档，同轮原子完成）

proposed→changes（run 决定 implement，整夹移动）；proposed→archived+reject.md（run 拒）；changes→archived（complete 收口，done）；changes→archived+reject.md（评审退步回滚，教训入档不回 proposed）；changes 停留+BLOCKED（run 做不完，连续 2 轮无进展强制 reject）。archived 拒改写；rejected 只在防住诱人错误时留，否则整夹删。

## history.json（决策摘要账，doc 独占，只追加）

```json
{ "topics": [ { "id": "…", "type": "…", "from": "…", "outcome": "done|rejected|noop", "score": 7.5, "summary": "一句话", "archived": "notes/archived/…" } ] }
```

防退化序列=最近 5 个 done 题的 score 均值；显著退步=单分 < 均值 − 0.5。

## CHAT.md（用户↔agent 唯一异步接口，只增）

- 位置 `.agents/CHAT.md`；INSTRUCTION.md/QUESTIONS.md 退役，接口收敛（循环期间另一接口=用户直投 proposal，From: Human 由 start 代录）。
- 条目头：`## [YYYY-MM-DD HH:mm] From: Agent|User`；类型四选：提问 / 答复 / 指示 / ack。
- guard 只增校验：Edit 一律拦；Write 须前缀追加（新内容含盘上全部旧内容，同 history.json 模式）；首建放行（godw-loop-doc 初建种子）。
- 消化：start 每轮扫增量——指示最优先、答复逐条，问答不阻塞按默认先执行；doc 收口追加 ack 条目=消化游标（不改旧条目）。
- status.html 每轮展示"待用户"条目区（用户视角待办）。

## 派发纪律（run）

changes/ 遗留 > Human 最早 > Agent 最早；BLOCKED 文件内容=原因+起日+连续轮数；拒 Human 提案须追加 CHAT.md 提请知悉。

## 全族铁律

1. 指令与状态分离：GOAL 定稿后 agent 永不可写（首建放行、存在即冻结）；history/TRAP 每轮变；用户指示与答复走 CHAT.md（只增，问答不阻塞，指示最优先消化）。
2. 评审独立：postmortem 必须新鲜上下文子智能体；派发一切子智能体 prompt **原样带禁令**（hook 只拦主会话）。
3. **Bash 禁令**：notes/ 的**文件内容**严禁经 Bash 写入（echo/sed/tee/cat 重定向绕 hook 属违规，评审专项抽查）；文件夹移动（mv）与经 .trash 的删除仅限 run/complete 的状态转移动作，内容创建与修改一律走 Write/Edit 过机械门。
4. human 区只读；删除先进 .trash；.tmp 随时可清；宣称完成必须有当场验证过的输出。
5. 每轮三段各设 AC 目标（Goal Mode，可改小重设）；报告只写实际跑过的命令。
6. 派生子智能体配额意识：一轮 ≤ 4（finder）+3（complete）个。

## cron 兜底（references/cron-prompt.md）

automation 触发的会话调自循环 workflow（godw-loop-round）；注册参数与 prompt 模板见该文件；默认节奏 4h；automation-id.txt 仅此通道使用（在场=human 区写锁生效）。
