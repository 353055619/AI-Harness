---
name: godw-loop-init
description: godw-loop 项目开局（--create 新建 / --update 既有重构），必传工作目录与目标原文；建目录骨架 → godw-goal 澄清定稿（首建 GOAL.md）→ /init → godw-loop-doc 初建全部账本 → 门禁自检 + 注册自循环 workflow。目录全景与迁移映射见 references/pipeline.md。
---

# 项目开局 → <工作目录>/

两参必传（缺失则问用户，一次问齐）：

- **工作目录**：`my-project` 在当前目录下新建；`.` 即以当前目录展开
- **目标原文**：用户的一句话原话，一字不改作为 godw-goal 的澄清输入

## --create（默认）

1. 建工作目录 + git init + .gitignore（排除 .trash/.tmp/素材克隆）。
2. 按 references/pipeline.md 目录全景建**目录骨架**（notes 三态、reference/、delivery/、workspace/{human,agent}/、docs/、.tmp/.trash/）；只建目录，不建任何文件——全部文件延后到第 5 步信息完备时统一落，**本步不建任何 AGENTS.md**（/init 见 `.agents/AGENTS.md` 已存在会停）。
3. 调 **godw-goal**（输入：目标原文）：澄清收口后由它**首建** `.agents/GOAL.md`，两章一次写全（guard 对不存在的 GOAL.md 放行首建，存在即冻结）。
4. 调 **/init**：请用户在输入框运行（子 agent 无 TUI 斜杠通道时等效执行：勘察仓库→生成根 AGENTS.md，"File name must be exactly AGENTS.md"，已存在则增量编辑不重写）。此时 GOAL.md 已定稿，根 AGENTS.md 可挂真实链接。
5. 调 **godw-loop-doc**（初建模式）：一次性落全部预设账本——CHAT.md 种子、TRAP.md 表头、history.json 种子 `{"topics":[]}`、`.agents/AGENTS.md` 读写权与放置表、真差异化子树按需（规则见 references/agents-md-templates.md）。
6. **门禁自检**（机械清单）：目录全景齐全；预设文件全就位（CHAT/TRAP/history/GOAL 两章/AGENTS 体系）；AGENTS.md 预算内（根<256、子树<128 行）；GOAL 第一章为用户原话。
7. git 首 commit（GOAL.md 定稿入库，审计链闭环）。
8. **注册自循环 workflow**：读插件 `workflows/godw-loop-round.ts`，SaveWorkflow scope=project 存为 `godw-loop-round`——插件随包文件不会被 ZCode 自动注册（插件清单无 workflows 组件），必须显式注册进项目 `.zcode/workflows/` 才可见可跑。
9. 收尾提示两条启动路径（用户二选一）：`/godw-loop-start` 手动跑一轮；或 CreateWorkflow 运行已注册的 `godw-loop-round` 进自循环。

## --update（既有项目重构迁移）

同必传两参 → 既有内容按目录全景归位（挪 .trash 暂存不删；迁移映射见 references/pipeline.md；旧 QUESTIONS/INSTRUCTION 条目并入 CHAT.md）→ GOAL.md 缺失则调 godw-goal 首建（已存在即冻结不动）→ 调 /init（增量更新）→ godw-loop-doc 补建缺位账本 → 门禁自检 → 首 commit + workflow 注册（同第 7-8 步）。

## 完成门

门禁清单全过；git 首 commit 完成；workflow 已注册（SaveWorkflow project）。初始化阶段到此结束——此后用户仅经 CHAT.md 与直投 proposal 与循环交互。
