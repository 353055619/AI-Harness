#!/usr/bin/env node
// godw-design-check 机械级校验脚本（v0.6.0 五阶段）
// 用法: node check.mjs <实例路径> --phase requirement|split|document|prd|proto [--crawl <crawl.json>] [--registry]
//   遗留兼容: --phase arch=document；--proto/--arch 旧旗标仍识别
// exit 0 = 全部通过; exit 1 = 失败(逐条输出 JSON failures); exit 2 = 用法错误
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const instance = args.find(a => !a.startsWith('--'));
const val = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
let phase = val('--phase');
if (!instance || !phase) {
  if (args.includes('--proto')) phase = 'proto';
  else if (args.includes('--arch')) phase = 'document';
}
if (phase === 'arch') phase = 'document';
const PHASES = ['requirement', 'split', 'document', 'prd', 'proto'];
if (!instance || !PHASES.includes(phase)) {
  console.error(`用法: node check.mjs <实例路径> --phase ${PHASES.join('|')} [--crawl <crawl.json>] [--registry]`);
  process.exit(2);
}
const crawlPath = val('--crawl');
const doRegistry = args.includes('--registry');
const failures = [];
const warn = [];
const fail = (rule, detail) => failures.push({ rule, detail });

const hasDocPhase = phase === 'document' || phase === 'prd' || phase === 'proto';
const hasPrdPhase = phase === 'prd' || phase === 'proto';

// ---------- 通用工具 ----------
function readText(p) { return existsSync(p) ? readFileSync(p, 'utf8') : null; }
function mermaidBlocks(text) {
  const out = [];
  for (const m of (text || '').matchAll(/```mermaid\n([\s\S]*?)```/g)) out.push(m[1]);
  return out;
}
// 取 markdown 某节正文：headingRegex 命中行起，到同级或更高级标题止
function section(text, headingRe) {
  if (!text) return '';
  const lines = text.split('\n');
  const start = lines.findIndex(l => headingRe.test(l));
  if (start === -1) return '';
  const level = (lines[start].match(/^#+/) || ['#'])[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const hm = lines[i].match(/^(#+)\s/);
    if (hm && hm[1].length <= level) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n');
}
function tableRows(text) {
  return (text || '').split('\n').filter(l => /^\|/.test(l) && !/^\|[\s:|-]+\|?\s*$/.test(l));
}
// 剥掉合法 HTML 标签后再查 <…> 占位（防 <br>/<b> 误报）
const stripTags = (l) => l.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(\s[^>\n]*)?\/?>/g, '');
const splitList = (s) => (s || '').split(/[、,，;；/]/).map(t => t.trim()).filter(Boolean);
const tokens = (s, re) => [...(s || '').matchAll(re)].map(m => m[0]);

// ---------- requirement 阶段（阶段1）----------
const reqPath = join(instance, '原始需求.md');
const termsPath = join(instance, '术语.md');
const reqText = readText(reqPath);
const legalIds = new Set();
let reqFR = [], reqNFR = [];
if (!reqText) {
  fail('requirement-missing', reqPath);
} else {
  for (const m of reqText.matchAll(/\b(FR|NFR)-(\d{2,})\b/g)) legalIds.add(`${m[1]}-${m[2]}`);
  reqFR = [...new Set(tokens(reqText, /\bFR-\d{2,}\b/g))].map(id => +id.slice(3)).sort((a, b) => a - b);
  reqNFR = [...new Set(tokens(reqText, /\bNFR-\d{2,}\b/g))].map(id => +id.slice(4)).sort((a, b) => a - b);
  if (!legalIds.size) fail('requirement-no-ids', '原始需求.md 未发现 FR-xx/NFR-xx 编号');
}

if (phase === 'requirement' && reqText) {
  // 七章节骨架
  const chapters = ['背景与问题', '用户与对象', '交付边界', '功能需求', '非功能约束', '已有资产与集成边界', '术语索引'];
  const heads = reqText.split('\n').filter(l => /^##\s/.test(l)).join('\n');
  for (const c of chapters) if (!heads.includes(c)) fail('req-skeleton-missing', `原始需求.md 缺「## ${c}」章节`);
  // 编号连续
  const seqOK = (arr) => arr.length === (arr[arr.length - 1] || 0) && arr.every((n, i) => i === 0 || n > arr[i - 1]);
  if (reqFR.length && !seqOK(reqFR)) fail('req-id-gap', `FR 编号不连续或有重号：${reqFR.join(',')}`);
  if (reqNFR.length && !seqOK(reqNFR)) fail('req-id-gap', `NFR 编号不连续或有重号：${reqNFR.join(',')}`);
  // In/Out 非空
  const inSec = section(reqText, /^###\s*3\.1/);
  const outSec = section(reqText, /^###\s*3\.2/);
  if (!inSec.trim() || tableRows(inSec).length < 1 && !/^\s*[-*\d]/m.test(inSec)) fail('req-inout-empty', '§3.1 本期做什么（In）无条目');
  if (!outSec.trim()) fail('req-inout-empty', '§3.2 本期明确不做（Out）缺失或为空——边界是越界判定依据，必须显式列出（哪怕只有一条）');
  // 占位残留
  for (const l of reqText.split('\n')) {
    if (/^-\s*(版本|溯源)/.test(l.trim())) continue;
    const bare = stripTags(l);
    if (/待补充|待定|TBD/i.test(l) || /<[^>|][^>\n]{0,40}>/.test(bare)) {
      fail('req-placeholder', `占位残留：${l.trim().slice(0, 60)}`);
      break;
    }
  }
  // 术语表
  const terms = readText(termsPath);
  if (!terms) fail('req-terms-missing', '实例根缺 术语.md（formalize 首建产物）');
  else if (!/术语.*定义.*(出处|来源)/.test(terms.split('\n').filter(l => /^\|/.test(l))[0] || '')) fail('req-terms-missing', '术语.md 缺「术语|定义|出处」三列表头');
  // GOAL.md 双源检查（项目根 = 实例上三级）
  const goalPath = resolve(instance, '../../..', '.agents', 'GOAL.md');
  if (existsSync(goalPath)) fail('req-goal-not-deleted', `${goalPath} 仍存在——formalize 完成后必须删除源文件，需求文档全链只此一份`);
  // §2 角色表
  const sec2 = section(reqText, /^##\s*2\s*用户与对象/);
  const roleRows = tableRows(sec2).slice(1); // 去表头
  if (!roleRows.length) fail('req-roles-thin', '§2 用户与对象无角色行');
  for (const row of roleRows) {
    const cells = row.split('|').map(c => c.trim());
    if (cells.filter(Boolean).length < 4) fail('req-roles-thin', `§2 角色行列数不足（需四列：类别|是谁|达成什么|成功长什么样）：${row.slice(0, 50)}`);
  }
}

// 原始需求 §2 角色名集合（split/document 阶段用）
const reqRoles = (() => {
  if (!reqText) return [];
  const sec2 = section(reqText, /^##\s*2\s*用户与对象/);
  return tableRows(sec2).slice(1).map(r => (r.split('|')[1] || '').trim()).filter(Boolean);
})();

// ---------- GR 合法集合（gate-registry.md 已登记的 GR）----
const registryPath = join(instance, 'history', 'gate-registry.md');
const registryText = readText(registryPath);
const legalGR = new Set(tokens(registryText || '', /\bGR-\d{2,}\b/g));

// ---------- split 阶段（阶段2-a）----------
const legPath = join(instance, 'history', '需求-架构输入.md');
const cardPath = join(instance, '身份卡.md');
const cardText = readText(cardPath);
const cardRoles = [];
const cardExamIds = [];
if (phase === 'split') {
  // 架构腿
  const leg = readText(legPath);
  if (!leg) fail('split-leg-missing', 'history/需求-架构输入.md（架构腿）缺失');
  else {
    const legHeads = leg.split('\n').filter(l => /^##\s/.test(l)).join('\n');
    for (const h of ['角色与权限', '业务实体', '核心流程', '约束与非功能', '待澄清'])
      if (!legHeads.includes(h)) fail('split-leg-skeleton', `架构腿缺「## ${h}」节`);
    // 角色一致性：架构腿角色 ⊆ §2 角色 ∪ 推导标注
    const roleSec = section(leg, /^##\s*角色与权限/);
    for (const row of tableRows(roleSec).slice(1)) {
      const cells = row.split('|').map(c => c.trim());
      const name = cells[1];
      if (!name) continue;
      if (!reqRoles.includes(name) && !row.includes('推导'))
        fail('leg-role-unknown', `架构腿角色「${name}」不在原始需求 §2 角色清单且未标注「推导」`);
    }
  }
  // 身份卡（升级：四句齐全 / 六类不缺类 / 矩阵对齐 / 找茬者挂 FR）
  if (!cardText) {
    fail('identity-card-missing', '实例根缺 身份卡.md（2-a 备料产物，gate 的角色/考题唯一来源）');
  } else {
    if (!/身份卡组/.test(cardText) || !/考题/.test(cardText) || !/矩阵/.test(cardText))
      fail('identity-card-incomplete', '身份卡.md 缺身份卡组/考题/矩阵三部分之一');
    const grpSec = section(cardText, /^##\s*一、身份卡组/);
    const cardBody = grpSec || cardText;
    let inCards = false;
    let current = null, buf = [];
    const flush = () => {
      if (!current || current === '找茬者') return;
      cardRoles.push(current);
      const b = buf.join('\n');
      for (const key of ['要办成什么', '最怕', '懂多少', '卡住了怎么办'])
        if (!b.includes(key)) fail('card-four-lines', `角色卡「${current}」缺四句之一（${key}）`);
    };
    for (const line of cardBody.split('\n')) {
      const hm = line.match(/^###\s*(.+)$/);
      if (hm) { flush(); current = hm[1].split('（')[0].trim(); buf = []; inCards = true; }
      else if (inCards && current) buf.push(line);
    }
    flush();
    // 找茬者每条挂 FR
    const faultSec = section(cardBody, /^###\s*找茬者/);
    for (const l of (faultSec || '').split('\n')) {
      if (/^\s*[-*\d]/.test(l) && l.trim().length > 5 && !/\b(FR|NFR)-\d{2,}\b/.test(l))
        fail('card-fault-fr', `找茬者清单条目未挂关联 FR/NFR：${l.trim().slice(0, 50)}`);
    }
    // 考题六类
    const examSec = section(cardText, /^##\s*二、考题/);
    for (const t of tokens(examSec || '', /\bT-\d{2,}\b/g)) cardExamIds.push(t);
    const sixTypes = ['走通', '走歪', '从中间接手', '查一个数', '改一个规则', '照图搭'];
    const examAll = cardText;
    for (const t of sixTypes) {
      if (!examAll.includes(t) && !new RegExp(`不适用[^\\n]{0,30}${t}`).test(examAll))
        fail('card-exam-six-types', `考题缺「${t}」类且无「不适用+理由」标注（不得静默缺类）`);
    }
    // 矩阵对齐
    const mtxSec = section(cardText, /^##\s*三、身份×题矩阵/) || section(cardText, /^##\s*三、.*矩阵/);
    const mtxRows = tableRows(mtxSec);
    const headerExams = mtxRows.length ? tokens(mtxRows[0], /\bT-\d{2,}\b/g) : [];
    const mtxRoles = mtxRows.slice(1).map(r => (r.split('|')[1] || '').trim()).filter(Boolean);
    for (const t of headerExams) if (!cardExamIds.includes(t)) fail('card-matrix-refs', `矩阵表头考题 ${t} 未在考题清单中定义`);
    for (const t of cardExamIds) if (!headerExams.includes(t)) fail('card-matrix-refs', `考题 ${t} 未出现在矩阵表头（矩阵须与考题对齐）`);
    for (const r of mtxRoles) if (!cardRoles.includes(r) && r !== '找茬者') fail('card-matrix-refs', `矩阵行角色「${r}」不在身份卡组中`);
  }
  // INDEX 建账对账
  const rfDir = join(instance, '参考资料');
  if (existsSync(rfDir)) {
    const files = readdirSync(rfDir).filter(f => f !== 'INDEX.md' && f !== 'archive' && statSync(join(rfDir, f)).isFile());
    const idxPath = join(rfDir, 'INDEX.md');
    const idx = readText(idxPath);
    if (files.length && !idx) fail('index-missing', '参考资料/ 有文件但缺 INDEX.md 登记账');
    else if (idx) {
      const rfRows = tableRows(idx).filter(r => /^\|\s*RF-\d+/.test(r)).length;
      if (files.length && rfRows !== files.length)
        fail('index-rowcount', `INDEX.md 登记 ${rfRows} 行，参考资料实际 ${files.length} 个文件（须一一对应）`);
    }
  }
}

// ---------- 身份卡角色组解析（任意阶段有卡即解析，供 detail 对账用）----------
if (cardText && !cardRoles.length) {
  const grpSec = section(cardText, /^##\s*一、身份卡组/);
  const cardBody = grpSec || cardText;
  for (const line of cardBody.split('\n')) {
    const hm = line.match(/^###\s*(.+)$/);
    if (!hm) continue;
    const name = hm[1].split('（')[0].trim();
    if (name && name !== '找茬者') cardRoles.push(name);
  }
}

// ---------- detail.json 合法性与内部自洽（document/prd/proto）----------
const detailPath = join(instance, '4A架构', 'detail.json');
let detail = null;
if (hasDocPhase) {
  const dt = readText(detailPath);
  if (!dt) {
    fail('detail-missing', detailPath);
  } else {
    try { detail = JSON.parse(dt); }
    catch (e) { fail('detail-invalid-json', String(e.message)); }
  }
  if (detail) {
    if (!detail._version || !detail._updated) fail('detail-version-fields', '顶层需 _version/_updated');
    const roles = new Set((detail.roles || []).map(r => r.name));
    if (!detail.roles || !detail.roles.length) fail('detail-roles-empty', 'roles 为空');
    for (const r of detail.roles || []) {
      for (const p of r.permissions || [])
        if (!/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(p))
          fail('permission-format', `roles.${r.name}.permissions "${p}" 不符合 <资源>:<动作> 小写规范`);
    }
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
    if (!Array.isArray(detail.seedData) || !detail.seedData.length)
      fail('seeddata-missing', 'detail.seedData 缺失或为空（原型模拟数据必须声明覆盖维度：角色×状态×边界值）');
    // detail.roles ↔ 身份卡角色对账（gate 对账规则机械化；已裁决 GR/DECISIONS 中点名的角色视为已回流）
    if (cardText) {
      const decisionsText = readText(join(instance, 'history', 'DECISIONS.md')) || '';
      const ruled = (registryText || '') + decisionsText;
      const cardRoleSet = new Set([...cardRoles, '找茬者']);
      for (const r of detail.roles || [])
        if (cardRoleSet.size && !cardRoleSet.has(r.name) && !ruled.includes(r.name))
          fail('role-unaccounted', `detail.roles 引入身份卡外角色「${r.name}」——须走回流呈报（登记表 open + DECISIONS 出处），不得悄悄加派`);
    }
  }
}

// ---------- 需求追踪.md（document/prd/proto；split 前不存在，跳过）----------
const tracePath = join(instance, '需求追踪.md');
const tracedIds = new Set();
if (hasDocPhase) {
  const trace = readText(tracePath);
  if (!trace) {
    fail('trace-missing', tracePath);
  } else {
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
      if (hasPrdPhase && (!prdCol || /待\s*PRD/.test(prdCol))) fail('trace-prd-pending', `${id} PRD 列在 ${phase} 阶段仍为空/待PRD`);
      if (phase === 'document' && !prdCol) fail('trace-empty-cell', `${id} PRD 格缺失（document 阶段可填「待PRD」）`);
      if (phase === 'proto' && (!protoCol || protoCol === '待原型')) fail('trace-proto-pending', `${id} 原型页面列在 proto 阶段仍为空/待原型`);
      if (phase === 'document' && !protoCol) fail('trace-empty-cell', `${id} 原型页面格缺失（document 阶段可填「待原型」）`);
    }
    for (const id of legalIds) if (!tracedIds.has(id)) fail('trace-missing-row', `${id} 在原始需求中存在但追踪表无行`);
  }
}

// ---------- 四文档（document/prd/proto）----------
const archDir = join(instance, '4A架构');
const docs = hasDocPhase && existsSync(archDir) ? readdirSync(archDir).filter(f => f.endsWith('.md')) : [];
const docBanned = ['高性能', '适当处理', '良好体验', '极佳体验', '业界领先'];
if (hasDocPhase) {
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
    for (const w of docBanned) if (text.includes(w)) fail('doc-banned-phrase', `${doc} 命中不可验证词「${w}」（改写为可度量表述）`);
  }
}

// ---------- detail trace 引用（升级：无 trace 未标 deferred 由警告改失败）----------
if (detail) {
  const all = [detail.pages || [], detail.entities || [], detail.flows || []].flat();
  for (const el of all) {
    const tr = el.trace;
    if (tr === 'deferred' || tr === undefined) continue;
    if (Array.isArray(tr) && !tr.length) { fail('detail-trace-missing', `${el.id || el.name} trace 为空数组（无出处须显式标 "deferred"）`); continue; }
    for (const id of tr || []) {
      const ok = id.startsWith('GR') ? legalGR.has(id) : legalIds.has(id);
      if (!ok) fail('detail-trace-invalid', `${el.id || el.name}.trace 引用未定义 ${id}`);
    }
  }
  const noTrace = all.filter(el => !el.trace);
  if (noTrace.length) fail('detail-trace-missing', `${noTrace.length} 个 detail 元素无 trace 且未标 deferred（疑似发明）：${noTrace.slice(0, 5).map(e => e.id || e.name).join('、')}`);
}

// ---------- 身份卡在位（document+ 阶段基础检查；四句级已在 split 查过）----------
if (hasDocPhase && !cardText) fail('identity-card-missing', '实例根缺 身份卡.md（2-a 备料产物，gate 的角色/考题唯一来源）');

// ---------- 业务架构：用例覆盖 + 时序图 + 度量 + 业务规则（document/prd/proto）----------
const bizPath = join(archDir, '业务架构.md');
const bizText = hasDocPhase ? readText(bizPath) : null;
if (hasDocPhase && bizText && detail) {
  // —— 用例覆盖矩阵（§3.0 表：UC-xx | 业务域 | 用例 | 参与角色 | 所属流程 | 关联 FR）——
  const ucSec = section(bizText, /^###\s*3\.0/);
  const ucRows = tableRows(ucSec).slice(1).map(r => r.split('|').map(c => c.trim()));
  const ucParsed = ucRows.map(cells => ({
    id: (cells[1] || '').match(/\bUC-\d{2,}\b/)?.[0],
    roles: splitList(cells[4] || ''),
    flow: cells[5] || '',
    frs: tokens(cells[6] || '', /\b(?:FR|NFR|GR)-\d{2,}\b/g),
  })).filter(r => r.id);
  if (!ucParsed.length) {
    fail('uc-table-missing', '业务架构§3.0 用例总览未按新骨架编号（需 UC-xx | 业务域 | 用例 | 参与角色 | 所属流程 | 关联 FR）');
  } else {
    // 每 FR ≥1 用例
    const frCovered = new Set(ucParsed.flatMap(r => r.frs));
    for (const id of legalIds) {
      if (id.startsWith('NFR')) continue;
      if (!frCovered.has(id)) fail('uc-fr-coverage', `${id} 未被任何用例覆盖（§3.0 关联 FR 列须逐条挂接）`);
    }
    // 每角色 ≥1 用例 + 专属用例图（§3.1 每角色用例视图）
    const viewSec = section(bizText, /^###\s*3\.1\s*每角色用例视图/);
    for (const role of reqRoles) {
      const ucOfRole = ucParsed.filter(r => r.roles.includes(role)).map(r => r.id);
      if (!ucOfRole.length) { fail('uc-role-coverage', `角色「${role}」（原始需求§2）在用例总览中无任何用例`); continue; }
      const roleBlock = (() => {
        const lines = viewSec.split('\n');
        const s = lines.findIndex(l => new RegExp(`^#{4,}\\s*${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`).test(l.trim()));
        if (s === -1) return null;
        let e = lines.length;
        for (let i = s + 1; i < lines.length; i++) if (/^#{1,4}\s/.test(lines[i])) { e = i; break; }
        return lines.slice(s, e).join('\n');
      })();
      if (!roleBlock) { fail('uc-role-coverage', `角色「${role}」在 §3.1 每角色用例视图缺专属小节（#### <角色>）`); continue; }
      const blocks = mermaidBlocks(roleBlock);
      if (!blocks.length) { fail('uc-diagram-missing', `角色「${role}」用例视图缺 mermaid 图`); continue; }
      const inDiagram = new Set(tokens(blocks.join('\n'), /\bUC-\d{2,}\b/g));
      const expect = new Set(ucOfRole);
      for (const id of expect) if (!inDiagram.has(id)) fail('uc-diagram-consistency', `角色「${role}」用例图缺节点 ${id}（图节点须=该角色用例全集）`);
      for (const id of inDiagram) if (!expect.has(id)) fail('uc-diagram-consistency', `角色「${role}」用例图节点 ${id} 不属于该角色（§3.0 表该角色用例之外）`);
    }
    // 用例挂流程节真实存在
    const flowNums = new Set([...bizText.matchAll(/^###\s*(3\.\d+)/gm)].map(m => m[1]));
    for (const r of ucParsed) {
      const nums = tokens(r.flow, /3\.\d+/g);
      if (!nums.length) fail('uc-flow-ref', `用例 ${r.id} 未挂所属流程（如 §3.2）`);
      for (const n of nums) if (!flowNums.has(n)) fail('uc-flow-ref', `用例 ${r.id} 挂的流程 ${n} 不存在（业务架构无 ### ${n} 节）`);
    }
  }
  // —— 成功度量可量化（§1 含数字）——
  const sec1 = section(bizText, /^##\s*1\s*/);
  if (sec1 && !/\d/.test(sec1)) fail('metric-not-quantified', '业务架构§1 成功度量无可量化数字（缺度量回补需求，不编数字）');
  // —— 业务规则 BR 编号（每个「业务规则」小节的 §3.x 流程须有 BR-xx）——
  const flowSecAll = section(bizText, /^##\s*3\s*/);
  const subFlows = bizText.split('\n').filter(l => /^###\s*3\.\d/.test(l));
  const flowText = section(bizText, /^##\s*3\s*/);
  for (const h of subFlows) {
    const name = h.replace(/^###\s*/, '').split(/\s*\[/)[0].trim();
    const re = new RegExp(`^###\\s*3\\.\\d+\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const body = section(bizText, re);
    if (body.includes('业务规则') && !/\bBR-\d{2,}\b/.test(body))
      fail('bizrule-unnumbered', `流程「${name}」的业务规则未逐条编号（BR-xx，供 PRD 引用）`);
  }
  // —— 时序图：参与者对齐（升级为失败）+ 分叉 ≤2 + 类型合法 ——
  const roleNames = (detail.roles || []).map(r => r.name);
  const systems = new Set();
  for (const m of bizText.matchAll(/\b(?:System|System_Ext|SystemDb|SystemQueue|Person|SoftwareSystem)\w*\s*\(\s*"([^"]+)"/g)) systems.add(m[1]);
  const modelPath2 = join(archDir, 'model.c4');
  let modelTitles = [];
  if (existsSync(modelPath2)) {
    const modelSrc = readFileSync(modelPath2, 'utf8');
    // 赋值式（id = kind '标题' / "标题"）与旧式（kind id "标题"）都认
    for (const m of modelSrc.matchAll(/=\s*(?:actor|person|system|systemDb|systemQueue|container|component|enterpriseBoundary|group)\s+['"]([^'"\n]+)['"]/g)) { systems.add(m[1]); modelTitles.push(m[1]); }
    for (const m of modelSrc.matchAll(/^\s*(?:actor|person|system|systemDb|systemQueue|container|component)\s+\w+\s+['"]([^'"\n]+)['"]/gm)) { systems.add(m[1]); modelTitles.push(m[1]); }
    for (const m of modelSrc.matchAll(/->\s*\w+\s+['"]([^'"\n]+)['"]/g)) modelTitles.push(m[1]);
  }
  let participants = 0;
  for (const b of mermaidBlocks(bizText)) {
    if (!/^\s*sequenceDiagram/m.test(b)) continue;
    const branch = (b.match(/^(?:\s*)(?:alt|opt|par)\b/gm) || []).length;
    if (branch > 2) fail('seq-branch-over', `时序图分叉块 ${branch} 个（上限 2：只画主路径+最多 2 个关键分叉）`);
    for (const p of b.matchAll(/^\s*(?:participant|actor)\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(.+))?$/gm)) {
      participants++;
      const name = (p[3] || p[1] || p[2] || '').trim();
      if (name && !roleNames.includes(name) && !systems.has(name))
        fail('seq-participant-unknown', `业务架构时序图参与者 "${name}" 不在角色名或系统名清单中`);
    }
  }
  if (!participants) fail('seq-diagram-missing', '业务架构未解析到任何时序图参与者（§3.x 流程须配时序图）');
  // —— 信息架构：状态图节点 ⊆ detail entities[].states ——
  const infoPath = join(archDir, '信息架构.md');
  const infoText = readText(infoPath);
  if (infoText) {
    const stateBlocks = mermaidBlocks(infoText).filter(b => /stateDiagram/i.test(b));
    const stateTextAll = stateBlocks.join('\n');
    if (!stateBlocks.length) fail('state-diagram-missing', '信息架构§2 缺 stateDiagram 状态图');
    for (const e of detail.entities || []) {
      for (const s of e.states || []) {
        if (!stateTextAll.includes(s)) fail('state-diagram-consistency', `实体「${e.name}」的状态「${s}」未出现在信息架构状态图中（图与 detail.states 须一致）`);
      }
    }
  }
  // —— 技术架构：每条 NFR 落质量场景节 ——
  const techPath = join(archDir, '技术架构.md');
  const techText = readText(techPath);
  if (techText) {
    const qs = section(techText, /^##\s*3\s*质量场景/);
    if (!qs) fail('nfr-scenario-missing', '技术架构缺 §3 质量场景节（NFR→质量场景四元组映射）');
    else for (const id of legalIds) {
      if (!id.startsWith('NFR')) continue;
      if (!qs.includes(id)) fail('nfr-scenario-missing', `${id} 未出现在技术架构§3 质量场景（漏一条 NFR 门1 打回）`);
    }
  }
  // —— mermaid 源码级校验（替代 mmdc）：图形类型合法 ——
  const LEGAL_TYPES = /^(sequenceDiagram|flowchart|graph|erDiagram|stateDiagram|stateDiagram-v2|classDiagram|journey|gantt|pie|mindmap)\b/m;
  for (const doc of docs) {
    const text = readFileSync(join(archDir, doc), 'utf8');
    for (const b of mermaidBlocks(text)) {
      if (!LEGAL_TYPES.test(b)) fail('mermaid-type-invalid', `${doc} 含无法识别图型的 mermaid 块（首行：${b.split('\n')[0].slice(0, 40)}）`);
      const quotes = (b.match(/"/g) || []).length;
      if (quotes % 2 !== 0) fail('mermaid-syntax', `${doc} mermaid 块引号不配对（源码级校验，报错回喂重修）`);
    }
  }
}

// ---------- 应用架构：页面流转图节点对齐（升级为失败）+ gen 防漂移 ----------
const appPath = join(archDir, '应用架构.md');
if (hasDocPhase && detail) {
  const app = readText(appPath);
  if (app) {
    const pageNames = new Set((detail.pages || []).flatMap(p => [p.id, p.title].filter(Boolean)));
    let nodes = 0;
    for (const b of mermaidBlocks(app)) {
      if (!/^\s*(flowchart|graph)\b/m.test(b)) continue;
      for (const n of b.matchAll(/\["([^"]+)"\]|\("([^"]+)"\)/g)) {
        const label = (n[1] || n[2] || '').trim();
        if (!label) continue;
        nodes++;
        if (!pageNames.has(label)) fail('page-node-unknown', `应用架构页面流转图节点 "${label}" 不在 detail.json pages（id/title）中`);
      }
    }
    if (!nodes) fail('pageflow-diagram-missing', '应用架构未解析到页面流转图节点（§2 须配页面流转 flowchart）');
  }
  // —— likec4 gen mermaid 防漂移：gen 输出的标签行应出现在文档 mermaid 块中 ——
  const modelPath = join(archDir, 'model.c4');
  if (!existsSync(modelPath)) {
    fail('model-missing', '4A架构/ 缺 model.c4（LikeC4 模型源，系统上下文/容器图由它生成）');
  } else {
    try {
      const r = spawnSync('likec4', ['validate', archDir], { encoding: 'utf8', timeout: 120000 });
      if (r.error && r.error.code === 'ENOENT') {
        warn.push('likec4 CLI 未安装，model.c4 语法与 gen 防漂移未校验（npm i -g likec4 或项目内 npm i likec4）');
      } else if (r.status !== 0) {
        const brief = String(r.stdout || '').split('\n').filter(l => /Line|✗|Invalid/.test(l)).slice(0, 3).join(' ／ ');
        fail('likec4-invalid', `likec4 validate 失败：${brief || ('exit ' + r.status)}`);
      } else {
        // gen 防漂移（0.6.0）：model.c4 的元素标题与关系标题必须出现在四文档 mermaid 块中——
        // 模型改了标题/新增元素而文档未重新 likec4 gen mermaid 嵌入，即在此打回。
        // （不比对 gen 全输出：gen 会自动生成 index/landscape 视图，全量比对会误报。）
        try {
          const modelSrc = readFileSync(modelPath, 'utf8');
          const titles = [];
          for (const m of modelSrc.matchAll(/=\s*(?:actor|person|system|systemDb|systemQueue|container|component|group)\s+['"]([^'"\n]+)['"]/g)) titles.push(m[1]);
          for (const m of modelSrc.matchAll(/^\s*(?:actor|person|system|systemDb|systemQueue|container|component)\s+\w+\s+['"]([^'"\n]+)['"]/gm)) titles.push(m[1]);
          for (const m of modelSrc.matchAll(/->\s*\w+\s+['"]([^'"\n]+)['"]/g)) titles.push(m[1]);
          const docsText = docs.map(d => readFileSync(join(archDir, d), 'utf8')).join('\n');
          const docMermaid = mermaidBlocks(docsText).join('\n');
          const drifted = [...new Set(titles)].filter(t => t.length > 1 && !docMermaid.includes(t));
          if (drifted.length)
            fail('gen-drift', `model.c4 与文档内嵌图漂移：标题 [${drifted.slice(0, 5).join('、')}] 未出现在四文档 mermaid 块中（模型变更后必须重新 likec4 gen mermaid 嵌入 业务架构§5/应用架构§1）`);
        } catch (e) { warn.push(`gen 防漂移比对异常：${e.message}`); }
      }
    } catch (e) { warn.push(`likec4 校验执行异常：${e.message}`); }
  }
}

// ---------- PRD（prd/proto 阶段）----------
const prdDir = join(instance, 'PRD');
const designName = (basename(instance).match(/^\d{4}-\d{2}-\d{2}_(.+)$/) || [])[1] || null;
let ncCount = 0;
const acToFR = new Map(); // FR -> Set(AC id)
const moduleAcIds = {}; // module -> [{id, nn, line}]
if (hasPrdPhase) {
  if (!existsSync(prdDir)) {
    fail('prd-dir-missing', '实例缺 PRD/ 目录（阶段3-a prd-compose 产出）');
  } else {
    const prdFiles = readdirSync(prdDir).filter(f => f.endsWith('.md'));
    if (!prdFiles.length) fail('prd-empty', 'PRD/ 目录为空');
    const overviewFile = designName ? `PRD-${designName}.md` : null;
    if (!overviewFile || !existsSync(join(prdDir, overviewFile))) fail('prd-overview-missing', `缺总览文件 ${overviewFile || 'PRD-<设计名>.md'}`);
    const acIds = new Set();
    const corpusAll = [];
    const bannedZh = ['效率高', '交互完美', '优雅', '流畅'];
    const bannedEn = ['fast', 'easy', 'intuitive'];
    for (const f of prdFiles) {
      const text = readFileSync(join(prdDir, f), 'utf8');
      corpusAll.push(text);
      const head = text.split('\n').slice(0, 12).join('\n');
      if (!/版本\s*v\d+/.test(head)) fail('prd-version-line', `${f} 头部缺「版本 vN · 日期 · 摘要」行`);
      if (!/-\s*Input[：:]/.test(head)) fail('prd-input-missing', `${f} 头部缺 Input 溯源行（源自哪些 FR/GR/考题）`);
      else {
        const inputLine = head.split('\n').find(l => /-\s*Input[：:]/.test(l));
        if (!/\b(?:FR|GR)-\d{2,}\b|\bT-\d{2,}\b/.test(inputLine)) fail('prd-input-missing', `${f} Input 行未挂 FR/GR/T-xx 编号`);
      }
      if (/<!--/.test(text)) fail('prd-template-residue', `${f} 残留模板注释 <!-- -->（成文时必须删除）`);
      for (const l of text.split('\n')) {
        if (/<[^>|][^>\n]{0,40}>/.test(stripTags(l)) && !/^```/.test(l)) { fail('prd-placeholder', `${f} 占位残留：${l.trim().slice(0, 50)}`); break; }
      }
      ncCount += (text.match(/\[NEEDS CLARIFICATION/g) || []).length;
      const moduleHasIf = {};
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*[-*]?\s*(AC-[\w\u4e00-\u9fa5]+-\d{2,3})\s*\|/);
        if (!m) continue;
        const id = m[1];
        if (acIds.has(id)) fail('ac-duplicate', `AC 编号重复：${id}（${f}）`);
        acIds.add(id);
        const mod = id.split('-').slice(1, -1).join('-');
        const nn = +id.split('-').pop();
        (moduleAcIds[mod] = moduleAcIds[mod] || []).push({ id, nn });
        if (moduleHasIf[mod] === undefined) moduleHasIf[mod] = false;
        if (/^\s*[-*]?\s*AC-[\w\u4e00-\u9fa5]+-\d{2,3}\s*\|\s*IF\b/.test(line)) moduleHasIf[mod] = true;
        // EARS 五词（修 0.5.0 误杀：允许 THE 开头无条件式，对齐 Mavin 五句式）
        if (!/\bSHALL\b/.test(line) || !/\b(WHEN|IF|WHILE|WHERE|THE)\b/.test(line))
          fail('ac-ears-invalid', `${f} ${id} 不符合 EARS 句式（需 WHEN/IF/WHILE/WHERE/THE + SHALL）：${line.trim().slice(0, 60)}`);
        // AC 挂 FR/GR
        const frs = tokens(line, /\b(?:FR|NFR|GR)-\d{2,}\b/g);
        if (!frs.length) fail('ac-fr-missing', `${f} ${id} 未挂关联 FR/GR（AC 表末列）`);
        for (const fr of frs) {
          if (!acToFR.has(fr)) acToFR.set(fr, new Set());
          acToFR.get(fr).add(id);
        }
      }
      for (const [mod, ok] of Object.entries(moduleHasIf)) if (!ok) fail('module-if-ac-missing', `模块 ${mod}（${f}）无 IF 型异常 AC（每模块至少一条）`);
      for (const w of bannedZh) if (text.includes(w)) fail('prd-banned-phrase', `${f} 命中禁词「${w}」（改写为可观察界面行为）`);
      for (const w of bannedEn) if (new RegExp(`\\b${w}\\b`, 'i').test(text)) fail('prd-banned-phrase', `${f} 命中禁词「${w}」`);
    }
    // AC 编号模块内连续
    for (const [mod, list] of Object.entries(moduleAcIds)) {
      const nns = list.map(x => x.nn).sort((a, b) => a - b);
      for (let i = 1; i < nns.length; i++) if (nns[i] !== nns[i - 1] + 1) {
        fail('ac-numbering-gap', `模块 ${mod} AC 编号不连续（${String(nns[i - 1]).padStart(3, '0')} 之后是 ${String(nns[i]).padStart(3, '0')}）`);
        break;
      }
      if (nns.length > 30) fail('ac-over-limit', `模块 ${mod} 有 ${nns.length} 条 AC（上限 30）`);
    }
    // 每 FR ≥1 AC
    for (const id of legalIds) {
      if (id.startsWith('NFR')) continue;
      if (!acToFR.has(id)) fail('ac-fr-coverage', `${id} 无任何 AC 覆盖（每条功能需求至少一条验收标准）`);
    }
    // 总览
    if (overviewFile && existsSync(join(prdDir, overviewFile))) {
      const ov = readFileSync(join(prdDir, overviewFile), 'utf8');
      const linked = new Set(tokens(ov, /PRD-[\w\u4e00-\u9fa5-]+\.md/g));
      for (const ref of linked) if (!existsSync(join(prdDir, ref))) fail('prd-module-missing', `总览链接的模块文件不存在：${ref}`);
      for (const f of prdFiles) if (f !== overviewFile && !linked.has(f)) fail('prd-module-unlinked', `模块文件 ${f} 未在总览链接（总览↔模块文件须一一对应）`);
      // 全局状态清单五类
      const statesSec = section(ov, /^##\s*3\s*全局界面状态/);
      for (const s of ['空态', '无权限', '服务器异常', '重复提交', '内容被删'])
        if (!statesSec.includes(s)) fail('prd-states-missing', `总览§3 全局界面状态清单缺「${s}」`);
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
          if (!seenSep) continue;
          const cells = row.split('|').map(c => c.trim());
          const pageCell = cells[3];
          if (!pageCell || pageCell.length > 40) continue;
          for (const tok of splitList(pageCell)) {
            if (!names.has(tok)) fail('prd-page-unknown', `总览页面「${tok}」不在 detail.json pages 中`);
          }
        }
      }
    }
    if (detail) {
      const corpus = corpusAll.join('\n');
      for (const p of detail.pages || []) {
        const hit = (p.title && corpus.includes(p.title)) || (p.id && corpus.includes(p.id));
        if (!hit) fail('prd-page-missing', `detail 页面「${p.title || p.id}」在任何 PRD 文件中均未提及（漏页）`);
      }
    }
  }
}

// ---------- 原型（proto 阶段）----------
const protoDir = join(instance, '原型系统');
if (phase === 'proto') {
  if (!existsSync(protoDir)) {
    fail('proto-missing', '实例缺 原型系统/ 目录（4-a 产出）');
  } else {
    // manifest 三向一致
    const manifestPath = join(protoDir, 'manifest.json');
    const mf = readText(manifestPath);
    let manifest = null;
    if (!mf) {
      fail('manifest-missing', `${manifestPath} 缺失（4-a 必产：pages[].id/file/route/roles/ucIds）`);
    } else {
      try {
        manifest = JSON.parse(mf);
        if (!Array.isArray(manifest.pages) || !manifest.pages.length) fail('manifest-schema', 'manifest.pages 为空');
        for (const p of manifest.pages || []) {
          for (const k of ['id', 'file', 'roles']) if (!p[k]) fail('manifest-schema', `manifest 页面缺字段 ${k}：${JSON.stringify(p).slice(0, 60)}`);
        }
      } catch (e) { fail('manifest-schema', `manifest.json 解析失败：${e.message}`); }
    }
    if (manifest && detail) {
      const detailIds = new Set((detail.pages || []).map(p => p.id));
      const mfIds = new Set(manifest.pages.map(p => p.id));
      for (const id of detailIds) if (!mfIds.has(id)) fail('manifest-page-mismatch', `detail 页面 ${id} 未进 manifest（页面清单三向一致）`);
      for (const p of manifest.pages) {
        if (detailIds.size && !detailIds.has(p.id)) fail('manifest-page-mismatch', `manifest 页面 ${p.id} 不在 detail.json pages 中`);
        if (!existsSync(join(protoDir, p.file))) fail('manifest-page-mismatch', `manifest 页面 ${p.id} 的文件 ${p.file} 不存在（死链）`);
      }
    }
    // 懒惰模式静态扫描
    const LAZY_PATTERNS = [
      [/onclick="[^"]*alert\s*\(/i, 'alert 桩'],
      [/参考[^\n"{]{0,8}文档|详见[^\n"{]{0,14}(?:文档|PRD|架构|设计稿)/, '「参考文档」类占位'],
      [/待实现|敬请期待|coming\s+soon|暂未提供|占位符|placeholder/i, '未实现占位'],
      [/\bTODO\b/, 'TODO 残留'],
      [/href="#"/i, '假链 href="#"'],
    ];
    const relPath = (fp) => fp.startsWith(instance) ? fp.slice(instance.length + 1) : fp;
    const scanDir = (dir) => {
      for (const f of readdirSync(dir)) {
        const fp = join(dir, f);
        if (statSync(fp).isDirectory()) { if (f !== '.walk-locks') scanDir(fp); continue; }
        if (!/\.(html|js|css|vue)$/.test(f)) continue;
        const text = readFileSync(fp, 'utf8');
        for (const l of text.split('\n')) {
          for (const [re, label] of LAZY_PATTERNS) {
            if (re.test(l)) { fail('proto-lazy-pattern', `${relPath(fp)} 命中[${label}]：${l.trim().slice(0, 60)}`); }
          }
        }
      }
    };
    scanDir(protoDir);
  }
  // crawl 结果折叠（--crawl 提供时）
  if (crawlPath) {
    const cr = readText(resolve(crawlPath));
    if (!cr) fail('crawl-invalid', `crawl 报告不存在：${crawlPath}`);
    else {
      try {
        const j = JSON.parse(cr);
        if ((j.deadLinks || []).length) fail('crawl-deadlink', `死链 ${j.deadLinks.length} 处：${j.deadLinks.slice(0, 3).map(d => d.from + ' → ' + d.href).join('；')}`);
        if ((j.lazyHits || []).length) fail('crawl-lazy', `运行态懒惰命中 ${j.lazyHits.length} 处：${j.lazyHits.slice(0, 3).map(d => `${d.page}[${d.pattern}]`).join('；')}`);
      } catch (e) { fail('crawl-invalid', `crawl 报告解析失败：${e.message}`); }
    }
  } else {
    warn.push('未附 --crawl 报告（4-b 派发评委前必须跑 walk.mjs crawl 并附上，运行态死链/假链才闭环）');
  }
  // data.js 种子对齐抽查（启发式警告）
  if (detail) {
    const dataJs = readText(join(protoDir, 'data.js'));
    if (dataJs) {
      for (const s of detail.seedData || []) {
        if (s.entity && !dataJs.includes(s.entity)) warn.push(`data.js 未见种子实体「${s.entity}」（seedData 对齐交语义级核对）`);
      }
    } else warn.push('原型系统/ 无 data.js（单文件形态可豁免，种子对齐交语义级）');
  }
}

// ---------- 登记表判定线计算（--registry）----------
let registryStats = null;
if (doRegistry && registryText) {
  const rows = tableRows(registryText).filter(r => /^\|\s*(?:B|G|S)-\d+/.test(r));
  let openBlockers = 0, openGapIn = 0, openGuess = 0, backlog = 0, noStatus = 0;
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim());
    const type = cells[2] || '', status = cells[5] || '';
    if (!status) { noStatus++; continue; }
    const isOpen = /open/i.test(status);
    if (/backlog/i.test(status)) { backlog++; continue; }
    if (!isOpen) continue;
    if (/blocker/i.test(type)) openBlockers++;
    else if (/靠猜/.test(type)) openGuess++;
    else if (/gap/i.test(type)) openGapIn++;
  }
  if (noStatus) fail('registry-status-empty', `登记表 ${noStatus} 行状态列为空（open/fixed(RN)/backlog/已吸收→GR-xx）`);
  registryStats = { openBlockers, openGapIn, openGuess, backlog, passCandidate: openBlockers === 0 && openGapIn === 0 && openGuess === 0 };
}

// ---------- 结果（真跑凭证）----------
const inspected = [reqPath, termsPath, tracePath, detailPath, cardPath, legPath,
  ...(hasDocPhase && existsSync(archDir) ? docs.map(d => join(archDir, d)) : []),
  modelPathLite(),
  ...(existsSync(prdDir) ? readdirSync(prdDir).filter(f => f.endsWith('.md')).map(f => join(prdDir, f)) : []),
  join(protoDir, 'manifest.json'),
].filter(p => p && existsSync(p));
function modelPathLite() { return hasDocPhase ? join(archDir, 'model.c4') : null; }
const newestMtime = inspected.reduce((m, p) => { const t = statSync(p).mtimeMs; return t > m ? t : m; }, 0);
const result = { instance: basename(instance), phase,
  ranAt: new Date().toISOString(),
  newestSourceMtime: newestMtime ? new Date(newestMtime).toISOString() : null,
  needsClarification: ncCount,
  ...(registryStats ? { registry: registryStats } : {}),
  note: '本输出必须原样贴进修订记录；编排层核对 ranAt 晚于被检文件当前最新修改时间，否则视为未真跑',
  failures, warnings: warn, pass: failures.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
