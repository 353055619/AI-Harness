---
name: publish
description: AI-Harness 仓库专用发布技能：开发完成后将 skills/ 与 plugins/ 安装到 ~/.agents 并提交推送到 GitHub。Use whenever the user asks to 发布 / publish / 上线 / 安装到 ~/.agents / 推送到 GitHub，且当前工作区是 AI-Harness 仓库。其他仓库不适用。
---

# publish：发布 AI-Harness（安装到 ~/.agents + 推送 GitHub）

本技能与 AI-Harness 仓库强绑定。安装/提交/推送机制的**唯一来源是仓库根目录的 `sync.sh`**，本技能只做三件事：发布前差异检查 → 调用脚本 → 验证汇报。不要在技能里复刻或绕过 `sync.sh` 的逻辑。

## 执行步骤

1. **定位仓库**：确认当前目录是 AI-Harness 仓库（标志：根目录存在 `sync.sh`）。不是则停止，告知用户本技能仅限该仓库。

2. **发布前差异检查**——防止覆盖 `~/.agents` 侧的改动（通常是 tools-update 更新过 vendored 技能）：

   ```sh
   rsync -a --delete --dry-run --itemize-changes --exclude '.DS_Store' \
     ~/.agents/skills/  ./skills/
   rsync -a --delete --itemize-changes --dry-run --exclude '.DS_Store' \
     ~/.agents/plugins/ ./plugins/
   ```

   判读（`*deleting` 开头的是仓库新增文件，属正常开发产物，忽略）：
   - 无 `<f` 输出且 `git status --porcelain` 为空 → 无任何变更，告知用户后结束。
   - 有 `<f` 输出，且这些文件正是本次开发的改动（git status 能对上）→ 正常发布，继续。
   - 有 `<f` 输出但 `git status --porcelain` 为空（仓库干净却存在差异）→ 差异来自 `~/.agents` 侧。**停下**，逐项列出差异，问用户：`./sync.sh pull` 回收入库，还是直接覆盖发布。未答复不继续。

3. **发布**：在仓库根目录运行 `./sync.sh`（安装到 `~/.agents` → 自动提交 → 推送 `main`）。

4. **验证汇报**：输出需含「安装并推送完成」；从输出中取提交哈希与远程 URL 一并汇报。任何一步失败则原样报告失败原因与已完成的步骤，不得宣称完成。

## 边界

- 只发布，不开发、不修改仓库内容；发现未完成的工作交回用户。
- `./sync.sh pull` 仅在第 2 步用户明确选择回收时调用。
