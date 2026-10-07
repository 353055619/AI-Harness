/* godw-loop-round — godw 永续循环自跑 workflow（godw-loop 插件随包分发）
 *
 * 用法（在 godw-loop 项目根）：
 *   1) godw-loop-init 收尾已用 SaveWorkflow 把本文件注册进项目 .zcode/workflows/
 *      （插件清单无 workflows 组件，随包文件不会被 ZCode 自动注册——注册是 init 显式步骤）
 *   2) CreateWorkflow saved: { name: "godw-loop-round", args: { rounds: 4 } }
 *   3) 停止：项目 .agents/ 下建 LOOP-PAUSE 文件，本轮收口后自动停
 * 分发口径：本文件是唯一自动化编排（cron 兜底也调它；技能链仅最后手段）。
 * 依赖：项目已过 godw-loop-init（GOAL 定稿+账本初建+workflow 注册）；godw-loop/godw-toolkit/godw-finder 三插件已装。
 */
interface StageOutcome {
  /** 本段一句话结论（做了什么/为什么没做）。 */
  summary: string;
  /** 本段是否正常完成。 */
  ok: boolean;
}

interface RoundOutcome {
  /** 1 起的轮号。 */
  round: number;
  /** 本轮处理的主题文件夹名（如 20261008-修复登录）；空转轮为 "noop"。 */
  topic: string;
  /** done | rejected | noop | blocked。 */
  outcome: string;
  /** postmortem 评分（0-10）；无评审轮为 null。 */
  score: number | null;
}

const MAX_ROUNDS = 8;
const roundsArg = args.rounds;
const maxRounds = Math.min(MAX_ROUNDS, Number(roundsArg) > 0 ? Number(roundsArg) : 4);

artifact.metrics("loop", {
  title: "循环仪表",
  metrics: [
    { field: "round", label: "轮" },
    { field: "topic", label: "主题" },
    { field: "outcome", label: "结果" },
    { field: "score", label: "评分" },
  ],
});

const BAN = "铁律（必须遵守）：不写 workspace/human/；不改 .agents/GOAL.md；CHAT.md 只增（前缀追加）；"
  + "notes/ 文件内容禁经 Bash 写入（mv/rm 仅限状态转移）；删除先进 .trash；"
  + "宣称完成必须有当场验证过的输出；报告只写实际跑过的命令。";

const outcomes: RoundOutcome[] = [];

for (let round = 1; round <= maxRounds; round += 1) {
  phase("检查项目状态并产出提案");
  const starter = agent(`第${round}轮提案官`, {
    system: "你是 godw-loop 循环的第一段执行者（godw-loop-start 职责）。按项目 .agents/AGENTS.md 与循环契约办事；"
      + "无人值守：自主定稿提案（From: Agent），待确认点追加 CHAT.md（From: Agent）。" + BAN,
  });
  const start = await starter.ask<StageOutcome>(
    "执行 godw-loop-start 段：1) 门禁（结构合 godw-loop-init 预设、GOAL.md 两章完整；"
    + "不合则 ok=false 并在 summary 说明走哪个前置技能后停止）；"
    + "2) 最优先消化 CHAT.md 增量（用户指示/答复，问答不阻塞按默认先执行）；"
    + "3) 必读 GOAL.md/history.json/archived 明细/TRAP.md/reference 索引；"
    + "4) 调用 godw-finder 技能汲取外部信息（无人可问时按其无人值守分支）；"
    + "5) 查重后写 .agents/notes/proposed/<YYYYMMDD-主题>/proposal.md"
    + "（头四行：# Agent Note: 标题 / 空行 / Type: 六类 / From: Agent|Human；骨架 Background/Problem/Proposal/"
    + "Alternatives considered/Acceptance criteria/Risks，中文）。返回 summary 与 ok。",
  );
  if (!start.ok) {
    outcomes.push({ round, topic: "gate-stop", outcome: "noop", score: null });
    report({ round, topic: "gate-stop", outcome: "noop", score: null }, "loop");
    break;
  }

  phase("派发执行：选最早提案并实现");
  const runner = agent(`第${round}轮执行官`, {
    system: "你是 godw-loop 循环的第二段执行者（godw-loop-run 职责）。" + BAN,
  });
  const run = await runner.ask<StageOutcome & { topic: string }>(
    "执行 godw-loop-run 段：1) changes/ 有遗留（读 BLOCKED，连续 2 轮无进展强制 reject）先续跑；"
    + "2) 否则 FIFO 取 proposed/ 最早一份（From: Human 优先）；决策 implement（整夹移 changes/）或 "
    + "reject（写 reject.md 移 archived/，Human 提案须追加 CHAT.md 提请知悉）；"
    + "3) implement：生成 changes/<主题>/plan.md（目标→目标形态→文件清单→执行顺序→边界），按计划执行，"
    + "产物落 changes/<主题>/，遇坑记 TRAP.md；4) AC 全过返回 ok=true；做不完写 BLOCKED 返回 ok=true 但 "
    + "summary 注明 blocked；5) 空队列=本轮 noop。返回 summary/ok/topic（主题文件夹名或 noop）。",
  );

  phase("并行收口：评审、交付与台账");
  const [postmortem, delivery, docs] = await Promise.all([
    agent(`第${round}轮评审官`, {
      system: "你是 godw-loop-postmortem 执行者：敌意评审，宁低勿高，只批评不修复，无证据不采自述。" + BAN,
    }).ask<StageOutcome & { score: number | null }>(
      "评审本轮 changes/ 成果：只读 GOAL.md/changes/<主题> 全部/history.json/TRAP.md；"
      + "AC 逐条核验（证据在哪）；单分 0-10（锚=GOAL 第二章整体达成+AC 达成），"
      + "与 history 最近 5 个 done 均值比较（<均值−0.5=显著退步，建议回滚）；"
      + "每条发现四要素（缺陷/位置/影响/证据），blocker 与建议分开；"
      + "落盘 changes/<主题>/postmortem.md（只写这一个文件，末行 Score: <n>；noop 轮写'本轮无评审'）。"
      + "返回 summary/ok/score。",
    ),
    agent(`第${round}轮交付官`, {
      system: "你是 godw-report 执行者：滚动重生成交付物。" + BAN,
    }).ask<StageOutcome>(
      "按项目 GOAL 第二章交付形式滚动重生成 delivery/ 与 .agents/DELIVERY.md（有交付物时），"
      + "并每轮必更 .agents/status.html（队列/在途/卡点/近5分/TRAP 计数一页看板，全离线单文件，"
      + "过 impeccable detect 门留 JSON 证据）。noop 轮只更 status.html。返回 summary/ok。",
    ),
    agent(`第${round}轮台账官`, {
      system: "你是 godw-loop-doc 执行者：只维护台账，不碰 GOAL/postmortem/delivery/proposal/plan。" + BAN,
    }).ask<StageOutcome>(
      "维护台账：1) history.json 整文件 Write 追加本轮条目（id/type/from/outcome/score/summary/archived，"
      + "noop 轮记 noop；只追加不改旧条）；2) AGENTS.md 增量维护（事实变了就地更新，根<256 行/子树<128 行）；"
      + "3) CHAT.md ack 消化记录（只增追加，ack=游标，不改旧条目）；4) TRAP.md 同因合并。返回 summary/ok。",
    ),
  ]);

  const outcome: RoundOutcome = {
    round,
    topic: run.topic,
    outcome: run.summary.includes("blocked") ? "blocked"
      : run.topic === "noop" ? "noop"
      : postmortem.summary.includes("显著退步") ? "rejected" : "done",
    score: postmortem.score,
  };
  outcomes.push(outcome);
  report(outcome, "loop");
  log(`第 ${round} 轮收口：${outcome.topic} → ${outcome.outcome}（评分 ${outcome.score ?? "无"}）`);

  const pause = await files.glob(".agents/LOOP-PAUSE");
  if (pause.length > 0) {
    log("检测到 .agents/LOOP-PAUSE，本轮收口后停止（删除该文件后重跑本 workflow 续循环）。");
    break;
  }
}

phase("汇总循环结果");
const done = outcomes.filter((o) => o.outcome === "done").length;
const rejected = outcomes.filter((o) => o.outcome === "rejected").length;
await artifact.markdown(
  "rounds",
  [
    "# godw-loop-round 运行摘要",
    "",
    `- 轮数：${outcomes.length}（done ${done} / rejected ${rejected} / 其他 ${outcomes.length - done - rejected}）`,
    ...outcomes.map((o) => `- 第${o.round}轮：${o.topic} → ${o.outcome}${o.score === null ? "" : `（${o.score} 分）`}`),
    "",
    "明细见项目 .agents/status.html 与 history.json。",
  ].join("\n"),
  { title: "循环运行摘要", description: `${outcomes.length} 轮的逐轮结果`, primary: true },
);

return {
  conclusion: `本次运行 ${outcomes.length} 轮：done ${done}、rejected ${rejected}。停止后可用 CreateWorkflow(saved) 续跑。`,
  findings: outcomes.map((o) => ({
    where: `round-${o.round}`,
    what: `${o.topic} → ${o.outcome}`,
    evidence: `score=${o.score ?? "无"}`,
    status: "verified" as const,
    severity: "low" as const,
  })),
  verified: ["每轮 postmortem/report/doc 三子代理并行收口并落盘"],
  notCovered: ["本轮未跑外部测试套件（项目自定验收在 plan/AC 内由执行官自检）"],
};
