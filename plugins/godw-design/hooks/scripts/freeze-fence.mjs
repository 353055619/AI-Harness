#!/usr/bin/env node
// godw-design 冻结围栏（PreToolUse · Edit|Write）
// 拦两类写入：① 已冻结实例的 原始需求.md（判据：同实例目录存在 身份卡.md = 阶段1 已结束）
//            ② history/snapshots/** 过门快照（证据不可改）
// 无实例/不命中 → 秒放行（exit 0）。拦下 → exit 2（PreToolUse = deny，本次写入不执行）。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const raw = await new Promise(r => { let s = ''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => r(s)); });

let input = {};
try { input = JSON.parse(raw); } catch { process.exit(0); } // 解析不了不拦（fail-open）
const ti = input.tool_input || input.toolInput || {};
const filePath = ti.file_path || ti.filePath || ti.path || '';
if (!filePath) process.exit(0);

const deny = (reason) => { console.error(`[godw-design 冻结围栏] ${reason}`); process.exit(2); };

// ① 快照不可改
if (/(design[\\/](change|archive)[\\/][^\\/]+[\\/]history[\\/]snapshots[\\/])/i.test(filePath)) {
  deny(`过门快照是验收证据，禁止写入：${filePath}`);
}

// ② 原始需求.md 冻结（身份卡.md 在 = 阶段1 已结束、需求已冻结）
if (/(^|[\\/])原始需求\.md$/.test(filePath) && /(design[\\/](change|archive)[\\/][^\\/]+)/i.test(filePath)) {
  const instDir = dirname(filePath);
  if (existsSync(join(instDir, '身份卡.md'))) {
    deny(`原始需求.md 已冻结（身份卡已产出），agent 无修改权；确需变更走用户手动带外 + 回流协议 v2：${filePath}`);
  }
}
process.exit(0);
