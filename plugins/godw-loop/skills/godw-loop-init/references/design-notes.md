# godw-loop 设计注记（铁律、来源、演化史、同步）

## 演化史

- 2026-10-01：godw-deliver 六阶段 + 五层目录（deliver/clarify/research/design/report/package）。
- 2026-10-04：godw 拍板大合并——start/goal/pursue/report 四段制；循环改永续（无停机、评分降为防退化护栏）；workspace 分 human/agent；notes+postmortem 引入；评审独立子 agent。
- 2026-10-06：结构迁移 v2/v3（delivery 回根、journal 退役、notes 扁平三态、git 标配）；loop 引擎定官方积木版（Automations+Goal Mode，CLI 路线撤档）。
- 2026-10-07：**v3 大改版**（godw 拍板）——loop 系列独立成 godw-loop 插件；notes 一题一文件夹（proposed/changes/archived + 3P 文件组 proposal/plan/postmortem）；meta.json/index.json 裁撤（状态单一事实源=目录+文件存在性+proposal 头）；三段主循环 start→run→complete；proposal 并入 start；双 finder 并入新插件 godw-finder 代替 godw-search；GOAL 定稿制（update 退役）；guard 机械门扩 notes/预算/history；自循环 workflow 唯一自动化编排（hook 调起 rejected：拦截器非调度器）；BACKLOG/state.json/postmortem 目录/GOAL.history 等退役；AGENTS.md 体系改"至少两层+关键子树多层+机械预算"；status.html 每轮看板；TRAP.md 坑账。
- 2026-10-07：**planv2（首试用 AI-SoftwareDevelopment 暴露问题后拍板）**——初始化段重排：init 一次调用编排 goal 澄清定稿→/init→doc 初建账本→门禁+首 commit（goal 先行，账本初建即带真实口径；首轮缺位问题连根拔）；GOAL.md 写入通道修正为"首建放行、存在即冻结"（guard v5，原一律拦写与 init/goal 文本互斥致首步即断）；INSTRUCTION/QUESTIONS 合并为 CHAT.md（只增，用户↔agent 唯一异步接口，另一接口=直投 proposal）；start 无在场模式（移除用户讨论分支，默认无人值守）；workflow 注册机制修正：插件清单无 workflows 组件，随包文件不会被注册，init 收尾显式 SaveWorkflow 进项目 .zcode/workflows/。

## 铁律（全族）

1. 指令与状态分离：GOAL 首建后冻结（首建放行=goal 澄清后一次写全，存在即拦）；history/TRAP 每轮变；用户指示与答复走 CHAT.md。
2. 永续无停机：评分只做防退化护栏（单分 < 最近 5 个 done 均值 − 0.5 → 回滚该题），不设停机判定。
3. CHAT 不阻塞：问答按默认先执行，指示与答复每轮最优先消化（doc 收口 ack=游标）。
4. 评审独立：postmortem 新鲜上下文子智能体；派发子智能体 prompt 原样带禁令（hook 只拦主会话）。
5. human 区可读不可写；删除先进 .trash；notes/ 禁 Bash 写入。
6. 配额意识：一轮 ≤ 7 个子智能体（finder 4 + complete 3）。

## 来源

- notes 体系：deepseek-harness .agents/notes（README 权威口径：双轴路径、骨架强制、supersession、gate 机械校验；裁剪：单中文件、无 Status 行、文件夹化）
- 循环与状态：Anthropic《Effective Context Engineering》（NOTES.md、context rot）、ECC continuous-agent-loop、gan-style-harness
- 评审：doubt-driven-development、santa-method、adversarial-ux-test、dsh-code-review（四要素与"档案与实现同轮一致"手检）
- AGENTS.md 体系：agents.md 标准、ACM 328 实证、dsh docs/AGENTS.md（预算门与 slop 清单）
- 机械门：dsh verify-agent-note-format（校验点借鉴，guard.py 实现为 ZCode hook 通道）
- 检索记录：godw-plugin-optimization 仓 docs/plan.md 与 reference/

## 同步公司电脑

- 主通道：本仓（godw-plugin-optimization）git 推拉；workspace/agent/ 三插件开发区即源。
- 安装：install-plugin-file.sh 从开发区装至 ~/.agents/plugins/ + ZCode cache；ZCode UI 刷新插件 + 新会话生效。
- 定时自动化是工作区级配置不随文件走，换机重注册（cron 兜底通道才需要；主通道为自循环 workflow，随项目 .zcode/workflows/ 走）。
