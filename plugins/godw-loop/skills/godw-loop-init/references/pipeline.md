# godw-loop 流水线：三插件、三段循环与目录全景

2026-10-07 v3 定稿（godw 拍板，v1 四段制与 v2 notes 扁平件退役，演化史见 design-notes.md）。

## 三插件格局

| 插件 | 技能 | 职责 |
|---|---|---|
| godw-loop | loop-init / loop-start / loop-run / loop-complete / loop-postmortem / loop-doc | 循环引擎 + guard hooks + 自循环 workflow |
| godw-toolkit | godw-session-init / godw-goal / godw-report + vendored 14 | session 契约、目标定稿、交付呈现 |
| godw-finder | godw-finder（编排）+ plugin-finder / skill-finder / web-search / social-search | 搜索调研域 |

## 主循环（自循环 workflow 承载；每段走 Goal Mode）

```
godw-loop-init --create/--update（一次调用编排全程：
   goal 澄清定稿 → /init → doc 初建账本 → 门禁+首commit+workflow 注册）
                                                      │ (用户手动启动)
                                                      ▼
 ┌─ 循环 ──────────────────────────────────────────────┐
 │ godw-loop-start（门禁+消化CHAT+分析+调 finder+提案）  │
 │   ▼                                                 │
 │ godw-loop-run（清遗留→FIFO 派发→plan.md→执行）        │
 │   ▼                                                 │
 │ godw-loop-complete（并行：postmortem/report/doc；     │
 │                     归档；tag；续轮）                  │
 └─────────────────────────────────────────────────────┘
```

- 承载：自循环 workflow `godw-loop-round`（唯一自动化编排，脚本内 while，天然串行零重叠；init 收尾 SaveWorkflow 注册进项目 `.zcode/workflows/`——插件清单无 workflows 组件，随包文件不会被自动注册；cron 兜底也调 workflow）；技能链仅最后手段。
- 中断恢复：段间以 git + changes/ 状态锚定，从当前段续。

## 目录全景（新项目）

```
<项目根>/
├── AGENTS.md                     # 根说明书（<256 行机械门；/init 产物上构建）
├── .gitignore + git 仓           # 每轮绿态 tag
├── .agents/
│   ├── AGENTS.md                 # 读写权与放置规则（<128 行机械门）
│   ├── GOAL.md                   # ①原始目标原话 ②纯澄清目标（首建放行，存在即冻结）
│   ├── status.html               # 循环现状看板（godw-report 每轮更新，含 CHAT 待答区）
│   ├── history.json              # 决策摘要账（godw-loop-doc 独占；根标记）
│   ├── TRAP.md                   # 坑账：一条一行
│   ├── CHAT.md  DELIVERY.md      # CHAT=用户↔agent 唯一异步接口（只增）
│   ├── automation-id.txt         # 仅 cron 兜底通道使用
│   └── notes/                    # 一题一文件夹，流转不改名
│       ├── proposed/<YYYYMMDD-主题>/proposal.md
│       ├── changes/<YYYYMMDD-主题>/{proposal.md, plan.md, postmortem.md, BLOCKED?, 工作产物}
│       └── archived/<YYYYMMDD-主题>/（3P 全套=done；+reject.md=rejected）
├── docs/                         # 说明文档（按需）
├── reference/
│   ├── AGENTS.md                 # 调研索引之家（survey 清单+镜像+日期+用途）
│   ├── survey-<theme>-YYYYMMDD.md
│   └── <镜像素材目录>
├── delivery/                     # 最新成品（godw-report 滚动重生成）
├── workspace/{human/, agent/}    # 用户领地（只读）/ agent 工作区
├── .tmp/  .trash/                # 临时区 / 停尸房
```

退役件（v1/v2 骨架有、本版不建）：BACKLOG.md（队列=proposed/）、state.json（history 即根标记）、postmortem/ 目录（history+TRAP 替代）、docs/research.md（survey 替代）、GOAL.history.md 与 .goal-unlock（定稿制）、meta.json 与 index.json（单一事实源原则）。

## --update 迁移映射

| 旧件 | 去向 |
|---|---|
| BACKLOG.md 条目 | 逐条转 proposed/<YYYYMMDD-主题>/proposal.md（From: Agent） |
| 旧 notes 扁平件（proposed/implemented/rejected） | 按状态入三态；头部改 Type/From 行（去 Status 行） |
| 旧 journal/流水、旧 postmortem/ 目录 | docs/ 存档（冻结史不动） |
| state.json / GOAL.history.md / .goal-unlock / meta.json / index.json | 挪 .trash |
| QUESTIONS.md / INSTRUCTION.md | 条目转 CHAT.md（补时间戳与 From 头），旧件挪 .trash |

## hooks 保障（随 godw-loop 分发）

1. workspace/human/ 写锁（automation-id.txt 在场即拦）
2. GOAL.md 存在即拦写（定稿制；文件不存在时放行首建=goal 澄清后一次写全两章；双位置兼容旧项目 docs/GOAL.md）
2b. CHAT.md 只增（Edit 拦；Write 前缀追加校验，首建放行）
3. notes 机械门：文件夹名正则、三态闭集、proposal 头部格式、archived 拒改写
4. AGENTS.md 预算：根 <256 行、子树 <128 行
5. history.json schema+追加性校验（影子账本已退役，防篡改兜底=git tag）
6. postmortem 冻结（旧项目 docs/postmortem/ 兼容保护，新项目无此目录规则休眠）
