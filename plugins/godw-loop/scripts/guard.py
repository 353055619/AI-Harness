#!/usr/bin/env python3
"""godw-loop 关键控制节点守卫（v5：GOAL 首建放行 + CHAT.md 只增门）。

用法：guard.py <pre|state>，工具调用 JSON 由 stdin 传入。
exit 2 = 拦截/报错（stderr 反馈给模型）；exit 0 = 放行。

pre 规则（PreToolUse Write|Edit）：
  1) workspace/human/ 写锁：.agents/automation-id.txt 在场（cron 兜底循环运行）即拦
  2) GOAL.md 定稿锁（v5 语义：存在即冻结，首建放行）：docs/GOAL.md（历史位）与
     .agents/GOAL.md 文件不存在时放行首建（godw-goal 澄清收口后一次写全两章=定稿）；
     存在即拦——改目标=用户手动编辑（带外）
  2b) CHAT.md 只增门：.agents/CHAT.md（用户↔agent 唯一异步接口）——Edit 一律拦；
     Write 须前缀追加（新内容含盘上全部旧内容），首建放行
  3) notes 机械门（.agents/notes/ 一题一文件夹）：
     - 状态目录闭集 {proposed,changes,archived}，其余顶层路径拦
     - 文件必须住在 <YYYYMMDD-主题> 文件夹内（状态目录下直接放文件拦）
     - proposal.md 头部机械校验（仅 Write 新建时）：`# Agent Note: ` + Type/From 行，
       六类闭集、From ∈ {Agent,Human}；出现 Status: 行拦（防旧格式回流）
     - changes/<主题>/proposal.md 拒改（派发后锁定参照；修订走新提案）
     - archived/ 拒一切 Write/Edit（终态冻结；转移用 mv，属 run/complete 合法动作）
  4) AGENTS.md 预算门：根 <256 行、子树（含 reference/AGENTS.md）<128 行；
     Write 按新内容行数判，Edit 按现文件行数+增减量估判；超限拦并提示三步
     （先搬家→再压缩→最后提额，理由记当轮 postmortem.md）
  5) postmortem 冻结（旧项目兼容）：docs/postmortem/ 与 .agents/postmortem/
     既有文件拦截、新增放行；新项目无此目录规则休眠
state 规则（PostToolUse Write）：history.json 双 schema 校验（影子账本已退役）：
  - 新 schema {"topics":[...]}：条目字段合法（id/type/from/outcome/score 0-10 或 null）
    且**对写前盘上旧文件做前缀追加校验**（旧条目不得改写/截断；Edit 方式改
    history.json 一律拦——只允许整文件 Write 追加）
  - 旧 schema {"rounds":[...]}（存量项目兼容）：round 单调、score 0-10、前缀追加

继承 godw-toolkit guard round1-14 与 structv2 全部加固：根攀爬 nearest-wins+
标记双认（state.json/history.json/notes 目录）+形状判别、名义+物理双路径、
casefold、symlink/NUL/HOME 防误判、悬挂解锁兜底（历史行为，定稿制下不再产生）。
已知边界（如实）：hook 仅拦主会话（子 agent 靠派发 prompt 带禁令补偿）；仅罩
Write|Edit（Bash 绕行靠契约 Bash 禁令+评审抽查）；Edit 的行数与头部校验为
估算/跳过（机械门主战场是 Write，评审兜 Edit 面）。
"""
import json
import os
import re
import sys

_warned = False

NOTES_STATES = ("proposed", "changes", "archived")
NOTE_TYPES = ("feature", "bug-fix", "simplification", "architecture", "process", "testing")
NOTE_FROM = ("Agent", "Human")
ROOT_AGENTS_MAX = 256
SUBTREE_AGENTS_MAX = 128


def read_stdin_json():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def target_path(tool_input):
    for key in ("file_path", "path", "filePath", "notebook_path"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def warn_once(message):
    global _warned
    if not _warned:
        _warned = True
        sys.stderr.write("[godw-loop 守卫] " + message + "\n")


def has_project_shape(directory):
    return os.path.isdir(os.path.join(directory, "docs")) or \
        os.path.isdir(os.path.join(directory, "workspace"))


def _home_variants():
    home = os.path.expanduser("~")
    try:
        return (home, os.path.realpath(home))
    except (ValueError, OSError):
        return (home,)


def _is_home(directory):
    if directory in _home_variants():
        return True
    try:
        return os.path.realpath(directory) in _home_variants()
    except (ValueError, OSError):
        return False


def find_project_root(path):
    directory = os.path.dirname(path)
    while True:
        marker = os.path.join(directory, ".agents")
        state_file = os.path.join(marker, "state.json")
        ledger_file = os.path.join(marker, "history.json")
        notes_dir = os.path.join(marker, "notes")
        # v3：notes/ 目录亦是根标记（loop-init 建骨架时 history.json 尚未种子）
        marker_ok = os.path.isfile(state_file) or os.path.isfile(ledger_file) \
            or os.path.isdir(notes_dir)
        if os.path.isdir(marker):
            if marker_ok and has_project_shape(directory):
                return directory
            if has_project_shape(directory) and not marker_ok \
                    and not _is_home(directory):
                warn_once(
                    "项目标记不完整：.agents 在但 state.json/history.json/notes 缺失，"
                    "该项目守卫规则跳过：%s\n" % directory
                )
        elif os.path.isfile(marker):
            warn_once("发现损坏的 .agents 标记（是文件不是目录），该项目守卫规则跳过：%s\n" % marker)
        parent = os.path.dirname(directory)
        if parent == directory:
            break
        directory = parent
    parts = path.split(os.sep)
    for i in range(len(parts) - 2):
        if parts[i] == "projects" and parts[i + 1]:
            root = os.sep.join(parts[: i + 2])
            return root if os.path.isdir(os.path.join(root, ".agents")) else ""
    return ""


def block(message):
    sys.stderr.write("[godw-loop 守卫] " + message + "\n")
    sys.exit(2)


def _rel_under(path, directory):
    """path 位于 directory 内时返回相对段列表（大小写归一前不判），否则 None。"""
    try:
        rel = os.path.relpath(path, directory)
    except (ValueError, OSError):
        return None
    if rel == os.pardir or rel.startswith(os.pardir + os.sep):
        return None
    return rel.split(os.sep) if rel != "." else []


def rule_human(cf, root, agents):
    human_cf = os.path.join(root, "workspace", "human").casefold()
    if cf == human_cf or cf.startswith(human_cf + os.sep):
        if os.path.exists(os.path.join(agents, "automation-id.txt")):
            block(
                "workspace/human/ 是用户领地，循环运行期间上锁不可写。"
                "确需写入：先经用户暂停循环（删 automation-id.txt 与定时注册）。"
            )


def rule_goal(cf, root, path):
    goal_cf = (os.path.join(root, "docs", "GOAL.md").casefold(),
               os.path.join(root, ".agents", "GOAL.md").casefold())
    if cf in goal_cf:
        if not os.path.exists(path):
            return  # 首建即定稿：godw-goal 澄清收口后一次写全两章
        block(
            "GOAL.md 已定稿（一次定稿制，存在即冻结）：agent 不可写。"
            "确需修改：用户手动编辑（带外行为，godw-loop-start 下轮重读自然生效）。"
        )


def rule_chat(nominal, cf, root, tool_input, is_edit):
    chat_cf = os.path.join(root, ".agents", "CHAT.md").casefold()
    if cf != chat_cf:
        return
    if is_edit:
        block("CHAT.md 只增（前缀追加）：新条目走整文件 Write；Edit 方式拦截（同 history.json）。")
    content = tool_input.get("content")
    if not isinstance(content, str):
        warn_once("CHAT.md 写入缺 content，只增校验本次跳过\n")
        return
    try:
        with open(nominal, encoding="utf-8") as handle:
            old = handle.read()
    except OSError:
        return  # 首建放行
    if not content.startswith(old):
        block("CHAT.md 只增校验失败：新内容须包含现有全部内容（前缀追加，不改写不截断）。")


def _check_proposal_header(content):
    """仅 Write 新建时机械校验 proposal 头部；不合法即拦。"""
    lines = content.splitlines()
    if len(lines) < 4 or not lines[0].startswith("# Agent Note: ") or lines[1].strip():
        block("proposal.md 头部格式：第 1 行 `# Agent Note: <标题>`，第 2 行空行。")
    if not lines[2].startswith("Type: ") or lines[2][6:].strip() not in NOTE_TYPES:
        block("proposal.md 第 3 行须为 `Type: <%s>`（六类闭集）。" % "|".join(NOTE_TYPES))
    if not lines[3].startswith("From: ") or lines[3][6:].strip() not in NOTE_FROM:
        block("proposal.md 第 4 行须为 `From: Agent | Human`。")
    if any(line.startswith("Status:") for line in lines[:6]):
        block("proposal.md 头部不得含 Status: 行——状态只看目录（一题一文件夹单一事实源）。")


def rule_notes(nominal, cf, root, agents, tool_input, is_new_file):
    rel = _rel_under(nominal, os.path.join(agents, "notes"))
    rel_cf = _rel_under(cf, os.path.join(agents, "notes").casefold())
    rel = rel or rel_cf
    if not rel:
        return
    if len(rel) < 2:
        if rel[0] in NOTES_STATES:
            block("notes/%s/ 下文件必须住在 <YYYYMMDD-主题> 文件夹内（一题一文件夹）。" % rel[0])
        return
    state, topic = rel[0], rel[1]
    if state not in NOTES_STATES:
        block("notes/ 状态目录闭集 {proposed|changes|archived}，不得新建其他顶层目录：%s" % state)
    if not re.match(r"^\d{8}-.+$", topic):
        block("主题文件夹名须为 <YYYYMMDD-主题>（八位日期+主题），流转不改名：%s" % topic)
    fname = rel[-1] if len(rel) >= 3 else ""
    if state == "archived":
        block("notes/archived/ 终态冻结：既有内容拒改写。状态转移用 mv（run/complete 合法动作），内容修订走新提案。")
    if fname == "proposal.md":
        if state == "changes" and os.path.exists(nominal):
            block("changes/<主题>/proposal.md 已随派发锁定（只读参照）：修订走新提案或先 reject 再立。")
        if state == "proposed" and is_new_file:
            content = tool_input.get("content")
            if isinstance(content, str) and content:
                _check_proposal_header(content)


def _agents_md_lines(nominal, tool_input, is_new_file):
    """估算写入后的 AGENTS.md 行数：Write 用新内容；Edit 用现文件+增减量。"""
    content = tool_input.get("content")
    if isinstance(content, str) and is_new_file:
        return content.count("\n") + (0 if content.endswith("\n") or not content else 1)
    if isinstance(content, str) and not is_new_file:
        return content.count("\n") + (0 if content.endswith("\n") or not content else 1)
    new_s = tool_input.get("new_string")
    old_s = tool_input.get("old_string")
    if isinstance(new_s, str) and isinstance(old_s, str):
        try:
            with open(nominal, encoding="utf-8") as handle:
                current = handle.read()
            delta = new_s.count("\n") - old_s.count("\n")
            return current.count("\n") + delta
        except OSError:
            return None
    return None


def rule_agents_budget(nominal, root, tool_input, is_new_file):
    if os.path.basename(nominal).casefold() != "agents.md":
        return
    limit = ROOT_AGENTS_MAX if os.path.dirname(nominal) == root else SUBTREE_AGENTS_MAX
    where = "根" if limit == ROOT_AGENTS_MAX else "子树"
    lines = _agents_md_lines(nominal, tool_input, is_new_file)
    if lines is None:
        warn_once("AGENTS.md 行数无法估算（非 Write/Edit 常规形态），预算门本次跳过\n")
        return
    if lines >= limit:
        block(
            "%s AGENTS.md 预算超限：估算 %d 行 ≥ %d 行上限。超预算三步："
            "先搬家（挪到该在的层）→ 再压缩 → 最后提额（理由记当轮 postmortem.md）。"
            % (where, lines, limit)
        )


def rule_postmortem_legacy(cf, path, root, agents):
    for pm_dir in (os.path.join(root, "docs", "postmortem"), os.path.join(agents, "postmortem")):
        pm_cf = pm_dir.casefold()
        if (cf == pm_cf or cf.startswith(pm_cf + os.sep)) and os.path.exists(path):
            block("postmortem 冻结不改：既有编号文件不可编辑，新复盘用新序号。（新项目无此目录，坑账走 TRAP.md）")


def rule_pre(nominal, cf, root, tool_input, is_new_file, is_edit):
    agents = os.path.join(root, ".agents")
    rule_human(cf, root, agents)
    rule_goal(cf, root, nominal)
    rule_chat(nominal, cf, root, tool_input, is_edit)
    rule_notes(nominal, cf, root, agents, tool_input, is_new_file)
    rule_agents_budget(nominal, root, tool_input, is_new_file)
    rule_postmortem_legacy(cf, nominal, root, agents)


def _load_json_on_disk(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def _validate_topics(topics):
    if not isinstance(topics, list):
        block("history.json 缺 topics 数组（新 schema）。")
    for entry in topics:
        if not isinstance(entry, dict):
            block("history.json topics 条目须为对象。")
        if not isinstance(entry.get("id"), str) or not entry["id"]:
            block("history.json topics 条目缺合法 id。")
        if entry.get("outcome") not in ("done", "rejected", "noop"):
            block("history.json outcome 须为 done|rejected|noop。")
        score = entry.get("score")
        if score is not None and (not isinstance(score, (int, float))
                                  or isinstance(score, bool) or not (0 <= score <= 10)):
            block("history.json score 须为 0-10 数值或 null。")


def _prefix_append_check(old_topics, new_topics):
    if len(new_topics) < len(old_topics):
        block("history.json 追加性校验失败：条目数 %d 少于写前的 %d（只追加，不得截断）"
              % (len(new_topics), len(old_topics)))
    for i, old in enumerate(old_topics):
        if i < len(new_topics) and new_topics[i] != old:
            block("history.json 追加性校验失败：第 %d 条被改写（只追加台账）。" % (i + 1))


def rule_state(path, root):
    agents = os.path.join(root, ".agents")
    ledger = os.path.join(agents, "history.json")
    legacy = os.path.join(agents, "state.json")
    cf = path.casefold()
    if cf not in (ledger.casefold(), legacy.casefold()):
        return
    data = _load_json_on_disk(path)
    if data is None:
        block("%s 写后不是合法 JSON。请立即修复后重写。" % os.path.basename(path))
    if cf == ledger.casefold():
        if isinstance(data, dict) and isinstance(data.get("topics"), list):
            # 新 schema：字段合法 + 追加性（写前前缀校验已在 pre 腿完成）
            _validate_topics(data["topics"])
            return
        rounds = data.get("rounds") if isinstance(data, dict) else None
        if not isinstance(rounds, list) or not rounds:
            block("history.json 缺 topics（新 schema）或 rounds（旧 schema）数组。保持 schema 完整后重写。")
        for entry in rounds:
            sc = entry.get("score") if isinstance(entry, dict) else None
            if not isinstance(sc, (int, float)) or isinstance(sc, bool) or not (0 <= sc <= 10):
                block("history.json score 须为 0-10 数值: %r" % (sc,))
        rs = [e.get("round") for e in rounds if isinstance(e, dict)]
        if any(not isinstance(r, int) or isinstance(r, bool) for r in rs) \
                or any(rs[i] >= rs[i + 1] for i in range(len(rs) - 1)):
            block("history.json round 须为严格单调递增的整数")
    else:
        missing = [key for key in ("mode", "round", "scores") if key not in data]
        if missing:
            block("state.json 缺必填字段：%s。保持 schema 完整后重写。" % ",".join(missing))


def main():
    rule = sys.argv[1] if len(sys.argv) > 1 else ""
    payload = read_stdin_json()
    raw_tool_input = payload.get("tool_input") if isinstance(payload, dict) else None
    tool_input = raw_tool_input if isinstance(raw_tool_input, dict) else {}
    given = target_path(tool_input)
    if not given:
        return
    if "\x00" in given:
        warn_once("file_path 含 NUL 字节，本次守卫检查跳过\n")
        return
    try:
        nominal = os.path.abspath(given)
    except (ValueError, OSError):
        return
    physical = None
    try:
        physical = os.path.realpath(nominal)
    except (ValueError, OSError):
        pass
    is_edit = "old_string" in tool_input or "new_string" in tool_input
    is_new_file = not os.path.exists(nominal)
    ledger_edit_blocked = False
    for path in dict.fromkeys([nominal] + ([physical] if physical else [])):
        root = find_project_root(path)
        if not root:
            continue
        cf = path.casefold()
        if rule == "pre":
            # history.json 只许整文件 Write：Edit 一律拦（前缀校验需整文件对照）
            if cf == os.path.join(root, ".agents", "history.json").casefold() and is_edit:
                block("history.json 只允许整文件 Write 追加（godw-loop-doc 独占）；Edit 方式拦截。")
            if cf == os.path.join(root, ".agents", "history.json").casefold() and not is_edit:
                _history_pre_append(path, tool_input)
            rule_pre(path, cf, root, tool_input, is_new_file, is_edit)
        elif rule == "state":
            rule_state(path, root)


def _history_pre_append(path, tool_input):
    """写前前缀校验：盘上旧 topics 须为新内容的前缀（只追加）。"""
    content = tool_input.get("content")
    if not isinstance(content, str):
        return
    try:
        new_data = json.loads(content)
    except Exception as error:
        block("history.json 新内容不是合法 JSON（%s）。" % error)
    new_topics = new_data.get("topics") if isinstance(new_data, dict) else None
    if not isinstance(new_topics, list):
        return  # 旧 schema 或过渡态，写字段校验交给 state 腿
    old_data = _load_json_on_disk(path)
    if old_data is None:
        return  # 首建
    old_topics = old_data.get("topics") if isinstance(old_data, dict) else None
    if isinstance(old_topics, list):
        _prefix_append_check(old_topics, new_topics)
    _validate_topics(new_topics)


main()
