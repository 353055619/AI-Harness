#!/usr/bin/env node
// godw-design-check 机械级校验脚本
// 用法: node check.mjs <实例路径> --phase arch|proto
// exit 0 = 全部通过; exit 1 = 失败(逐条输出 JSON failures)
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const instance = args.find(a => !a.startsWith('--'));
const phaseIdx = args.indexOf('--phase');
let phase = null;
if (phaseIdx !== -1 && args[phaseIdx + 1]) phase = args[phaseIdx + 1];
else if (args.includes('--proto')) phase = 'proto';
else if (args.includes('--arch')) phase = 'arch';
if (!instance || (phase !== 'arch' && phase !== 'prd' && phase !== 'proto')) {
  console.error('用法: node check.mjs <实例路径> --phase arch|prd|proto');
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
    // | ID | 摘要 | 业务架构 | 应用架构 | detail 元素 | PRD | 原型页面 | 状态 |
    const id = (cells[1] || '').match(/\b(FR|NFR|GR)-\d{2,}\b/)?.[0];
    if (!id) continue;
    tracedIds.add(id);
    const [biz, app, det, prdCol, protoCol] = [cells[3], cells[4], cells[5], cells[6], cells[7]];
    if (!biz) fail('trace-empty-cell', `${id} 业务架构格为空`);
    if (!app) fail('trace-empty-cell', `${id} 应用架构格为空`);
    if (!det) fail('trace-empty-cell', `${id} detail 元素格为空`);
    if (phase !== 'arch' && (!prdCol || /待\s*PRD/.test(prdCol))) fail('trace-prd-pending', `${id} PRD 列在 ${phase} 阶段仍为空/待PRD`);
    if (phase === 'arch' && !prdCol) fail('trace-empty-cell', `${id} PRD 格缺失（arch 阶段可填「待PRD」）`);
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

// ---- 7. 身份卡.md 在位（1a 后必备）----
const cardPath = join(instance, '身份卡.md');
if (!existsSync(cardPath)) {
  fail('identity-card-missing', '实例根缺 身份卡.md（1a 备料产物，gate 的角色/考题唯一来源）');
} else {
  const card = readFileSync(cardPath, 'utf8');
  if (!/身份卡组/.test(card) || !/考题/.test(card) || !/矩阵/.test(card)) {
    fail('identity-card-incomplete', '身份卡.md 缺身份卡组/考题/矩阵三部分之一');
  }
}

// ---- 8. 业务架构时序图参与者名 ⊆ 角色名 ∪ 系统名（启发式，解析不到只警告）----
if (detail) {
  const roleNames = (detail.roles || []).map(r => r.name);
  const bizPath = join(archDir, '业务架构.md');
  if (existsSync(bizPath)) {
    const biz = readFileSync(bizPath, 'utf8');
    const systems = new Set();
    for (const m of biz.matchAll(/\b(?:System|System_Ext|SystemDb|SystemQueue|Person|SoftwareSystem)\w*\s*\(\s*"([^"]+)"/g)) systems.add(m[1]);
    const modelPath2 = join(archDir, 'model.c4');
    if (existsSync(modelPath2)) {
      const modelSrc = readFileSync(modelPath2, 'utf8');
      for (const m of modelSrc.matchAll(/^\s*\w+\s+\w+\s+"([^"]+)"/gm)) systems.add(m[1]);
    }
    let participants = 0;
    for (const block of biz.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
      const b = block[1];
      if (!/^\s*sequenceDiagram/m.test(b)) continue;
      for (const p of b.matchAll(/^\s*(?:participant|actor)\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(.+))?$/gm)) {
        participants++;
        const name = (p[3] || p[1] || p[2] || '').trim();
        if (name && !roleNames.includes(name) && !systems.has(name)) {
          fail('seq-participant-unknown', `业务架构时序图参与者 "${name}" 不在角色名或系统名清单中`);
        }
      }
    }
    if (!participants) warn.push('业务架构未解析到时序图参与者（无图或语法未覆盖）——语义级复核');
  }

  // ---- 9. 应用架构页面流转图节点名 ⊆ detail pages（id/title，启发式）----
  const appPath = join(archDir, '应用架构.md');
  if (existsSync(appPath)) {
    const app = readFileSync(appPath, 'utf8');
    const pageNames = new Set((detail.pages || []).flatMap(p => [p.id, p.title].filter(Boolean)));
    let nodes = 0;
    for (const block of app.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
      const b = block[1];
      if (!/^\s*(flowchart|graph)\b/m.test(b)) continue;
      for (const n of b.matchAll(/\["([^"]+)"\]|\("([^"]+)"\)/g)) {
        const label = (n[1] || n[2] || '').trim();
        if (!label) continue;
        nodes++;
        if (!pageNames.has(label)) fail('page-node-unknown', `应用架构页面流转图节点 "${label}" 不在 detail.json pages（id/title）中`);
      }
    }
    if (!nodes) warn.push('应用架构未解析到页面流转图节点（无图或语法未覆盖）——语义级复核');
  }
}

// ---- 10. model.c4（LikeC4 模型源）在位 + likec4 validate（CLI 缺失只警告，装了必过）----
const modelPath = join(archDir, 'model.c4');
if (!existsSync(modelPath)) {
  fail('model-missing', '4A架构/ 缺 model.c4（LikeC4 模型源，系统上下文/容器图由它生成）');
} else {
  try {
    const r = spawnSync('likec4', ['validate', archDir], { encoding: 'utf8', timeout: 120000 });
    if (r.error && r.error.code === 'ENOENT') {
      warn.push('likec4 CLI 未安装，model.c4 语法未校验（npm i -g likec4 或项目内 npm i likec4）');
    } else if (r.status !== 0) {
      const brief = String(r.stdout || '').split('\n').filter(l => /Line|✗|Invalid/.test(l)).slice(0, 3).join(' ／ ');
      fail('likec4-invalid', `likec4 validate 失败：${brief || ('exit ' + r.status)}`);
    }
  } catch (e) { warn.push(`likec4 validate 执行异常：${e.message}`); }
}

// ---- 11. PRD 校验（prd/proto 阶段）----
const prdDir = join(instance, 'PRD');
const designName = (basename(instance).match(/^\d{4}-\d{2}-\d{2}_(.+)$/) || [])[1] || null;
let ncCount = 0;
if (phase !== 'arch') {
  if (!existsSync(prdDir)) {
    fail('prd-dir-missing', '实例缺 PRD/ 目录（阶段3-a prd-compose 产出）');
  } else {
    const prdFiles = readdirSync(prdDir).filter(f => f.endsWith('.md'));
    if (!prdFiles.length) fail('prd-empty', 'PRD/ 目录为空');
    const overviewFile = designName ? `PRD-${designName}.md` : null;
    if (!overviewFile || !existsSync(join(prdDir, overviewFile))) fail('prd-overview-missing', `缺总览文件 ${overviewFile || 'PRD-<设计名>.md'}`);
    const acIds = new Set(); const perModule = {}; let corpus = '';
    const bannedZh = ['效率高', '交互完美', '优雅', '流畅'];
    const bannedEn = ['fast', 'easy', 'intuitive'];
    for (const f of prdFiles) {
      const text = readFileSync(join(prdDir, f), 'utf8');
      corpus += text + '\n';
      const head = text.split('\n').slice(0, 12).join('\n');
      if (!/版本\s*v\d+/.test(head)) fail('prd-version-line', `${f} 头部缺「版本 vN · 日期 · 摘要」行`);
      ncCount += (text.match(/\[NEEDS CLARIFICATION/g) || []).length;
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*[-*]?\s*(AC-[\w\u4e00-\u9fa5]+-\d{2,3})\s*\|/);
        if (!m) continue;
        const id = m[1];
        if (acIds.has(id)) fail('ac-duplicate', `AC 编号重复：${id}（${f}）`);
        acIds.add(id);
        const mod = id.split('-').slice(1, -1).join('-');
        perModule[mod] = (perModule[mod] || 0) + 1;
        if (!/\bSHALL\b/.test(line) || !/\b(WHEN|IF|WHILE|WHERE)\b/.test(line))
          fail('ac-ears-invalid', `${f} ${id} 不符合 EARS 句式（需 WHEN/IF/WHILE/WHERE + SHALL）：${line.trim().slice(0, 60)}`);
      }
      for (const w of bannedZh) if (text.includes(w)) fail('prd-banned-phrase', `${f} 命中禁词「${w}」（改写为可观察界面行为）`);
      for (const w of bannedEn) if (new RegExp(`\\b${w}\\b`, 'i').test(text)) fail('prd-banned-phrase', `${f} 命中禁词「${w}」`);
    }
    for (const [mod, n] of Object.entries(perModule)) if (n > 30) fail('ac-over-limit', `模块 ${mod} 有 ${n} 条 AC（上限 30）`);
    if (overviewFile && existsSync(join(prdDir, overviewFile))) {
      const ov = readFileSync(join(prdDir, overviewFile), 'utf8');
      for (const ref of ov.matchAll(/PRD-[\w\u4e00-\u9fa5-]+\.md/g)) {
        if (!existsSync(join(prdDir, ref[0]))) fail('prd-module-missing', `总览链接的模块文件不存在：${ref[0]}`);
      }
      if (detail) {
        const names = new Set((detail.pages || []).flatMap(p => [p.id, p.title].filter(Boolean)));
        const lines = ov.split('\n');
        const start = lines.findIndex(l => /^##\s*1\s*模块总览/.test(l));
        const rows = [];
        for (let i = start + 1; i < lines.length; i++) {
          if (/^##\s/.test(lines[i])) break;
          if (/^\|/.test(lines[i])) rows.push(lines[i]);
        }
        let seenSep = false;
        for (const row of rows) {
          if (/^\|[\s:|-]+\|?\s*$/.test(row)) { seenSep = true; continue; }
          if (!seenSep) continue; // 跳过表头行
          const cells = row.split('|').map(c => c.trim());
          const pageCell = cells[3];
          if (!pageCell || pageCell.length > 40) continue;
          for (const tok of pageCell.split(/[、，,/／]/).map(t => t.trim()).filter(Boolean)) {
            if (!names.has(tok)) fail('prd-page-unknown', `总览页面「${tok}」不在 detail.json pages 中`);
          }
        }
      }
    }
    if (detail && corpus) {
      for (const p of detail.pages || []) {
        const hit = (p.title && corpus.includes(p.title)) || (p.id && corpus.includes(p.id));
        if (!hit) fail('prd-page-missing', `detail 页面「${p.title || p.id}」在任何 PRD 文件中均未提及（漏页）`);
      }
    }
  }
}

// ---- 结果（带真跑凭证：ranAt + 被检文件最新修改时刻，编排层核对防"声称跑过"）----
const inspected = [reqPath, tracePath, detailPath, cardPath, modelPath, ...docs.map(d => join(archDir, d))].filter(p => existsSync(p));
if (existsSync(prdDir)) for (const f of readdirSync(prdDir).filter(f => f.endsWith('.md'))) inspected.push(join(prdDir, f));
const newestMtime = inspected.reduce((m, p) => { const t = statSync(p).mtimeMs; return t > m ? t : m; }, 0);
const result = { instance: basename(instance), phase,
  ranAt: new Date().toISOString(),
  newestSourceMtime: newestMtime ? new Date(newestMtime).toISOString() : null,
  needsClarification: ncCount,
  note: '本输出必须原样贴进修订记录；编排层核对 ranAt 晚于被检文件当前最新修改时间，否则视为未真跑',
  failures, warnings: warn, pass: failures.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
