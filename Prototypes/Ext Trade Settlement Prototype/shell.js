/* Shell: sidebar, top bar, routing and the unified Maker Checker. Counterparties, Whitelists and Approvals detail run in cp.js; Settlement Instructions in si.js. */
(function () {
  const USERS = Shared.USERS;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const Shell = window.Shell = { active: 'shell', cur: USERS[0], render: () => render() };
  const isOp = () => Shell.cur.role === 'operator';
  let ROUTE = { path: '', query: {}, parts: [], id: null };
  let APF = '';

  function parseHash() {
    const h = location.hash.replace(/^#/, '') || (isOp() ? '/counterparties' : '/si');
    const [path, qs] = h.split('?');
    const query = {};
    (qs || '').split('&').filter(Boolean).forEach(p => { const i = p.indexOf('='); query[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    const parts = path.split('/').filter(Boolean);
    return { path, query, parts, id: parts[1] && parts[1] !== 'create' ? parts[1] : null };
  }
  const CLIENT_OK = ['si', 'balances', 'client-whitelists'];

  /* ---- sidebar: mirrors the Operator UI (flat top-level items, Transaction Management as a group) */
  function menuHtml() {
    const cur = ROUTE.path, p0 = ROUTE.parts[0];
    if (!isOp()) {
      const it = (label, href, on) => (href ? '<a class="menu-item' + (on ? ' active' : '') + '" href="' + href + '">' : '<div class="menu-item disabled">') + esc(label) + (href ? '</a>' : '</div>');
      return '<div class="menu-group"><div class="menu-group-title"><span class="ico">⇄</span> Transactions</div>' + it('Deposit') + it('Withdrawal') +
        it('Settlement Instructions', '#/si', p0 === 'si') + it('Whitelists', '#/client-whitelists', p0 === 'client-whitelists') + it('Balances', '#/balances', p0 === 'balances') + '</div>';
    }
    const top = (ico, label, href, active, badge) => (href ? '<a class="menu-item top' + (active ? ' active' : '') + '" href="' + href + '">' : '<div class="menu-item top disabled">') + '<span class="ico">' + ico + '</span>' + esc(label) + (badge ? '<span class="menu-badge">' + badge + '</span>' : '') + (href ? '</a>' : '</div>');
    const sub = (label, href, active) => (href ? '<a class="menu-item sub' + (active ? ' active' : '') + '" href="' + href + '">' : '<div class="menu-item sub disabled">') + esc(label) + (href ? '</a>' : '</div>');
    const div = '<div class="menu-divider"></div>';
    const grp = (ico, label, kids) => '<div class="menu-item top group disabled"><span class="ico">' + ico + '</span>' + esc(label) + '<span class="chev">▾</span></div>' + kids;
    const pending = CPApp.pendingCount() + SIApp.pendingCount();
    return top('✓', 'Approvals', '#/approvals', p0 === 'approvals', pending || '') + div +
      top('☰', 'Account Management') +
      top('▤', 'Whitelist Management', '#/whitelists/addresses', p0 === 'whitelists') +
      top('◉', 'Counterparty Management', '#/counterparties', p0 === 'counterparties') +
      top('☷', 'User Management') + top('▦', 'Report Management') + top('▣', 'Venue Management') +
      grp('◫', 'Venue Group Allocation', '') +
      grp('⇄', 'Movement Management', sub('Incoming Movement', '#/movement-management/incoming-movement/token', ROUTE.parts[1] === 'incoming-movement' && p0 === 'movement-management') + sub('Outgoing Movement', '#/movement-management/outgoing-movement/token', ROUTE.parts[1] === 'outgoing-movement' && p0 === 'movement-management')) +
      grp('⇄', 'Transaction Management', sub('Deposit') + sub('Withdrawal') + sub('Rebalances') + sub('Settlement Instructions', '#/si', p0 === 'si' || p0 === 'exceptions')) +
      top('‹›', 'Webhook Management') + div + top('⚙', 'System') + top('⇪', 'Batch Import') + top('≣', 'Audit Logs') + div +
      '<div class="menu-label">Prototype only</div>' + top('▤', 'Balances', '#/balances', p0 === 'balances') + top('⚑', 'Demo controls', '#/demo', p0 === 'demo');
  }

  /* ---- unified Maker Checker: counterparty, whitelist and settlement instruction requests in one list */
  function approvalsView() {
    const rows = CPApp.requestRows().map(r => Object.assign({ kind: 'Counterparty / Whitelist' }, r)).concat(SIApp.requestRows().map(r => Object.assign({ kind: 'Settlement' }, r)))
      .filter(r => !APF || r.status === APF).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const dateTxt = (d) => { const x = new Date(d); return isNaN(x) ? '-' : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + '<div class="sub">' + x.toLocaleTimeString('en-GB') + '</div>'; };
    const st = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
    const dot = { pending: 'processing', approved: 'success', rejected: 'error' };
    const body = rows.length ? rows.map(r => '<tr class="click" data-href="#/approvals/' + r.id + '"><td>' + esc(r.title) + '<div class="sub">' + esc(r.id) + '</div></td><td>' + r.subject + '</td><td>' + esc(r.maker) + '</td><td>' + dateTxt(r.createdAt) + '</td><td><span class="badge ' + dot[r.status] + '"><i></i>' + st[r.status] + '</span></td></tr>').join('')
      : '<tr><td colspan="5"><div class="empty">No requests.</div></td></tr>';
    const filters = '<div class="filters"><div class="f"><select class="select" data-shell-change="apprFilter"><option value="">Status</option>' + Object.keys(st).map(k => '<option value="' + k + '"' + (APF === k ? ' selected' : '') + '>' + st[k] + '</option>').join('') + '</select></div></div>';
    return { title: 'Maker Checker', crumbs: ['Dashboard', 'Approvals'], buttons: '', html: filters + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Subject</th><th>Maker</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' + body + '</tbody></table></div>' };
  }

  function resolve() {
    const p = ROUTE.parts;
    if (!isOp() && !CLIENT_OK.includes(p[0])) { location.replace('#/si'); return null; }
    if (p[0] === 'approvals') {
      if (!p[1]) { Shell.active = 'shell'; return approvalsView(); }
      const app = CPApp.hasRequest(p[1]) ? CPApp : SIApp.hasRequest(p[1]) ? SIApp : null;
      if (!app) { Shell.active = 'shell'; return { title: 'Not found', crumbs: ['Dashboard', 'Approvals'], buttons: '', html: '<div class="empty">Request not found. <a href="#/approvals">Back</a></div>' }; }
      Shell.active = app.name; app.setRoute(ROUTE); return app.requestDetail(p[1]);
    }
    const app = ['counterparties', 'whitelists', 'client-whitelists'].includes(p[0]) ? CPApp : ['si', 'exceptions', 'balances', 'demo', 'movement-management'].includes(p[0]) ? SIApp : null;
    if (!app) { location.replace(isOp() ? '#/counterparties' : '#/si'); return null; }
    Shell.active = app.name; app.setRoute(ROUTE);
    return app.resolveView();
  }

  function render() {
    ROUTE = parseHash();
    const ae = document.activeElement;
    const focus = ae && ae.id ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    const view = resolve();
    if (!view) return;
    const crumbs = (view.crumbs || []).map((c, i, a) => i < a.length - 1 ? '<a>' + esc(c) + '</a>' : esc(c)).join(' / ');
    document.getElementById('app').innerHTML =
      '<div class="sider' + (isOp() ? ' dark' : '') + '"><div class="logo"><span>◆</span> ' + (isOp() ? 'Operator UI' : 'Asset Management') + '</div><div class="menu">' + menuHtml() + '</div></div>' +
      '<div class="main"><div class="topbar"><div class="demo-note">Prototype: Counterparties, Whitelists, Settlement Instructions and Movements. Today in the demo: <b>' + esc(SIApp.today()) + '</b> <button class="btn btn-sm" data-shell-act="advDay">Advance 1 day</button></div>' +
      '<div class="right"><label>View as</label><select class="select" id="user-switch" style="width:260px">' + USERS.map(u => '<option value="' + u.id + '"' + (u.id === Shell.cur.id ? ' selected' : '') + '>' + esc(u.label) + '</option>').join('') + '</select>' +
      '<button class="btn" data-shell-act="resetDemo">Reset demo data</button></div></div>' +
      '<div class="page-head"><div class="breadcrumb">' + crumbs + '</div><div class="title-row"><div><div class="page-title">' + esc(view.title) + '</div>' +
      (view.sub ? '<div class="page-sub">' + view.sub + '</div>' : '') + '</div><div class="header-buttons">' + (view.buttons || '') + '</div></div></div>' +
      '<div class="content" id="content">' + view.html + '</div></div>';
    if (view.bind) view.bind(document.getElementById('content'));
    if (focus) {
      const el = document.getElementById(focus.id);
      if (el && el.tagName !== 'SELECT') { el.focus(); try { el.setSelectionRange(focus.s, focus.e); } catch (x) { /* ignore */ } }
    }
  }

  function setUser(u) { Shell.cur = u; CPApp.setUser(u); SIApp.setUser(u); try { sessionStorage.setItem('ets-user', u.id); } catch (x) { /* ignore */ } }
  const closeAll = () => { CPApp.closeOverlays(); SIApp.closeOverlays(); };

  const root = document.getElementById('app');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shell-act]');
    if (!b) return;
    if (b.dataset.shellAct === 'advDay') { SIApp.advance(1); CPApp.toast({ title: 'Date advanced', desc: 'Simulated date is now ' + SIApp.today() + '. Eligible positions ran.' }); render(); }
    if (b.dataset.shellAct === 'resetDemo') { closeAll(); CPApp.reset(); SIApp.reset(); location.hash = isOp() ? '#/counterparties' : '#/si'; render(); CPApp.toast({ title: 'Demo data reset' }); }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'user-switch') {
      setUser(USERS.find(u => u.id === t.value)); closeAll(); CPApp.resetUi(); SIApp.resetUi();
      if (!isOp() && !CLIENT_OK.includes(ROUTE.parts[0])) location.hash = '#/si';
      else if (!isOp() && ROUTE.parts[0] === 'si' && ROUTE.parts[1]) location.hash = '#/si';
      render(); return;
    }
    if (t.dataset.shellChange === 'apprFilter') { APF = t.value; render(); }
  });
  window.addEventListener('hashchange', () => {
    const next = parseHash();
    if (next.path !== ROUTE.path) { closeAll(); const c = document.getElementById('content'); if (c) c.scrollTop = 0; }
    render();
  });

  (function init() {
    let u = USERS[0]; try { const id = sessionStorage.getItem('ets-user'); if (id) u = USERS.find(x => x.id === id) || u; } catch (x) { /* ignore */ }
    CPApp.load(); SIApp.load(); setUser(u);
    ROUTE = parseHash();
    render();
  })();
})();
