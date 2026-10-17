#!/usr/bin/env node
// render_gate.mjs — 渲染验收门：打开交付 html，收集运行时错误，三宽度截图，
// 检测横向溢出与图片完整性，可选交互冒烟；证据落盘，退出码裁决。
// 用法: node render_gate.mjs <deliverable.html> [--out <evidence-dir>] [--smoke]
// 退出码: 0=过门  2=不过门  1=门本身故障
// 依赖: Node >=22（内置 WebSocket）；本机 Chrome（探测顺序见 findChrome）

import { spawn as _spawn } from 'node:child_process';
import { mkdtempSync as _mkdtemp, rmSync as _rm } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const args = process.argv.slice(2);
const htmlArg = args.find((a, i) => i === 0 && !a.startsWith('--'));
const outArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const smoke = args.includes('--smoke');
if (!htmlArg) { console.error('用法: node render_gate.mjs <deliverable.html> [--out dir] [--smoke]'); process.exit(1); }
const htmlPath = path.resolve(htmlArg);
if (!fs.existsSync(htmlPath)) { console.error(`文件不存在: ${htmlPath}`); process.exit(1); }
const evidenceDir = path.resolve(outArg || path.join(path.dirname(htmlPath), 'render-gate-evidence'));
fs.mkdirSync(evidenceDir, { recursive: true });

function findChrome() {
  const candidates = [
    process.env.GODW_CHROME, process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

const WIDTHS = [375, 768, 1280];
const consoleErrors = [];   // {type, text}
const failedResources = []; // {url, errorText}
const pageErrors = [];      // {text}

function wire(sessionId, send) {
  // 返回一个分发器：把 CDP 事件喂进收集器
  return (msg) => {
    if (msg.sessionId !== sessionId) return;
    const { method, params } = msg;
    if (method === 'Runtime.exceptionThrown')
      pageErrors.push({ text: params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'unknown' });
    else if (method === 'Runtime.consoleAPICalled' && params.type === 'error')
      consoleErrors.push({ type: 'console.error', text: (params.args || []).map(a => a.value ?? a.description ?? '').join(' ') });
    else if (method === 'Log.entryAdded' && params.entry?.level === 'error')
      consoleErrors.push({ type: 'log.error', text: `${params.entry.text} (${params.entry.url || ''})` });
    else if (method === 'Network.loadingFailed')
      failedResources.push({ url: '', errorText: params.errorText, canceled: params.canceled });
    else if (method === 'Network.responseReceived')
      if (!send.__lastUrl) send.__lastUrl = {};
    if (method === 'Network.requestWillBeSent' && params.request?.url)
      if (failedResources.length && !failedResources[failedResources.length - 1].url)
        failedResources[failedResources.length - 1].url = params.request.url;
  };
}

async function main() {
  const chrome = findChrome();
  if (!chrome) { console.error('未找到 Chrome（设 GODW_CHROME 环境变量指向可执行文件）'); process.exit(1); }
  const profileDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'render-gate-'));
  const chromeProc = _spawn(chrome, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let wsBase;
  const stderrBuf = [];
  chromeProc.stderr.on('data', d => {
    stderrBuf.push(d.toString());
    const m = stderrBuf.join('').match(/DevTools listening on (ws:\/\/\S+)/);
    if (m && !wsBase) wsBase = m[1];
  });
  const t0 = Date.now();
  while (!wsBase) {
    if (Date.now() - t0 > 15000 || chromeProc.exitCode !== null) {
      console.error('Chrome 启动失败:', stderrBuf.join('').slice(-500)); process.exit(1);
    }
    await sleep(100);
  }

  const ws = new WebSocket(wsBase);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  try {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    listeners.push(wire(sessionId, send));
    for (const m of ['Page', 'Runtime', 'Log', 'Network']) await send(`${m}.enable`, {}, sessionId);
    const fileUrl = 'file://' + htmlPath;

    const perWidth = [];
    for (const width of WIDTHS) {
      consoleErrors.length = 0; failedResources.length = 0; pageErrors.length = 0;
      const height = width < 768 ? 812 : 900;
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }, sessionId);
      const loaded = new Promise(r => { const h = m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(h), 1); r(); } }; listeners.push(h); });
      await send('Page.navigate', { url: fileUrl }, sessionId);
      await Promise.race([loaded, sleep(8000)]);
      await sleep(400); // 渲染余量

      const evalOnce = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId)).result?.value;
      const hOverflow = await evalOnce(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 2`);
      const brokenImages = await evalOnce(`[...document.images].filter(i => !i.complete || i.naturalWidth === 0).length`);
      const imageTotal = await evalOnce(`document.images.length`);
      const textLen = await evalOnce(`(document.body.innerText || '').length`);

      const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const shotFile = path.join(evidenceDir, `shot-${width}.png`);
      fs.writeFileSync(shotFile, Buffer.from(shot.data, 'base64'));

      let smokeNote = null;
      if (smoke) {
        const before = pageErrors.length + consoleErrors.length;
        await evalOnce(`[...document.querySelectorAll('a,button')].slice(0,50).forEach(e => e.click()); 'clicked'`);
        await sleep(300);
        smokeNote = { clicked: true, newErrors: (pageErrors.length + consoleErrors.length) - before };
      }

      perWidth.push({
        width, hOverflow: !!hOverflow, brokenImages, imageTotal, textLen,
        consoleErrors: [...consoleErrors], pageErrors: [...pageErrors],
        failedResources: [...failedResources], ...(smokeNote ? { smoke: smokeNote } : {}),
        screenshot: path.relative(process.cwd(), shotFile),
      });
    }

    const failures = [];
    for (const w of perWidth) {
      if (w.hOverflow) failures.push(`${w.width}px 横向溢出`);
      if (w.brokenImages > 0) failures.push(`${w.width}px 有 ${w.brokenImages}/${w.imageTotal} 张图片未加载`);
      for (const e of [...w.consoleErrors, ...w.pageErrors]) failures.push(`${w.width}px 运行时错误: ${e.text?.slice(0, 160)}`);
      for (const r of w.failedResources) failures.push(`${w.width}px 资源加载失败: ${r.url || r.errorText}`);
      if (w.smoke && w.smoke.newErrors > 0) failures.push(`${w.width}px 交互冒烟新增 ${w.smoke.newErrors} 个错误`);
    }
    const evidence = {
      gate: 'render-gate', version: 1, file: htmlPath, timestamp: new Date().toISOString(),
      browser: path.basename(chrome), widths: WIDTHS, smoke,
      verdict: failures.length === 0 ? 'pass' : 'fail', failures, perWidth,
    };
    const evidenceFile = path.join(evidenceDir, 'render-gate.json');
    fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ verdict: evidence.verdict, failures, evidence: evidenceFile,
      screenshots: perWidth.map(p => p.screenshot) }, null, 2));
    process.exitCode = failures.length === 0 ? 0 : 2;
  } finally {
    try { await send('Browser.close'); } catch {}
    ws.close(); chromeProc.kill();
    await sleep(300); _rm(profileDir, { recursive: true, force: true });
  }
}
main().catch(e => { console.error('render-gate 故障:', e.message); process.exit(1); });
