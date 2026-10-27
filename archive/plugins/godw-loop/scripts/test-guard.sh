#!/usr/bin/env bash
# test-guard.sh — guard.py 规则回归测试（插件 AGENTS.md：guard.py 改动必须带新用例）
#
# 用法：bash scripts/test-guard.sh
# 机制：mktemp 造最小 loop 项目夹具，逐用例走 hook 真实通道调 guard.py
#       （pre=PreToolUse Write|Edit，state=PostToolUse Write，stdin JSON），
#       断言 exit 码（2=拦截 / 0=放行）与拦截理由关键词（防"拦错原因"的假绿）。
#       全绿 exit 0；任何 FAIL exit 1。
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
GUARD="$HERE/guard.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0

# ── 夹具项目：根标记(.agents/notes) + 形状目录(workspace/docs) + 各规则的既有文件 ──
PROJ="$TMP/proj"
mkdir -p "$PROJ/.agents/notes/proposed" \
         "$PROJ/.agents/notes/changes/20261018-样题" \
         "$PROJ/.agents/notes/archived" \
         "$PROJ/workspace/human" "$PROJ/workspace/agent" \
         "$PROJ/docs/postmortem" "$TMP/outside"
cat > "$PROJ/.agents/GOAL.md" <<'EOF'
# 原始目标

做个样例。

# 澄清目标

做样例项目。
EOF
printf '种子头\n' > "$PROJ/.agents/CHAT.md"
cat > "$PROJ/.agents/history.json" <<'EOF'
{"topics":[{"id":"t1","type":"feature","from":"Agent","outcome":"done","score":7.5,"summary":"种子","archived":"notes/archived/20261018-样题"}]}
EOF
printf '# 子树说明书\n' > "$PROJ/.agents/AGENTS.md"
printf '# 根说明书\n' > "$PROJ/AGENTS.md"
printf '锁定参照\n' > "$PROJ/.agents/notes/changes/20261018-样题/proposal.md"
printf '旧复盘\n' > "$PROJ/docs/postmortem/0001-旧题.md"
printf '人类文件\n' > "$PROJ/workspace/human/README.md"

# 无 GOAL/CHAT 的第二夹具（首建放行用例）
PROJ2="$TMP/proj2"
mkdir -p "$PROJ2/.agents/notes" "$PROJ2/workspace"

LONG_ROOT_OVER="$(python3 -c "print('x\n'*300, end='')")"
LONG_ROOT_UNDER="$(python3 -c "print('x\n'*10, end='')")"
LONG_SUB_OVER="$(python3 -c "print('x\n'*200, end='')")"

GOOD_PROPOSAL='# Agent Note: 测试提案

Type: feature
From: Agent

正文。
'
BAD_TYPE_PROPOSAL='# Agent Note: 测试提案

From: Agent

正文。
'
STATUS_PROPOSAL='# Agent Note: 测试提案

Type: feature
From: Agent
Status: proposed
'
CHAT_APPEND="$(cat "$PROJ/.agents/CHAT.md")
新增条目
"
HISTORY_APPEND='{"topics":[{"id":"t1","type":"feature","from":"Agent","outcome":"done","score":7.5,"summary":"种子","archived":"notes/archived/20261018-样题"},{"id":"t2","type":"bug-fix","from":"Human","outcome":"done","score":8,"summary":"追加","archived":"notes/archived/20261018-追加"}]}'
HISTORY_TRUNCATED='{"topics":[]}'
HISTORY_BAD_SCORE='{"topics":[{"id":"t1","type":"feature","from":"Agent","outcome":"done","score":11,"summary":"超界","archived":"notes/archived/x"}]}'

# run_case <block|allow> <拦截理由关键词，allow 留空> <pre|state> <file_path> [content] [old_string new_string] <用例名>
run_case() {
  local expect="$1" kw="$2" rule="$3" fpath="$4" content="${5-}" old="${6-}" new="${7-}" label="$8"
  python3 - "$rule" "$fpath" "$content" "$old" "$new" > "$TMP/payload.json" <<'PY'
import json, sys
_, rule, fpath, content, old, new = sys.argv
tool_input = {"file_path": fpath}
if content:
    tool_input["content"] = content
if old or new:
    tool_input["old_string"], tool_input["new_string"] = old, new
json.dump({"tool_input": tool_input}, sys.stdout)
PY
  local err rc ok=0
  err="$(python3 "$GUARD" "$rule" < "$TMP/payload.json" 2>&1 >/dev/null)"
  rc=$?
  if [ "$expect" = block ]; then
    [ "$rc" -eq 2 ] || ok=1
    if [ -n "$kw" ]; then
      case "$err" in *"$kw"*) ;; *) ok=1 ;; esac
    fi
  else
    [ "$rc" -eq 0 ] || ok=1
  fi
  if [ "$ok" -eq 0 ]; then
    PASS=$((PASS + 1))
    echo "PASS  $label"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL  $label  (期望=$expect rc=$rc stderr=$(printf %s "$err" | head -c 120))"
  fi
}

# ── pre：human 区写锁（v6：无条件拦 agent 写）──
run_case allow '' pre "$PROJ/workspace/agent/out.md" '产物' '' '' 'human 锁不误伤 agent 区'
run_case allow '' pre "$TMP/outside/x.md" '外部' '' '' '项目外路径放行'
run_case block 'human' pre "$PROJ/workspace/human/note.md" '越界' '' '' 'human/ 写入拦截'
run_case block 'human' pre "$PROJ/workspace/human/sub/a.md" '越界' '' '' 'human/ 子目录拦截'

# ── pre：GOAL 定稿锁（存在即冻结 / 首建放行）──
run_case block 'GOAL' pre "$PROJ/.agents/GOAL.md" '改目标' '' '' 'GOAL 已存在 Write 拦截'
run_case block 'GOAL' pre "$PROJ/.agents/GOAL.md" '' '旧' '新' 'GOAL 已存在 Edit 拦截'
run_case allow '' pre "$PROJ2/.agents/GOAL.md" '# 原始目标

新。

# 澄清目标

新。' '' '' 'GOAL 首建放行'

# ── pre：CHAT.md 只增 ──
run_case block 'CHAT' pre "$PROJ/.agents/CHAT.md" '' 'a' 'b' 'CHAT Edit 一律拦'
run_case block '只增' pre "$PROJ/.agents/CHAT.md" '篡改内容' '' '' 'CHAT Write 截断拦'
run_case allow '' pre "$PROJ/.agents/CHAT.md" "$CHAT_APPEND" '' '' 'CHAT 前缀追加放行'
run_case allow '' pre "$PROJ2/.agents/CHAT.md" '种子头
' '' '' 'CHAT 首建放行'

# ── pre：notes 机械门 ──
run_case block '闭集' pre "$PROJ/.agents/notes/todo/x.md" '内容' '' '' '状态目录闭集外拦截'
run_case block '文件夹名' pre "$PROJ/.agents/notes/proposed/note.md" '内容' '' '' '主题文件夹名正则拦截'
run_case block '终态冻结' pre "$PROJ/.agents/notes/archived/20260101-旧题/proposal.md" '改' '' '' 'archived 拒改写'
run_case block '锁定' pre "$PROJ/.agents/notes/changes/20261018-样题/proposal.md" '改' '' '' 'changes 派发后 proposal 锁定'
run_case block 'Type' pre "$PROJ/.agents/notes/proposed/20261018-新题/proposal.md" "$BAD_TYPE_PROPOSAL" '' '' 'proposal 头缺 Type 拦'
run_case block 'Status' pre "$PROJ/.agents/notes/proposed/20261018-新题/proposal.md" "$STATUS_PROPOSAL" '' '' 'proposal 头 Status 行拦'
run_case allow '' pre "$PROJ/.agents/notes/proposed/20261018-新题/proposal.md" "$GOOD_PROPOSAL" '' '' '合规 proposal 放行'

# ── pre：AGENTS.md 预算门 ──
run_case block '预算' pre "$PROJ/AGENTS.md" "$LONG_ROOT_OVER" '' '' '根 AGENTS 300 行拦'
run_case allow '' pre "$PROJ/AGENTS.md" "$LONG_ROOT_UNDER" '' '' '根 AGENTS 短内容放行'
run_case block '预算' pre "$PROJ/.agents/AGENTS.md" "$LONG_SUB_OVER" '' '' '子树 AGENTS 200 行拦'

# ── pre：postmortem 冻结（旧项目兼容）与 history.json 通道 ──
run_case block 'postmortem' pre "$PROJ/docs/postmortem/0001-旧题.md" '' 'a' 'b' '既有 postmortem Edit 拦'
run_case block '只允许' pre "$PROJ/.agents/history.json" '' 'a' 'b' 'history.json Edit 一律拦'
run_case block '追加' pre "$PROJ/.agents/history.json" "$HISTORY_TRUNCATED" '' '' 'history 截断旧条目拦'
run_case allow '' pre "$PROJ/.agents/history.json" "$HISTORY_APPEND" '' '' 'history 合规追加放行'

# ── state：PostToolUse Write 校验（直接改盘上文件后跑）──
run_case allow '' state "$PROJ/workspace/agent/out.md" '' '' '' 'state 无关文件放行'
printf '%s\n' "$HISTORY_APPEND" > "$PROJ/.agents/history.json"
run_case allow '' state "$PROJ/.agents/history.json" '' '' '' 'state 合规台账放行'
printf '%s\n' "$HISTORY_BAD_SCORE" > "$PROJ/.agents/history.json"
run_case block 'score' state "$PROJ/.agents/history.json" '' '' '' 'state score 越界拦'
printf '{}\n' > "$PROJ/.agents/state.json"
run_case block '必填' state "$PROJ/.agents/state.json" '' '' '' 'state 旧 schema 缺字段拦'

echo
echo "共 $((PASS + FAIL)) 用例：PASS $PASS / FAIL $FAIL"
[ "$FAIL" -eq 0 ]
