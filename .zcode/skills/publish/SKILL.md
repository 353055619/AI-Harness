---
name: publish
description: AI-Harness 仓库专用发布技能：开发完成后将 skills/ 与 plugins/ 安装到 ~/.agents、提交推送到 GitHub，并让变更插件在 ZCode 侧生效（已装的 update，新装的 install 再 enable）。Use whenever the user asks to 发布 / publish / 上线 / 安装到 ~/.agents / 推送到 GitHub，且当前工作区是 AI-Harness 仓库。其他仓库不适用。
---

# publish：发布 AI-Harness（安装到 ~/.agents + 推送 GitHub + 插件生效）

本技能与 AI-Harness 仓库强绑定。安装/提交/推送机制的**唯一来源是仓库根目录的 `sync.sh`**，本技能负责：发布前差异检查 → 调用脚本 → 插件在 ZCode 侧生效 → 验证汇报。不要复刻或绕过 `sync.sh` 的逻辑。

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
   - 无 `>f` 输出且 `git status --porcelain` 为空 → 无任何变更，告知用户后结束。
   - 有 `>f` 输出，且这些文件正是本次开发的改动（git status 能对上）→ 正常发布，继续。
   - 有 `>f` 输出但 `git status --porcelain` 为空（仓库干净却存在差异）→ 差异来自 `~/.agents` 侧。**停下**，逐项列出差异，问用户：`./sync.sh pull` 回收入库，还是直接覆盖发布。未答复不继续。

3. **发布**：
   1. 先记录本次变更的插件清单（`sync.sh` 提交后 git status 就清空了，事后拿不到）：
      ```sh
      git status --porcelain plugins/ | cut -c4- | cut -d/ -f2 | sort -u
      ```
      只保留真实插件目录（含 `.zcode-plugin/plugin.json` 或 `.claude-plugin/plugin.json`），过滤掉 `marketplace.json` 这类文件名。
   2. 运行 `./sync.sh`（安装到 `~/.agents` → 自动提交 → 推送 `main`）。

4. **插件生效**——仅当第 3 步有变更插件时执行，否则跳到第 5 步。
   `sync.sh` 只更新了市场源 `~/.agents/plugins`；本地目录市场源会自动刷新，但 ZCode 的运行缓存（`~/.zcode/cli/plugins/cache/`）**不跟随源**，必须显式操作才真正生效：

   ```sh
   MARKET=$(python3 -c "import json;print(json.load(open('$HOME/.agents/plugins/marketplace.json'))['name'])")
   zcode plugins list   # 已装集合，每行格式：- <name>@<market> [enabled|disabled]
   ```

   对每个变更插件二选一：
   - 已在 `zcode plugins list` 输出中 → `zcode plugins update <name>@$MARKET`（重物化缓存到新版本）
   - 不在列表中 → 先 `zcode plugins install <name>@$MARKET`，**再** `zcode plugins enable <name>@$MARKET`。装 ≠ 启用：漏掉 enable 的插件默认 disabled，技能不加载。前提：新插件已在 `marketplace.json` 注册条目（source 指向其目录），否则市场里找不到它。

   技能（skills/ 下）无需此步：装到 `~/.agents/skills` 后新开会话自动生效。

5. **验证汇报**：
   - `sync.sh` 输出需含「安装并推送完成」；取提交哈希与远程 URL 一并汇报。
   - 插件生效：逐个报告 update / install+enable 的执行结果，可用 `zcode plugins list | grep <name>` 复核状态为 enabled。
   - 任何一步失败则原样报告失败原因与已完成的步骤，不得宣称完成。

## 边界

- 只发布，不开发、不修改仓库内容；发现未完成的工作交回用户。
- `./sync.sh pull` 仅在第 2 步用户明确选择回收时调用。
