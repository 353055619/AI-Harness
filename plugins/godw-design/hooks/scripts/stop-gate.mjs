#!/usr/bin/env node
// godw-design 收工门（Stop）
// Agent 声称「阶段完成/已过门/PASS/已冻结」时，核对对应凭证在位（快照目录/冻结标志）；
// 只做存在性核对，不重跑检查。无活跃实例或无完成声明 → 秒放行。凭证缺 → exit 2 打回附缺口。
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const raw = await new Promise(r => { let s = ''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => r(s)); });

// 声明检测（stdin 原文里扫，兼容任意 JSON 包装）
const CLAIM = /阶段\s*[1-4一二三四][^\n]{0,16}(?:完成|结束|通过|收口)|已过门|已?冻结|合验通过|验收通过|PASS\b|收敛存快照/;
if (!CLAIM.test(raw)) process.exit(0);

// 活跃实例探测（cwd 向上找 design/change/*/state.md；无实例不拦）
function findInstances(start) {
  const found = [];
  let dir = start;
  for (let i = 0; i < 5; i++) {
    const change = join(dir, 'design', 'change');
    if (existsSync(change)) {
      for (const inst of readdirSync(change, { withFileTypes: true })) {
        if (inst.isDirectory() && existsSync(join(change, inst.name, 'state.md'))) found.push(join(change, inst.name));
      }
      if (found.length) return found;
    }
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return found;
}
const root = process.env.ZCODE_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const instances = findInstances(root);
if (!instances.length) process.exit(0);

const deny = (reason) => { console.error(`[godw-design 收工门] ${reason}`); process.exit(2); };

// 0.7.0 补强：check 新鲜度核对（fail-open）——声明过门/通过时，若实例存有 check 凭证（history/check-*.json），
// 最新凭证 ranAt 必须晚于实例内源文件最新修改时间；否则=「改完文档没重跑 check 就宣布收工」打回。
// 无任何 check 凭证时不因此拦（存在性凭证由下方快照核对兜底）——保持 fail-open。
function checkFreshness(inst) {
  let files = [];
  try { files = readdirSync(join(inst, 'history')).filter(f => /^check-.*\.json$/.test(f)); } catch { return; }
  if (!files.length) return;
  let ranAt = 0;
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(join(inst, 'history', f), 'utf8'));
      const t = Date.parse(j.ranAt || '');
      if (t > ranAt) ranAt = t;
    } catch { /* 损坏凭证交存在性核对，此处忽略 */ }
  }
  if (!ranAt) return;
  let newest = 0;
  const scan = (dir) => {
    let ents = []; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const fp = join(dir, e.name);
      if (e.isDirectory()) { if (!/snapshots|evidence|node_modules/.test(e.name)) scan(fp); continue; }
      if (/\.(md|json|html|js|c4)$/.test(e.name)) {
        try { const m = statSync(fp).mtimeMs; if (m > newest) newest = m; } catch {}
      }
    }
  };
  scan(inst);
  if (newest > ranAt)
    deny(`实例 ${inst} 源文件在最近一次 check 凭证（${new Date(ranAt).toISOString()}）之后被改过——先重跑 godw-design-check 并存 history/check-<phase>.json，再宣称完成`);
}

// 声明 → 凭证映射核对（任一命中声明而无凭证 = 打回）
for (const inst of instances) {
  checkFreshness(inst);
  const state = (() => { try { return readFileSync(join(inst, 'state.md'), 'utf8'); } catch { return ''; } })();
  const claims = {
    '阶段2/4A架构 过门': /阶段\s*(2|二)|4A|架构/.test(raw) && /过门|通过|PASS|完成/.test(raw),
    '阶段3/PRD 过门': /阶段\s*(3|三)|PRD/i.test(raw) && /过门|通过|PASS|完成/.test(raw),
    '阶段4/原型/合验 过门': /阶段\s*(4|四)|原型|合验/.test(raw) && /过门|通过|PASS|完成|收口/.test(raw),
    '原始需求冻结': /冻结/.test(raw),
  };
  if (claims['阶段2/4A架构 过门'] && !existsSync(join(inst, 'history', 'snapshots', 'gate1-pass')))
    deny(`声明阶段2过门但 ${inst}/history/snapshots/gate1-pass/ 不存在——先跑完 godw-design-check --phase document 与门1 收敛并存快照，再宣称完成`);
  if (claims['阶段3/PRD 过门'] && !existsSync(join(inst, 'history', 'snapshots', 'gate-prd-pass')))
    deny(`声明阶段3过门但 ${inst}/history/snapshots/gate-prd-pass/ 不存在——先跑 check --phase prd 与 prd 门收敛并存快照`);
  if (claims['阶段4/原型/合验 过门'] && !existsSync(join(inst, 'history', 'snapshots', 'gate2-pass')))
    deny(`声明阶段4合验通过但 ${inst}/history/snapshots/gate2-pass/ 不存在——先跑 walk crawl/check --phase proto 与合验门收敛并存快照`);
  if (claims['原始需求冻结'] && !existsSync(join(inst, '身份卡.md')) && !/已冻结|确认冻结/.test(state))
    deny(`声明原始需求已冻结但 ${inst} 无冻结凭证（state.md 未记、身份卡未产）——冻结须用户确认后落凭证`);
}
process.exit(0);
