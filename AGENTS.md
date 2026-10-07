# AI-Harness

本仓库是 `~/.agents`（本地 AI Agent 技能与插件库）的 GitHub 镜像，由 `sync.sh` 单向同步并推送，不是开发项目。远程仓库：`353055619/AI-Harness`（公开）。

## 目录结构

- `skills/` — 镜像 `~/.agents/skills/`（约 12 个技能：xiaohongshu-search、tiktok-search-videos、algo-coach 等）
- `plugins/` — 镜像 `~/.agents/plugins/`（约 16 个插件 + `marketplace.json` 插件注册表）
- `sync.sh` — 一键同步并推送的脚本
- `~/.agents/.tools-update/`（更新备份与运行状态，16MB）刻意不纳入镜像

## 同步流程

运行 `./sync.sh`，脚本依次执行：

1. `rsync -a --delete` 精确镜像 `skills/` 与 `plugins/`（源端已删除的文件在镜像中同步删除）
2. 首次运行自动 `git init` 并通过 `gh` 创建私有仓库（仓库已存在则仅关联远程）
3. 自动提交（消息格式 `sync: mirror ~/.agents @ 时间`）并推送 `main`

前置条件：`gh` 已登录（`gh auth status` 验证）、`rsync` 可用（macOS 自带）。

## 编辑规则

- **单向镜像**：`skills/` 与 `plugins/` 的内容一律以 `~/.agents` 为准，在本仓库的直接改动会在下次同步时被覆盖。要改技能/插件，先改 `~/.agents` 再运行 `./sync.sh`。
- 根目录文件（`sync.sh`、`AGENTS.md`、`.gitignore`、`.zcodeignore`）不在 rsync 范围内，可直接编辑。
- 不要在 `skills/`、`plugins/` 内手放其他文件——`--delete` 会将其清除。

## 已知事项

- 仓库总量约 135MB / 5800+ 文件，主要是各插件的 `showcase.gif`（最大 6.5MB），远低于 GitHub 限制，无需 LFS。
- 提交全部由脚本生成，无需人工维护提交信息；也不需要在此仓库做 code review 类操作。
