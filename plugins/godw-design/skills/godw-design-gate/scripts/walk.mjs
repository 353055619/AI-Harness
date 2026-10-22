#!/usr/bin/env node
// godw-design-gate 原型走查器（v0.4.0）：证据即验收。
// 子 agent 用 bash 运行；无头浏览器按场景逐步执行原型，每步截图 + DOM 摘要写 trace.json（含 runId）。
// 答卷必须引用 runId 与证据路径，否则编排层作废重派（见 godw-design-gate SKILL 1.26/1.27）。
//
// 用法:
//   node walk.mjs doctor                 # 环境预检；退出码 0=可用，2=缺依赖（附安装指引，不降级）
//   node walk.mjs <scenario.json>        # 执行场景；退出码 0=完整跑完并出证据，2=走查器自身故障
//
// 场景 JSON:
// {
//   "prototype": "<原型系统/ 目录或 index.html 绝对路径>",
//   "evidence":  "<证据输出目录（如 history/evidence/gate-proto-3/<角色>）绝对路径>",
//   "role": "<角色名>",
//   "exams": [ { "qid": "T-01", "steps": [
//       { "action": "goto", "url": "index.html" },
//       { "action": "click", "target": "text=提交" },
//       { "action": "fill", "target": "#amount", "value": "100" },
//       { "action": "select", "target": "#type", "value": "A" },
//       { "action": "expect-text", "target": ".status", "contains": "审批中" },
//       { "action": "expect-count", "target": ".todo-item", "count": 2 },
//       { "action": "screenshot", "name": "extra" }
//   ] } ]
// }
// 环境变量: WALK_TIMEOUT_MS(单步超时，默认 8000)；WALK_CONCURRENCY(可选自限并发数，默认不限——并发自然上限=评委波次)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, extname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import os from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const TIMEOUT = +(process.env.WALK_TIMEOUT_MS || 8000);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

// playwright 可能装在走查器相邻（插件目录树）或目标项目（cwd）；ESM 不认 NODE_PATH，用 createRequire 双锚点解析
function loadPlaywright() {
  const attempts = [];
  for (const anchor of [import.meta.url, join(process.cwd(), 'package.json')]) {
    try { return { pw: createRequire(anchor)('playwright'), via: anchor === import.meta.url ? 'walker-adjacent' : 'project(cwd)' }; }
    catch (e) { attempts.push(`${anchor}: ${String(e.message).split('\n')[0]}`); }
  }
  return { pw: null, attempts };
}

function sanitize(name) {
  return String(name).replace(/[^\w\u4e00-\u9fa5.-]+/g, '_').slice(0, 60) || 'unnamed';
}

function startStaticServer(root) {
  return new Promise((done, fail) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = join(root, p === '/' ? 'index.html' : p.replace(/^\//, ''));
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      try {
        const body = readFileSync(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    });
    srv.once('error', fail);
    srv.listen(0, '127.0.0.1', () => done({ srv, port: srv.address().port }));
  });
}

// 可选自限并发：WALK_CONCURRENCY=N 时用目录锁占坑；默认不限（并发自然上限=评委波次 ≤6-7）
async function acquireSlot(root) {
  const n = parseInt(process.env.WALK_CONCURRENCY || 0);
  if (!(n > 0)) return null;
  const dir = join(root, '.walk-locks'); mkdirSync(dir, { recursive: true });
  const deadline = Date.now() + 5 * 60 * 1000;
  for (;;) {
    for (let i = 0; i < n; i++) {
      try { mkdirSync(join(dir, String(i))); return { dir: join(dir, String(i)) }; }
      catch { /* slot taken */ }
    }
    if (Date.now() > deadline) return null;
    await new Promise(r => setTimeout(r, 500));
  }
}
function releaseSlot(slot) { if (slot) { try { rmSync(slot.dir, { recursive: true }); } catch {} } }

function fail(msg, extra) {
  console.log(JSON.stringify({ ok: false, error: msg, ...(extra || {}) }, null, 2));
  process.exit(2);
}

// ---------------- doctor ----------------
async function doctor() {
  const report = {
    node: process.version, nodeOk: parseInt(process.version.slice(1)) >= 18,
    memoryGB: +(os.totalmem() / 2 ** 30).toFixed(1),
    playwright: null, playwrightVia: null, browsers: {}, guidance: [], suggestion: '',
  };
  const { pw, via, attempts } = loadPlaywright();
  if (!pw) {
    report.guidance.push('未找到 playwright。在目标项目根执行: npm i playwright');
    report.guidance.push(`解析尝试: ${attempts.join(' | ')}`);
  } else {
    report.playwrightVia = via;
    try { report.playwright = createRequire(join(HERE, 'noop.js'))('playwright/package.json').version; }
    catch { report.playwright = 'unknown'; }
    for (const channel of ['chrome', 'msedge']) {
      try { const b = await pw.chromium.launch({ channel, headless: true }); await b.close(); report.browsers[channel] = 'ok'; }
      catch { report.browsers[channel] = 'missing'; }
    }
    try { const b = await pw.chromium.launch({ headless: true }); await b.close(); report.browsers.chromium = 'ok'; }
    catch { report.browsers.chromium = 'missing'; }
    if (report.browsers.chromium === 'missing' && report.browsers.chrome === 'missing' && report.browsers.msedge === 'missing')
      report.guidance.push('无可用浏览器。装 Chrome/Edge，或: npx playwright install chromium');
  }
  if (report.memoryGB < 8) report.suggestion = `内存 ${report.memoryGB}GB 偏小，建议设 WALK_CONCURRENCY=2 自限并发`;
  const usable = !!(report.browsers.chrome === 'ok' || report.browsers.msedge === 'ok' || report.browsers.chromium === 'ok');
  console.log(JSON.stringify({ ok: report.nodeOk && !!pw && usable, ...report }, null, 2));
  process.exit(report.nodeOk && pw && usable ? 0 : 2);
}

// ---------------- run ----------------
async function run(scenarioPath) {
  if (!existsSync(scenarioPath)) fail(`场景文件不存在: ${scenarioPath}`);
  let sc;
  try { sc = JSON.parse(readFileSync(scenarioPath, 'utf8')); }
  catch (e) { fail(`场景 JSON 不合法: ${e.message}`); }
  for (const k of ['prototype', 'evidence', 'role', 'exams'])
    if (!sc[k]) fail(`场景缺少必填字段 "${k}"（需 prototype/evidence/role/exams）`);
  if (!Array.isArray(sc.exams) || !sc.exams.length) fail('exams 为空：至少一道考题');
  for (const ex of sc.exams)
    if (!ex.qid || !Array.isArray(ex.steps) || !ex.steps.length) fail(`考题 ${ex.qid || '(无 qid)'} 缺 qid 或 steps`);

  const protoPath = resolve(sc.prototype);
  const protoRoot = existsSync(protoPath) && statSync(protoPath).isDirectory() ? protoPath : dirname(protoPath);
  if (!existsSync(protoRoot)) fail(`原型路径不存在: ${protoPath}`);
  const evidence = resolve(sc.evidence);
  mkdirSync(evidence, { recursive: true });

  const { pw, attempts } = loadPlaywright();
  if (!pw) fail('未找到 playwright，先在目标项目执行: npm i playwright', { attempts });

  let channel;
  for (const c of ['chrome', 'msedge', undefined]) {
    try { const b = await pw.chromium.launch(c ? { channel: c, headless: true } : { headless: true }); await b.close(); channel = c || 'bundled-chromium'; break; }
    catch { /* next */ }
  }
  if (!channel) fail('无可用浏览器（Chrome/Edge/chromium 都启动失败）。装 Chrome/Edge，或: npx playwright install chromium');

  const slot = await acquireSlot(evidence);
  const { srv, port } = await startStaticServer(protoRoot);
  const base = `http://127.0.0.1:${port}/`;
  const runId = `walk-${Date.now().toString(36)}-${process.pid}`;
  const trace = { runId, startedAt: new Date().toISOString(), scenario: scenarioPath,
    prototype: protoRoot, role: sc.role, channel, concurrency: process.env.WALK_CONCURRENCY || 'unlimited', exams: [] };

  const browser = await pw.chromium.launch(channel.startsWith('bundled') ? { headless: true } : { channel, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let shotSeq = 0;

  try {
    for (const ex of sc.exams) {
      const dir = join(evidence, sanitize(sc.role), sanitize(ex.qid));
      mkdirSync(dir, { recursive: true });
      const exam = { qid: ex.qid, dir, steps: [], pageErrors: [], result: 'pass' };
      const page = await context.newPage();
      page.setDefaultTimeout(TIMEOUT);
      page.on('pageerror', e => exam.pageErrors.push(`pageerror: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error' && !m.location()?.url?.includes('favicon')) exam.pageErrors.push(`console.error: ${m.text()}`); });
      page.on('requestfailed', r => exam.pageErrors.push(`requestfailed: ${r.url()}`));

      for (let i = 0; i < ex.steps.length; i++) {
        const st = ex.steps[i];
        const rec = { i: i + 1, action: st.action, target: st.target || st.url || st.name || '', ok: false, error: null, url: '', dom: '', shots: [] };
        exam.steps.push(rec);
        if (exam.result === 'failed') { rec.ok = null; rec.error = 'skipped（同题前序步骤失败后不再执行）'; continue; }
        try {
          if (st.action === 'goto') {
            const url = st.url.startsWith('http') ? st.url : base + String(st.url).replace(/^\//, '');
            await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT });
            const full = join(dir, `page-${String(++shotSeq).padStart(2, '0')}-full.png`);
            await page.screenshot({ path: full, fullPage: true }).catch(() => {});
            rec.shots.push(basename(full));
          } else if (st.action === 'click') {
            await page.click(st.target, { timeout: TIMEOUT });
          } else if (st.action === 'fill') {
            await page.fill(st.target, String(st.value ?? ''), { timeout: TIMEOUT });
          } else if (st.action === 'select') {
            await page.selectOption(st.target, String(st.value ?? ''), { timeout: TIMEOUT });
          } else if (st.action === 'expect-text') {
            const scope = st.target ? await page.locator(st.target) : page.locator('body');
            const text = await scope.innerText({ timeout: TIMEOUT });
            if (!text.includes(st.contains)) throw new Error(`期望文本未出现: "${st.contains}"`);
          } else if (st.action === 'expect-count') {
            const n = await page.locator(st.target).count();
            if (n !== st.count) throw new Error(`期望数量 ${st.count}，实际 ${n}`);
          } else if (st.action === 'screenshot') {
            const f = join(dir, `${sanitize(st.name || 'shot')}.png`);
            await page.screenshot({ path: f, fullPage: true }).catch(() => {});
            rec.shots.push(basename(f));
          } else {
            throw new Error(`未知动作 "${st.action}"（词表: goto/click/fill/select/expect-text/expect-count/screenshot）`);
          }
          rec.ok = true;
        } catch (e) {
          rec.ok = false; rec.error = String(e.message).split('\n')[0];
          exam.result = 'failed';
        }
        try {
          const shot = join(dir, `step-${String(i + 1).padStart(2, '0')}.png`);
          await page.screenshot({ path: shot }).catch(() => {});
          rec.shots.push(basename(shot));
          rec.url = page.url();
          rec.dom = (await page.locator('body').innerText({ timeout: 2000 }).catch(() => '')).slice(0, 300);
        } catch { /* 页面崩溃时证据尽力而为 */ }
      }
      await page.close();
      trace.exams.push(exam);
    }
  } finally {
    trace.finishedAt = new Date().toISOString();
    for (const ex of trace.exams) if (ex.pageErrors.length && ex.result === 'pass') ex.result = 'pass-with-errors';
    try { writeFileSync(join(evidence, `trace-${trace.runId}.json`), JSON.stringify(trace, null, 2)); } catch (e) { console.error('trace 写入失败:', e.message); }
    await browser.close().catch(() => {});
    srv.close();
    releaseSlot(slot);
  }
  console.log(JSON.stringify({ ok: true, runId, evidence, exams: trace.exams.length,
    failed: trace.exams.filter(e => e.result === 'failed').length,
    trace: join(evidence, `trace-${trace.runId}.json`) }, null, 2));
  process.exit(0);
}

const arg = process.argv[2];
if (!arg || arg === '-h' || arg === '--help') {
  console.log('用法: node walk.mjs doctor | node walk.mjs <scenario.json>');
  process.exit(arg ? 0 : 1);
}
(arg === 'doctor' ? doctor() : run(resolve(arg))).catch(e => fail(e.stack || e.message));
