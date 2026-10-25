// 悬赏厅完整卷 · 共享脚本（app.js）：角色登录态、顶栏骨架、通用工具与消息落库
'use strict';
// 采纳窗口（小时）。考题 T-05 会把 72 改成 24 验证过期拦截与提示文案
const WINDOW_HOURS = 72;
const DB = window.DB;
const ROLES = ['楼主', '回答者', '平台运营'];

function currentRole() {
  try { return localStorage.getItem('悬赏厅-角色') || '楼主'; } catch (e) { return '楼主'; }
}
function switchRole(r) {
  try { localStorage.setItem('悬赏厅-角色', r); } catch (e) { /* 无痕模式下仅本页生效 */ }
  location.reload();
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(hoursAgo) {
  const d = new Date(Date.now() - hoursAgo * 3600 * 1000);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function isExpired(b) { return b.hoursAgo >= WINDOW_HOURS; }
function answersOf(bid) { return DB.回答单.filter((a) => a.所属悬赏 === bid); }
function unreadCount() {
  const r = currentRole();
  return DB.消息记录.filter((m) => m.接收角色 === r && m.状态 === '未读').length;
}
function addMsg(类型, 内容, 接收角色, 关联单据) {
  DB.消息记录.unshift({
    id: 'M-' + (5100 + Math.floor(Math.random() * 800)),
    类型, 内容, 接收角色, 关联单据, hoursAgo: 0, 状态: '未读'
  });
}
function toast(msg) {
  const t = document.querySelector('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), 2600);
}

// 顶栏骨架：按角色收敛入口（我的悬赏仅楼主、消息通知仅楼主与回答者）
function mountHeader(active, prefix) {
  const role = currentRole();
  const unread = unreadCount();
  let nav = '<a href="' + prefix + 'bounty-list.html"' + (active === 'bounty-list' ? ' class="active"' : '') + '>悬赏列表</a>';
  if (role === '楼主') {
    nav += '<a href="' + prefix + 'my-bounty.html"' + (active === 'my-bounty' ? ' class="active"' : '') + '>我的悬赏</a>';
  }
  if (role === '楼主' || role === '回答者') {
    nav += '<a href="' + prefix + 'notify.html"' + (active === 'notify' ? ' class="active"' : '') + '>消息通知' + (unread ? '<span class="count">' + unread + '</span>' : '') + '</a>';
  }
  let roleBtns = '';
  for (const r of ROLES) {
    roleBtns += '<button type="button" data-role="' + r + '"' + (r === role ? ' class="on"' : '') + '>' + r + '</button>';
  }
  const balance = role === '平台运营' ? '值班中' : role + ' 可用积分 ' + DB.账户[role];
  document.querySelector('#topbar').innerHTML =
    '<h1>悬赏厅（完整卷）</h1><nav>' + nav + '</nav>' +
    '<div class="rolebar"><span>角色</span>' + roleBtns + '<span>' + esc(balance) + '</span></div>';
  document.querySelectorAll('#topbar .rolebar button').forEach((b) => b.addEventListener('click', () => switchRole(b.dataset.role)));
}

// 悬赏卡片渲染（list 与 my-bounty 共用）；clickable 为真时整卡进详情
function bountyCard(b, clickable) {
  const n = answersOf(b.id).length;
  const role = currentRole();
  let extra = '';
  if (role === '平台运营' && b.状态 === '进行中') {
    extra = ' <button type="button" class="danger" data-takedown="' + b.id + '" style="margin-top:0">下架</button>';
  }
  return '<div class="card' + (clickable ? ' clickable' : '') + '" data-id="' + b.id + '">'
    + '<div class="row1"><h3>' + esc(b.标题) + '</h3><span class="points">' + b.积分 + ' 积分</span></div>'
    + '<div><span class="badge ' + b.状态 + '">' + b.状态 + '</span>'
    + (isExpired(b) && b.状态 === '进行中' ? '<span class="badge 已下架">已过采纳窗口</span>' : '')
    + '<span class="muted"> 回答 ' + n + ' 条 · 发布于 ' + fmtTime(b.hoursAgo) + ' · 采纳截止 ' + fmtTime(b.hoursAgo + WINDOW_HOURS) + '</span>' + extra + '</div>'
    + (b.状态 === '已下架' ? '<div class="muted" style="margin-top:6px">下架原因：' + esc(b.下架原因 || '治理复核') + '</div>' : '')
    + '</div>';
}
