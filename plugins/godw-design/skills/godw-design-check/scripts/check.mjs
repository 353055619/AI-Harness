#!/usr/bin/env node
// godw-design-check 机械级校验脚本
// 用法: node check.mjs <实例路径> --phase arch|proto
// exit 0 = 全部通过; exit 1 = 失败(逐条输出 JSON failures)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const instance = args.find(a => !a.startsWith('--'));
const phaseIdx = args.indexOf('--phase');
let phase = null;
if (phaseIdx !== -1 && args[phaseIdx + 1]) phase = args[phaseIdx + 1];
else if (args.includes('--proto')) phase = 'proto';
else if (args.includes('--arch')) phase = 'arch';
if (!instance || (phase !== 'arch' && phase !== 'proto')) {
  console.error('用法: node check.mjs <实例路径> --phase arch|proto');
  process.exit(1);
}
const failures = [];
const warn = [];
const fail = (rule, detail) => failures.push({ rule, detail });

// ---- 1. detail.json 合法性与内部自洽 ----
const detailPath = join(instance, '4A架构', 'detail.json');
let detail = null;
if (!existsSync(detailPath)) {
  fail('detail-missing', detailPath);
} else {
  try { detail = JSON.parse(readFileSync(detailPath, 'utf8')); }
  catch (e) { fail('detail-invalid-json', String(e.message)); }
}
if (detail) {
  if (!detail._version || !detail._updated) fail('detail-version-fields', '顶层需 _version/_updated');
  const roles = new Set((detail.roles || []).map(r => r.name));
  if (!detail.roles || !detail.roles.length) fail('detail-roles-empty', 'roles 为空');
  for (const p of detail.pages || []) {
    for (const r of p.roles || []) if (!roles.has(r)) fail('page-role-unknown', `pages.${p.id}.roles 含未定义角色 "${r}"`);
    for (const a of p.actions || []) if (typeof a !== 'string' || !a) fail('page-action-invalid', `pages.${p.id}.actions 含空动作`);
  }
  for (const f of detail.flows || []) {
    if (!roles.has(f.actor)) fail('flow-actor-unknown', `flows.${f.name}.actor "${f.actor}" 未在 roles 定义`);
    if (!Array.isArray(f.steps) || !f.steps.length) fail('flow-steps-empty', `flows.${f.name}.steps 为空`);
  }
  for (const e of detail.entities || []) {
    if (!Array.isArray(e.states) || !e.states.length) fail('entity-states-empty', `entities.${e.name}.states 为空`);
    if (!Array.isArray(e.fields) || !e.fields.length) fail('entity-fields-empty', `entities.${e.name}.fields 为空`);
  }
}

// ---- 2. 原始需求 FR/NFR 提取 ----
const reqPath = join(instance, '原始需求.md');
const legalIds = new Set();
if (!existsSync(reqPath)) {
  fail('requirement-missing', reqPath);
} else {
  const req = readFileSync(reqPath, 'utf8');
  for (const m of req.matchAll(/\b(FR|NFR)-\d{2,}\b/g)) legalIds.add(m[0]);
  if (!legalIds.size) fail('requirement-no-ids', '原始需求.md 未发现 FR-xx/NFR-xx 编号');
}

// ---- 3. GR 合法集合（gate-registry.md 已登记的 GR）----
const registryPath = join(instance, 'history', 'gate-registry.md');
const legalGR = new Set();
if (existsSync(registryPath)) {
  for (const m of readFileSync(registryPath, 'utf8').matchAll(/\bGR-\d{2,}\b/g)) legalGR.add(m[0]);
}

// ---- 4. 需求追踪.md ----
const tracePath = join(instance, '需求追踪.md');
const tracedIds = new Set();
if (!existsSync(tracePath)) {
  fail('trace-missing', tracePath);
} else {
  const trace = readFileSync(tracePath, 'utf8');
  const rows = trace.split('\n').filter(l => /^\|/.test(l) && /\b(FR|NFR|GR)-\d{2,}\b/.test(l));
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim());
    // | ID | 摘要 | 业务架构 | 应用架构 | detail 元素 | 原型页面 | 状态 |
    const id = (cells[1] || '').match(/\b(FR|NFR|GR)-\d{2,}\b/)?.[0];
    if (!id) continue;
    tracedIds.add(id);
    const [biz, app, det, protoCol] = [cells[3], cells[4], cells[5], cells[6]];
    if (!biz) fail('trace-empty-cell', `${id} 业务架构格为空`);
    if (!app) fail('trace-empty-cell', `${id} 应用架构格为空`);
    if (!det) fail('trace-empty-cell', `${id} detail 元素格为空`);
    if (phase === 'proto' && (!protoCol || protoCol === '待原型')) fail('trace-proto-pending', `${id} 原型页面列在 proto 阶段仍为空/待原型`);
    if (phase === 'arch' && !protoCol) fail('trace-empty-cell', `${id} 原型页面格缺失（arch 阶段可填「待原型」）`);
  }
  for (const id of legalIds) if (!tracedIds.has(id)) fail('trace-missing-row', `${id} 在原始需求中存在但追踪表无行`);
}

// ---- 5. 四文档版本行 + FR 标注杜撰检查 ----
const archDir = join(instance, '4A架构');
const docs = existsSync(archDir) ? readdirSync(archDir).filter(f => f.endsWith('.md')) : [];
if (!docs.length) fail('docs-missing', '4A架构/ 下无 .md 文档');
for (const doc of docs) {
  const text = readFileSync(join(archDir, doc), 'utf8');
  const head = text.split('\n').slice(0, 12).join('\n');
  if (!/版本\s*v\d+/.test(head)) fail('doc-version-line', `${doc} 头部缺「版本 vN · 日期 · 摘要」行`);
  for (const m of text.matchAll(/\b((?:FR|NFR|GR)-\d{2,})\b/g)) {
    const id = m[0];
    const ok = id.startsWith('GR') ? legalGR.has(id) : legalIds.has(id);
    if (!ok) fail('id-fabricated', `${doc} 引用了未定义编号 ${id}（不在原始需求 FR/NFR 或登记表 GR 集合）`);
  }
}

// ---- 6. detail.json trace 引用合法性（有 detail 时）----
if (detail) {
  const all = [detail.pages || [], detail.entities || [], detail.flows || []].flat();
  for (const el of all) {
    const tr = el.trace;
    if (tr === 'deferred' || tr === undefined) continue;
    for (const id of tr || []) {
      const ok = id.startsWith('GR') ? legalGR.has(id) : legalIds.has(id);
      if (!ok) fail('detail-trace-invalid', `${el.id || el.name}.trace 引用未定义 ${id}`);
    }
  }
  const noTrace = all.filter(el => !el.trace || (Array.isArray(el.trace) && !el.trace.length));
  if (noTrace.length) warn.push(`${noTrace.length} 个 detail 元素无 trace 且未标 deferred（语义级核对是否发明）`);
}

// ---- 结果 ----
const result = { instance: basename(instance), phase, failures, warnings: warn, pass: failures.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
