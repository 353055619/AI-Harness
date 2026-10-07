# godw-session-init 设计笔记（2026-10-07 前名 godw-init）

> 运行时不加载，仅供打磨时参考。

## 打磨的铁律（来自用户 2026-10-01 的反馈）

1. 用户已有的概念每条只写一行：**无歧义则不解释**。禁止把高信心密度的一句话稀释成说明书。
2. 调研互联网的目的是**补充新准则**，不是扩写已有准则。
3. Claude Code 官方最佳实践印证此点："Keep CLAUDE.md short — bloated files cause the model to ignore your actual instructions."（文件臃肿 → 指令被忽略）。
4. 契约正文不出现元信息：不加"核心/补充准则"这类分类标签，规则就是一张扁平清单。

## 结构

- 一张扁平清单（当前 12 条）：用户原话概念 + 用户新增 + 调研所得，按任务生命周期排序（澄清→执行→呈现→汇报）。
- 第 4、5 条分工：第 4 条管呈现的语气与密度，第 5 条管内容取舍与附件机制（同名文件夹 + 可点击索引），原第 3 条中"补充材料新建文件夹作附件"的粗粒度表述已并入第 5 条，避免两条规则打架。

## 补充准则来源

| # | 准则 | 来源 |
|---|---|---|
| 4 | 先看再做 | Claude Code 官方最佳实践（explore first, then plan, then code） |
| 5 | 先查后问 | superpowers brainstorming（先利用上下文，缺口径才问人） |
| 6 | 裁决不搁浅 | superpowers executing-plans（Rulings, not stalls；连续执行不打扰） |
| 7 | 根因优先 | superpowers systematic-debugging（no fixes without root cause）+ 最佳实践（root causes not symptoms；course correct early） |
| 8 | 完成即停 | 通用 scope-guard；与最佳实践"小任务跳过流程"的比例原则同源 |
| 9 | 证据先于宣称 | superpowers verification-before-completion（evidence before claims）+ 最佳实践（show evidence rather than asserting success） |
| 10 | 如实汇报 | 代理汇报诚实性通则（报告未粉饰的原始结果） |

## 已否决的写法（勿再犯）

- 给用户的原话加"操作化定义"、正反例句、比例原则、逃生口——全部删除（v2 犯的错）。
- 加载行为只保留一行确认，不复述条款。
- description 写成 pushy 自动触发——契约只由用户显式调用。

## 第二轮调研发现（2026-10-01，优化空间评估）

| 发现 | 来源 | 含义 |
|---|---|---|
| "指令诅咒"：规则越多，单条遵守率越低 | dev.to《500 行规则》+ Towards AI 模块化指令集 | 12 条已到实用上限；今后新增必须合并/替换，禁止追加 |
| 模型对文件开头权重更高 | dev.to 前置法 | 可选：把用户最在意的呈现类条款（4、5）提到最前，代价是放弃生命周期排序 |
| 反复被违反的规则要靠机制（hook）而非语气强制 | dev.to 核心结论 | 见下方"自动生效" |
| ZCode 支持 SessionStart hook，可向会话注入 additionalContext | 本机 zcode-guide·diagnosing-hooks | 契约可免输入自动生效 |
| ZCode 有用户级 ~/.zcode/AGENTS.md，每个工作区自动加载 | 本机 zcode-guide·configuration-guide | 契约可常驻自动加载（零机制，但无法按次关闭） |
| 3P 汇报结构（Progress/Plans/Problems） | anthropics/skills·internal-comms | 汇报文档的可选骨架，适合做零成本 asset 模板 |
| agentskills.io 规范校验 | agentskills.io/specification | 现 frontmatter 完全合规，无需改动 |

### 自动生效的三个档位（待用户拍板）

- A 手动（现状）：输入 /godw-session-init 才加载，按需可控。
- B SessionStart hook：matcher 命中 `startup` 时把契约全文作为 additionalContext 注入——每个新 session 自动生效，仍保留技能文件做单一事实源。
- C ~/.zcode/AGENTS.md：契约全文放用户级指令文件——零机制常驻，但所有工作区永远加载、无法按次关闭，且多台机器需各配一份。

### 可选合并瘦身（12 → 10）

已实施（v5）：合并 2+8 为"自主推进"、11+12 为"诚实交付"。

## 用户裁决记录（2026-10-01）

- 自动生效（A/B/C 档）：**不采用**——技能要转移到其他机器，hook 配置是机器绑定的，技能文件夹本身才是可携带单元；保持手动 /godw-session-init。
- 合并瘦身：**采用**，见 v5。
- 前置排序：不采用。
- 3P 汇报模板 asset：**搁置**，汇报类技能之后单独立项。

## 打磨日志

- **v6（2026-10-01）**：新增第 8 条"不重复造轮子"（godw 提出：AI 时代重复开发严重）。契约载原则，深度方法在 godw-research 技能（交付流水线中 clarify 后、design 前调用）。
- **v5（2026-10-01）**：标题"godw 工作契约"→"本 session 工作契约"，首行去掉与标题重复的"约束本 session 全部任务"；合并自由执行+裁决不搁浅为"自主推进"、证据先于宣称+如实汇报为"诚实交付"，12 条 → 10 条。

- **v4（2026-10-01）**：按用户反馈新增两条并重排——①自由执行模式（用户离开场景，说"自由执行/不要问我"后不再询问、自主裁决到底）；②文档只答所问（修改即覆盖、正文 99% 相关、附件放同名文件夹且正文留可点击链接）。去掉"核心/补充准则"元标签，扁平化为 12 条。
- **v3（2026-10-01）**：按用户反馈重写。核心三条还原为近原话单行；新增补充准则 4–10（每条一行）；正文从 40 行减至 15 行。
- **v2（2026-10-01，已废弃）**：将用户三条扩写为 40 行带解释版本——被用户否决，教训见上。
