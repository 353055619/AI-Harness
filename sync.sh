#!/usr/bin/env bash
# 将 ~/.agents 镜像到本仓库并推送到 GitHub。
# 首次运行会自动通过 gh 在 GitHub 创建公开仓库 AI-Harness。
# 用法：./sync.sh
set -euo pipefail

SRC="${AGENTS_HOME:-$HOME/.agents}"
REPO_NAME="AI-Harness"
BRANCH="main"

cd "$(dirname "$0")"

if [ ! -d "$SRC" ]; then
  echo "错误：源目录 $SRC 不存在" >&2
  exit 1
fi

# 1. 镜像同步（精确镜像：源目录已删除的文件在本仓库同步删除）
rsync -a --delete --exclude '.DS_Store' "$SRC/skills/"  skills/
rsync -a --delete --exclude '.DS_Store' "$SRC/plugins/" plugins/
# .tools-update/ 是本地更新备份与运行状态，不纳入镜像

# 2. 首次运行：初始化 git 仓库
if [ ! -e .git ]; then
  git init -b "$BRANCH"
fi

# 3. 首次运行：关联远程；GitHub 上无此仓库时用 gh 创建（私有）
if ! git remote get-url origin >/dev/null 2>&1; then
  GH_USER="$(gh api user --jq .login)"
  if ! gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
    gh repo create "$REPO_NAME" --public \
      --description "Mirror of ~/.agents — AI agent skills & plugins" >/dev/null
    echo "已创建私有仓库 $GH_USER/$REPO_NAME"
  fi
  git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
fi

# 4. 提交并推送
git add -A
if git diff --cached --quiet; then
  echo "无变更，跳过提交"
else
  git commit -m "sync: mirror ~/.agents @ $(date '+%Y-%m-%d %H:%M:%S')"
fi
git push -u origin "$BRANCH"
echo "同步完成 → $(git remote get-url origin)"
