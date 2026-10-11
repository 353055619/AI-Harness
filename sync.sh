#!/usr/bin/env bash
# AI-Harness 主开发仓库的一键安装+推送脚本。
# 默认：将本仓库的 skills/ 与 plugins/ 安装到 ~/.agents 并提交推送到 GitHub。
# pull 子命令：反向镜像（~/.agents → 本仓库），用于 tools-update 更新 vendored 技能后回收入库。
set -euo pipefail

DEST="${AGENTS_HOME:-$HOME/.agents}"
REPO_NAME="AI-Harness"
BRANCH="main"

cd "$(dirname "$0")"

if [ ! -d "$DEST" ]; then
  echo "错误：目标目录 $DEST 不存在" >&2
  exit 1
fi

ensure_remote() {
  # 首次运行：初始化 git 仓库并关联远程；GitHub 上无此仓库时用 gh 创建（公开）
  if [ ! -e .git ]; then
    git init -b "$BRANCH"
  fi
  if ! git remote get-url origin >/dev/null 2>&1; then
    GH_USER="$(gh api user --jq .login)"
    if ! gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
      gh repo create "$REPO_NAME" --public \
        --description "AI agent skills & plugins — main repo, installed to ~/.agents" >/dev/null
      echo "已创建公开仓库 $GH_USER/$REPO_NAME"
    fi
    git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
  fi
}

sync_commit_and_push() {
  git add -A
  if git diff --cached --quiet; then
    echo "无变更，跳过提交"
  else
    git commit -m "$1 @ $(date '+%Y-%m-%d %H:%M:%S')"
  fi
  git push -u origin "$BRANCH"
}

if [ "${1:-}" = "pull" ]; then
  # 反向：~/.agents → 本仓库（回收 tools-update 更新过的 vendored 技能）
  rsync -a --delete --exclude '.DS_Store' "$DEST/skills/"  skills/
  rsync -a --delete --exclude '.DS_Store' "$DEST/plugins/" plugins/
  ensure_remote
  sync_commit_and_push "pull: mirror ~/.agents"
  echo "已从 ~/.agents 回收到本仓库"
  exit 0
fi

# 1. 安装到 ~/.agents（精确镜像：本仓库删除的文件同步从 ~/.agents 移除）
rsync -a --delete --exclude '.DS_Store' skills/  "$DEST/skills/"
rsync -a --delete --exclude '.DS_Store' plugins/ "$DEST/plugins/"
# ~/.agents/.tools-update/ 是本地更新备份与运行状态，不在安装范围

# 2. 关联远程（首次运行自动建仓）
ensure_remote

# 3. 提交并推送
sync_commit_and_push "sync: install to ~/.agents"
echo "安装并推送完成 → $(git remote get-url origin)"
