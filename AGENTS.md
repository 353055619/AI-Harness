# AI-Harness

本仓库是 `~/.agents`（本地 AI Agent 技能与插件库）内容的**主开发仓库与唯一来源**：技能/插件在本仓库开发，完成后安装到 `~/.agents`，并提交到 GitHub（远程：`353055619/AI-Harness`，公开）。

## 目录结构

- `skills/` — 技能源码（12 个：xiaohongshu-search、tiktok-search-videos、tools-update 等）
- `plugins/` — 插件源码（9 个，与 `marketplace.json` 注册表一一对应）
- `sync.sh` — 一键「安装到 `~/.agents` + 提交推送 GitHub」的脚本
- `.zcode/skills/publish/` — 本项目专用技能 `/publish`（发布前差异检查 → `sync.sh` → 插件生效 update/install+enable → 验证汇报），随仓库版本化，不安装到 `~/.agents`
- 本地工作目录（`.gitignore` 已排除，不提交 GitHub）：`reference/`（调研 survey 报告 + `mirrors/` 上游参考仓库镜像，索引见 `reference/AGENTS.md`）、`delivery/`（日期命名的交付面板 JSON/HTML）、`.agents/`（本地交付说明 `DELIVERY.md`）
- `~/.agents/.tools-update/`（更新备份与运行状态，16MB）不在本仓库管理范围

## 工作流：开发 → 安装 → 推送

技能/插件在本仓库开发，完成后说「发布」或调用 `/publish`（自动执行下方全流程），等价于手动运行 `./sync.sh`，脚本依次执行：

1. `rsync -a --delete` 将本仓库 `skills/`、`plugins/` 安装到 `~/.agents/`（本仓库删除的文件同步从 `~/.agents` 移除）
2. 首次运行自动 `git init` 并通过 `gh` 关联/创建公开仓库
3. 自动提交（消息格式 `sync: install to ~/.agents @ 时间`）并推送 `main`

特殊场景：`~/.agents` 侧通过 tools-update 更新了 vendored 技能（如 browser-act）需要回收入库时，运行 `./sync.sh pull`（反向镜像 + 提交推送）。

前置条件：本地 SSH 密钥可连 GitHub（`ssh -T git@github.com` 验证，日常推送认证用）；`gh` 已登录（`gh auth status` 验证，仅首次建仓需要）；`rsync` 可用（macOS 自带）。

## 编辑规则

- **本仓库为唯一来源**：技能/插件的修改一律在本仓库进行，改完运行 `./sync.sh` 安装到 `~/.agents`。直接改 `~/.agents` 的改动会在下次安装时被覆盖。
- 根目录文件（`sync.sh`、`AGENTS.md`、`.gitignore`、`.zcodeignore`）在本仓库维护，不参与 rsync。
- `~/.agents/.tools-update/` 会直接更新 `~/.agents/skills/` 下的 vendored 技能；更新后先 `./sync.sh pull` 回收，否则下次安装会被本仓库版本覆盖。

## 已知事项

- 仓库总量约 95MB / 近 5000 文件（git 跟踪口径，2026-10-27 video 系退役后），主要是各插件的 `showcase.gif`（最大 5.6MB），远低于 GitHub 限制，无需 LFS。
- 技能/插件目录普遍为 `SKILL.md`（技能定义）+ `scripts/`/`references/`（实现与参考）；vendored 技能另带 `.origin.json`（上游来源标记）。
- 远程用 SSH 地址（`git@github.com:353055619/AI-Harness.git`），git 推拉走本地 SSH 密钥认证，不读 `gh` 令牌/钥匙串；`gh` 仅在首次运行建仓时调用（创建仓库只能走 GitHub API，SSH 做不到）。
