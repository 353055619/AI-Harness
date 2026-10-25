#!/usr/bin/env node
// godw-design 回归考题运行器（0.7.0）——「先考后上岗」：改评委 prompt/锚定卡/check 规则，发版前必跑。
// 两段式（node 不能自派 Agent 的诚实折衷）：
//   --prepare  全自动：①好卷误杀检查（两卷×五阶段应全绿）②机械雷 R1-R3 注入+逮雷 ③评委雷 R4-R6 注入+生成派发任务书
//   --score    对分：读 judge-answers/R{4,5,6} 原始回答，对预期裁决出报告
// 发版硬门：--prepare 退出码 0（误杀=0 且机械雷 3/3）；评委雷 3/3 为纪律项（改评委时必跑）。
import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVALS = dirname(fileURLToPath(import.meta.url));
const PLUGIN = dirname(EVALS);
const CHECK = join(PLUGIN, 'skills', 'godw-design-check', 'scripts', 'check.mjs');
const FX = join(EVALS, 'fixtures');
const GOOD = ['2099-01-01_悬赏厅最小卷', '2099-01-02_悬赏厅完整卷'];
const FULL = join(FX, GOOD[1]);
const LAST = join(EVALS, 'last-run');
const PHASES = ['requirement', 'split', 'document', 'prd', 'proto'];

function runCheck(inst, phase) {
  const r = spawnSync('node', [CHECK, inst, `--phase`, phase], { encoding: 'utf8', timeout: 180000 });
  let out = null;
  try { out = JSON.parse(r.stdout); } catch { /* 非 JSON 输出按未知失败处理 */ }
  return { code: r.status, out };
}
const rf = (p) => readFileSync(p, 'utf8');
const wf = (p, s) => writeFileSync(p, s);

if (process.argv.includes('--prepare')) {
  rmSync(LAST, { recursive: true, force: true });
  mkdirSync(join(LAST, 'judge-answers'), { recursive: true });
  const report = { ranAt: new Date().toISOString(), goodFalseKills: {}, mechanicalMines: {}, judgeMines: {} };

  // ---------- ① 好卷误杀 ----------
  let falseKills = 0;
  for (const g of GOOD) {
    report.goodFalseKills[g] = [];
    for (const p of PHASES) {
      const { code, out } = runCheck(join(FX, g), p);
      if (code !== 0) {
        falseKills++;
        report.goodFalseKills[g].push({ phase: p, failures: (out && out.failures) || [{ rule: 'crash' }] });
      }
    }
  }

  // ---------- ② 机械雷 R1-R3（注入到完整卷副本） ----------
  const inject = (mineId, mutate) => {
    const dst = join(LAST, `${mineId}-instance`);
    rmSync(dst, { recursive: true, force: true });
    cpSync(FULL, dst, { recursive: true });
    mutate(dst);
    return dst;
  };
  // R1｜AC 挂链删除：PRD 全部 AC 行抹掉 FR-05 → 应逮：ac-fr-missing（prd 阶段）
  const R1 = inject('R1', (d) => {
    for (const f of readdirSync(join(d, 'PRD')).filter(f => f.endsWith('.md'))) {
      const p = join(d, 'PRD', f);
      wf(p, rf(p).replace(/^(\s*[-*]?\s*AC-[\w\u4e00-\u9fa5]+-\d{2,3}\s*\|[^|\n]*)\|\s*FR-05\s*$/m, '$1'));
    }
  });
  report.mechanicalMines.R1 = runCheck(R1, 'prd');
  // R2｜追踪表假链：FR-01 行首个节号引用改成 9.9 → 应逮：trace-fake-ref（document 阶段）
  const R2 = inject('R2', (d) => {
    const p = join(d, '需求追踪.md');
    wf(p, rf(p).replace(/^(\|\s*FR-01\s*\|[^\n]*?\d+\.\d+)/m, (m) => m.replace(/\d+\.\d+/, '9.9')));
  });
  report.mechanicalMines.R2 = runCheck(R2, 'document');
  // R3｜四文档删节：业务架构删掉 UC 表所属流程引用最密的 §3.x 节 → 应逮：uc-flow-ref（document 阶段）
  const R3 = inject('R3', (d) => {
    const p = join(d, '4A架构', '业务架构.md');
    const text = rf(p);
    const ucRows = (text.split('\n').filter(l => /^\|/.test(l)).join('\n')).match(/\b3\.\d+\b/g) || [];
    const counts = {};
    for (const r of ucRows) counts[r] = (counts[r] || 0) + 1;
    const heads = [...text.matchAll(/^###\s*(3\.\d+)/gm)].map(m => m[1]);
    const target = heads.filter(h => counts[h]).sort((a, b) => counts[b] - counts[a])[0] || heads[heads.length - 1];
    const lines = text.split('\n');
    const start = lines.findIndex(l => new RegExp(`^###\\s*${target.replace('.', '\\.')}`).test(l));
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) if (/^#{1,3}\s/.test(lines[i])) { end = i; break; }
    wf(p, lines.slice(0, start).concat(lines.slice(end)).join('\n'));
  });
  report.mechanicalMines.R3 = runCheck(R3, 'document');

  const caught = (m, rule) => m.code === 1 && (m.out?.failures || []).some(f => f.rule === rule);
  const mech = {
    R1: { caught: caught(report.mechanicalMines.R1, 'ac-fr-missing'), expect: 'ac-fr-missing' },
    R2: { caught: caught(report.mechanicalMines.R2, 'trace-fake-ref'), expect: 'trace-fake-ref' },
    R3: { caught: caught(report.mechanicalMines.R3, 'uc-flow-ref'), expect: 'uc-flow-ref' },
  };
  report.mechanicalMines = { R1: { ...mech.R1, check: report.mechanicalMines.R1.out?.failures?.slice(0, 3) }, R2: { ...mech.R2, check: report.mechanicalMines.R2.out?.failures?.slice(0, 3) }, R3: { ...mech.R3, check: report.mechanicalMines.R3.out?.failures?.slice(0, 3) } };

  // ---------- ③ 评委雷 R4-R6（注入 + 生成派发任务书） ----------
  const anchor = `评分锚定：10=可直接上线 / 8=小瑕疵不碍用（通过线）/ 5=核心受阻有绕路 / 2=核心走不通。已裁决清单：无（考题卷）。`;
  // R4｜应用架构写「由系统自行处理」模糊 → 应逮：dev-reproducer 记 blocker/猜
  inject('R4', (d) => {
    const p = join(d, '4A架构', '应用架构.md');
    wf(p, rf(p) + '\n\n## 9 补充说明\n\n悬赏详情页的其余交互细节由系统自行智能处理，无需在此逐一明确约定。\n');
  });
  // R5｜PRD 塞明显过度设计 AC → 应逮：simplicity-officer 砍单
  inject('R5', (d) => {
    const p = join(d, 'PRD', 'PRD-悬赏发布.md');
    const text = rf(p);
    const nums = [...text.matchAll(/AC-悬赏发布-(\d{2,3})/g)].map(m => +m[1]);
    const next = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
    wf(p, text.replace(/\n?$/, '\n') + `- AC-悬赏发布-${next} | WHEN 楼主发布悬赏成功 THE 系统 SHALL 自动生成该悬赏的全网热度预测报告与 AI 情感分析摘要并推送至站外社交平台 | FR-01\n`);
  });
  // R6｜业务架构 §1 塞空泛自评（无反例可找的高分话术）→ 应逮：arch-reviewer 锚定卡纪律（无反例不给高分，须挑战）
  inject('R6', (d) => {
    const p = join(d, '4A架构', '业务架构.md');
    wf(p, rf(p).replace(/(^##\s*1[^\n]*\n)/m, `$1\n整体而言，系统架构合理清晰，各非功能维度表现令人满意，扩展性与复用性俱佳。\n`));
  });
  const briefs = {
    R4: { judge: 'godw-design:dev-reproducer', expect: '答卷 blockers/「只能猜」条目点名 应用架构 §9 或「自行处理」模糊处——照图复现必须能指出哪一步走不下去', instance: `${mineAbs('R4')}` },
    R5: { judge: 'godw-design:simplicity-officer', expect: '砍单确认：点名「全网热度预测/AI 情感分析/推送站外」为过度设计（PRD-悬赏发布 模块）', instance: `${mineAbs('R5')}` },
    R6: { judge: 'godw-design:arch-reviewer', expect: '按锚定卡纪律处理业务架构 §1 的空泛自评：无反例不给高分，须点名该句无证据支撑并要求量化口径', instance: `${mineAbs('R6')}` },
  };
  function mineAbs(id) { return join(LAST, `${id}-instance`); }
  for (const [id, b] of Object.entries(briefs)) {
    wf(join(LAST, `${id}-brief.md`), `# 评委雷 ${id} 派发任务书（--prepare 生成，勿手改实例）\n\n- 评委：Agent(subagent_type='${b.judge}')\n- 实例（含雷）：<${b.instance}>\n- 锚定卡：${anchor}\n- 附件：实例的 需求追踪.md（判定范围）；dev-reproducer 照例不给原始需求与身份卡\n- 任务：按该评委职责对实例做评审（与真实门同口径）\n- **预期裁决**：${b.expect}\n- 操作：把评委原样输出存为 evals/last-run/judge-answers/${id}.md，然后跑 --score\n`);
    report.judgeMines[id] = { judge: b.judge, expect: b.expect, answerFile: `last-run/judge-answers/${id}.md`, ready: true };
  }

  report.verdict = { falseKills, mechanicalCaught: Object.values(mech).filter(m => m.caught).length, hardGatePass: falseKills === 0 && Object.values(mech).every(m => m.caught) };
  wf(join(LAST, 'prepare-report.json'), JSON.stringify(report, null, 2));
  console.log(`好卷误杀：${falseKills}（应为 0）`);
  for (const [id, m] of Object.entries(mech)) console.log(`机械雷 ${id}（期望 ${m.expect}）：${m.caught ? '逮住 ✓' : '漏雷 ✗'}`);
  console.log(`评委雷 R4-R6：任务书已生成 last-run/R{4,5,6}-brief.md，派发后答案存 judge-answers/ 再跑 --score`);
  console.log(report.verdict.hardGatePass ? '发版硬门：PASS' : '发版硬门：FAIL——不许发版');
  process.exit(report.verdict.hardGatePass ? 0 : 1);
}

if (process.argv.includes('--score')) {
  const expect = {
    R4: { judge: 'dev-reproducer', patterns: [/自行处理|智能处理|补充说明|§9|应用架构/, /blocker|只能猜|卡住|走不通/i], note: 'blockers/猜 提到模糊处' },
    R5: { judge: 'simplicity-officer', patterns: [/热度预测|情感分析|社交平台/, /砍|过度|膨胀|删除|不建议/], note: '砍单点名过度设计项' },
    R6: { judge: 'arch-reviewer', patterns: [/满意|合理清晰|空泛|无反例|俱佳|自评/, /反例|反证|量化|证据|依据|扣分|不给高分|挑战|失实|删/], note: '锚定卡纪律处置空泛自评' },
  };
  const report = { ranAt: new Date().toISOString(), judgeMines: {} };
  let all = true;
  for (const [id, e] of Object.entries(expect)) {
    const f = join(LAST, 'judge-answers', `${id}.md`);
    if (!existsSync(f)) { report.judgeMines[id] = { caught: false, reason: '答案文件缺失（先派发评委并存答案）' }; all = false; continue; }
    const text = rf(f);
    const p1 = e.patterns[0].test(text), p2 = e.patterns[1].test(text);
    report.judgeMines[id] = { judge: e.judge, caught: p1 && p2, note: e.note, hits: [p1, p2] };
    if (!(p1 && p2)) all = false;
  }
  report.allCaught = all;
  wf(join(LAST, 'score-report.json'), JSON.stringify(report, null, 2));
  for (const [id, j] of Object.entries(report.judgeMines)) console.log(`评委雷 ${id}（${j.judge}）：${j.caught ? '逮住 ✓' : `未逮 ✗（${j.reason || '关键词未命中，人工复核 score-report'}）`}`);
  console.log(all ? '评委雷纪律项：PASS' : '评委雷纪律项：FAIL——改评委后未过考，检查评委 prompt/锚定卡');
  process.exit(all ? 0 : 1);
}

console.error('用法: node evals/run.mjs --prepare | --score');
process.exit(2);
