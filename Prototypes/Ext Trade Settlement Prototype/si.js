(function () {
const Shared = window.Shared;
/* UI helpers: escaping, formatting, toast, modal, drawer, small components */

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false });
}
function dateCell(iso) {
  if (!iso) return '-';
  return esc(fmtDate(iso)) + '<div class="sub">' + esc(fmtTime(iso)) + '</div>';
}

const BADGE = {
  active: 'success', suspended: 'warning', closed: 'default', rejected: 'error', under_review: 'processing',
  retired: 'default', pending: 'processing', approved: 'success'
};
function badge(status, labels) {
  const l = (labels && labels[status]) || String(status).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  return '<span class="badge ' + (BADGE[status] || 'default') + '">' + esc(l) + '</span>';
}
function tag(text, cls) { return '<span class="tag ' + (cls || '') + '">' + esc(text) + '</span>'; }

/* Toast */
function toast(opts) {
  const root = document.getElementById('toast-root');
  const n = document.createElement('div');
  n.className = 'toast' + (opts.type === 'error' ? ' error' : '');
  n.innerHTML = '<div class="t-title">' + esc(opts.title) + '</div>' + (opts.desc ? '<div class="t-desc">' + esc(opts.desc) + '</div>' : '') +
    (opts.button ? '<button class="btn btn-primary btn-sm t-btn">' + esc(opts.button.label) + '</button>' : '');
  root.appendChild(n);
  if (opts.button) n.querySelector('.t-btn').addEventListener('click', () => { opts.button.onClick(); n.remove(); });
  setTimeout(() => n.remove(), opts.type === 'error' ? 7000 : 5000);
}

/* Overlay stack */
const overlays = [];
function closeTopOverlay() {
  const o = overlays.pop();
  if (o) o.remove();
}
function closeAllOverlays() {
  while (overlays.length) overlays.pop().remove();
}

/* Modal: { title, sub, body (html), okText, okDanger, cancelText, wide, onMount(root), onOk(root) -> false keeps open } */
function openModal(opts) {
  const root = document.getElementById('overlay-root');
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = '<div class="modal' + (opts.wide ? ' wide' : '') + '">' +
    '<div class="modal-head">' + esc(opts.title) + '</div>' +
    (opts.sub ? '<div class="modal-sub">' + esc(opts.sub) + '</div>' : '') +
    '<div class="modal-body">' + opts.body + '</div>' +
    '<div class="modal-foot"><button class="btn" data-m="cancel">' + esc(opts.cancelText || 'Cancel') + '</button>' +
    (opts.okText ? '<button class="btn ' + (opts.okDanger ? 'btn-danger' : 'btn-primary') + '" data-m="ok">' + esc(opts.okText) + '</button>' : '') +
    '</div></div>';
  root.appendChild(o);
  overlays.push(o);
  o.querySelector('[data-m="cancel"]').addEventListener('click', () => { closeOverlay(o); if (opts.onCancel) opts.onCancel(); });
  const ok = o.querySelector('[data-m="ok"]');
  if (ok) ok.addEventListener('click', () => {
    const res = opts.onOk ? opts.onOk(o) : true;
    if (res !== false) closeOverlay(o);
  });
  if (opts.onMount) opts.onMount(o);
  return o;
}
function closeOverlay(o) {
  const i = overlays.indexOf(o);
  if (i >= 0) overlays.splice(i, 1);
  o.remove();
}

/* Drawer: { title, body, okText, cancelText, onMount(root), onOk(root) -> false keeps open, footExtra } */
function openDrawer(opts) {
  const root = document.getElementById('overlay-root');
  const o = document.createElement('div');
  o.className = 'drawer-overlay';
  o.innerHTML = '<div class="drawer"><div class="drawer-head"><span>' + esc(opts.title) + '</span><button class="x" data-m="cancel">×</button></div>' +
    '<div class="drawer-body">' + opts.body + '</div>' +
    '<div class="drawer-foot"><button class="btn" data-m="cancel">' + esc(opts.cancelText || 'Close') + '</button>' +
    (opts.extraButtons || '') +
    (opts.okText ? '<button class="btn btn-primary" data-m="ok">' + esc(opts.okText) + '</button>' : '') + '</div></div>';
  root.appendChild(o);
  overlays.push(o);
  o.addEventListener('mousedown', (e) => { if (e.target === o) closeOverlay(o); });
  o.querySelectorAll('[data-m="cancel"]').forEach(b => b.addEventListener('click', () => closeOverlay(o)));
  const ok = o.querySelector('[data-m="ok"]');
  if (ok) ok.addEventListener('click', () => {
    const res = opts.onOk ? opts.onOk(o) : true;
    if (res !== false) closeOverlay(o);
  });
  if (opts.onMount) opts.onMount(o);
  return o;
}

/* Form building blocks */
function formItem(label, control, o) {
  o = o || {};
  return '<div class="form-item"' + (o.id ? ' id="fi-' + o.id + '"' : '') + '><label>' +
    (o.required ? '<span class="req">*</span>' : '') + esc(label) +
    (o.optional ? '<span class="opt">(Optional)</span>' : '') +
    (o.tip ? '<span class="tip" title="' + esc(o.tip) + '">?</span>' : '') +
    '</label>' + control +
    (o.hint ? '<div class="hint">' + esc(o.hint) + '</div>' : '') +
    '<div class="help' + (o.warn ? ' warn' : '') + '" data-help="' + (o.id || '') + '">' + esc(o.error || '') + '</div></div>';
}
function inputHtml(id, value, o) {
  o = o || {};
  return '<input class="input' + (o.error ? ' err' : '') + '" id="' + id + '" data-f="' + id + '" value="' + esc(value) + '" placeholder="' + esc(o.placeholder || '') + '"' + (o.disabled ? ' disabled' : '') + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + '>';
}
function textareaHtml(id, value, o) {
  o = o || {};
  return '<textarea class="textarea' + (o.error ? ' err' : '') + '" id="' + id + '" data-f="' + id + '" placeholder="' + esc(o.placeholder || '') + '"' + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + '>' + esc(value) + '</textarea>';
}
function selectHtml(id, value, options, o) {
  o = o || {};
  const opts = options.map(x => {
    const v = Array.isArray(x) ? x[0] : x;
    const l = Array.isArray(x) ? x[1] : x;
    return '<option value="' + esc(v) + '"' + (v === value ? ' selected' : '') + '>' + esc(l) + '</option>';
  }).join('');
  return '<select class="select' + (o.error ? ' err' : '') + '" id="' + id + '" data-f="' + id + '"' + (o.disabled ? ' disabled' : '') + '><option value="">' + esc(o.placeholder || 'Select') + '</option>' + opts + '</select>';
}
function switchHtml(id, on) {
  return '<button type="button" class="switch' + (on ? ' on' : '') + '" id="' + id + '" data-switch="' + id + '"></button>';
}
function sectionTitle(t, d) {
  return '<div class="section-title">' + esc(t) + '</div>' + (d ? '<div class="section-desc">' + esc(d) + '</div>' : '');
}

/* Descriptions list: items = [[label, valueHtml]] */
function dl(items) {
  return '<div class="dl">' + items.map(i => '<div class="item"><div class="k">' + esc(i[0]) + '</div><div class="v">' + i[1] + '</div></div>').join('') + '</div>';
}

/* Multi select (filters). Opened state held in UI.ms */
const UI = { ms: null };
function multiSelect(id, label, options, selected) {
  const open = UI.ms === id;
  const text = selected.length ? label + ': ' + selected.length + ' selected' : label;
  return '<div class="ms f" data-ms-root="' + id + '"><button type="button" class="ms-btn' + (selected.length ? '' : ' ph') + '" data-ms="' + id + '"><span>' + esc(text) + '</span><span>▾</span></button>' +
    (open ? '<div class="ms-pop">' + options.map(o => '<label class="ms-opt"><input type="checkbox" data-ms-opt="' + id + '" value="' + esc(o[0]) + '"' + (selected.includes(o[0]) ? ' checked' : '') + '> ' + esc(o[1]) + '</label>').join('') + '</div>' : '') + '</div>';
}

function csvDownload(filename, rows) {
  const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function b64e(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64d(s) {
  try {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  } catch (e) { return null; }
}

/* Settlement Instruction prototype: reference data, state and the settlement engine (PRD - Settlement Instruction) */

const amountOk = (amt, asset) => { const d = (ASSETS[asset] || { dec: 8 }).dec; return Math.abs(Math.round(amt * Math.pow(10, d)) - amt * Math.pow(10, d)) < 1e-6; };
const ASSETS = { SGD: { dec: 2, fiat: true }, USD: { dec: 2, fiat: true }, BTC: { dec: 8 }, UNIT: { dec: 4 }, TOKEN: { dec: 2 } };
const USERS = Shared.USERS;
const ACCOUNTS = [
  { id: 'a1', name: 'Acme Main Account', number: 'A-2345-6789-0123-9', entity: 'Acme Capital Pte Ltd' },
  { id: 'a2', name: 'Acme Treasury', number: 'A-2345-6789-0456-1', entity: 'Acme Capital Pte Ltd' },
  { id: 'a3', name: 'Zenith Trading Main', number: 'A-7712-3345-9081-2', entity: 'Zenith Trading Ltd' },
  { id: 'a4', name: 'House Account', number: 'A-1000-0000-0001-4', entity: 'HydraX House', mayOverCommit: true },
  { id: 'a5', name: 'Fee Account', number: 'A-1000-0000-0002-2', entity: 'HydraX House' },
  { id: 'a6', name: 'Atlas Capital Buyer Account', number: 'A-4410-2201-0001-7', entity: 'Atlas Capital Pte Ltd' },
  { id: 'a7', name: 'Beacon Trading Seller Account', number: 'A-5520-3302-0001-5', entity: 'Beacon Trading Pte Ltd' },
  { id: 'a8', name: 'Orbit Exchange Fee Account', number: 'A-6630-4403-0001-3', entity: 'Orbit Exchange Ltd' }
];
const VENUES = [
  { id: 'v1', name: 'Bank Venue V', kind: 'fiat', account: '0123-456789-001', assets: ['SGD', 'USD'] },
  { id: 'v2', name: 'Token Venue W', kind: 'hot_wallet', assets: ['BTC', 'UNIT', 'TOKEN'], address: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d' },
  { id: 'v3', name: 'Bank Venue X', kind: 'fiat', account: '0456-778899-002', assets: ['SGD'] },
  { id: 'v4', name: 'Cold Wallet Y', kind: 'cold_wallet', assets: ['BTC'], address: 'bc1qcold0y7storage2k9m4n6p8r3t5v7x' }
];
const VKIND = { fiat: 'Fiat venue (bank account)', hot_wallet: 'Hot wallet', cold_wallet: 'Cold wallet' };
const PURPOSES = [['trade', 'Trade settlement'], ['subscription', 'Fund subscription'], ['transfer', 'Internal transfer'], ['others', 'Others']];
const TOL = 0.005;
const MFA_CODE = '123456';
const STORE_KEY = 'ets-si-v5';
let S = null;

const r8 = (x) => Math.round(x * 1e8) / 1e8;
const nowIso = () => new Date().toISOString();
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const posKey = (d, s) => d + '|' + String(s || 0).padStart(3, '0');
const isFinalOb = (o) => o.status === 'settled' || o.status === 'cancelled';
const acct = (id) => ACCOUNTS.find(a => a.id === id);
const userById = (id) => USERS.find(u => u.id === id) || { name: 'System', id };
const cpOf = (id) => S.cps.find(c => c.id === id);
const siById = (id) => S.sis.find(s => s.id === id);
const mvById = (id) => S.movs.find(m => m.id === id);
const nextId = (k) => { S.seq[k] = (S.seq[k] || 0) + 1; return S.seq[k]; };
const fail = (code, message, extra) => Object.assign({ ok: false, code, message }, extra || {});

function fmtAmt(n, asset) {
  if (n == null) return 'tbd';
  const dec = (ASSETS[asset] || { dec: 2 }).dec;
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: Math.min(2, dec), maximumFractionDigits: dec });
}
function B(accId, asset) {
  if (!S.bal[accId]) S.bal[accId] = {};
  if (!S.bal[accId][asset]) S.bal[accId][asset] = { total: 0, reserved: 0, expected: 0 };
  return S.bal[accId][asset];
}
function VB(venueId, asset) {
  const k = venueId + '|' + asset;
  if (!S.vbal[k]) S.vbal[k] = { total: 0, reserved: 0 };
  return S.vbal[k];
}
const venueFor = (asset) => VENUES.find(v => v.assets.includes(asset));

/* ---------------------------------------------------------------- seed reference data */
function baseState() {
  const s = {
    today: new Date().toISOString().slice(0, 10), seq: { si: 1000, ob: 0, mv: 3000, pst: 0, req: 0, audit: 0, leg: 0 },
    bal: {}, vbal: {}, suspense: {}, suspenseOut: {}, custodian: { income: {}, expense: {} }, sis: [], movs: [], txns: [], posts: [], reqs: [], audit: []
  };
  const set = (a, asset, total) => { s.bal[a] = s.bal[a] || {}; s.bal[a][asset] = { total, reserved: 0, expected: 0 }; };
  set('a1', 'SGD', 25000); set('a1', 'BTC', 0.5); set('a1', 'USD', 10000);
  set('a2', 'SGD', 5000);
  set('a3', 'SGD', 12000); set('a3', 'USD', 8000); set('a3', 'TOKEN', 0);
  set('a4', 'SGD', 5000); set('a4', 'BTC', 0); set('a4', 'USD', 20000);
  set('a5', 'SGD', 0);
  set('a6', 'SGD', 50000); set('a6', 'BTC', 0);
  set('a7', 'SGD', 0); set('a7', 'BTC', 1);
  set('a8', 'SGD', 0);
  s.vbal['v1|SGD'] = { total: 2000000, reserved: 0 }; s.vbal['v1|USD'] = { total: 1000000, reserved: 0 };
  s.vbal['v3|SGD'] = { total: 300000, reserved: 0 }; s.vbal['v4|BTC'] = { total: 5, reserved: 0 };
  s.vbal['v2|BTC'] = { total: 10, reserved: 0 }; s.vbal['v2|UNIT'] = { total: 5000, reserved: 0 }; s.vbal['v2|TOKEN'] = { total: 1000, reserved: 0 };
  return attachShared(s);
}
function attachShared(s) {
  s.custodian = s.custodian || { income: {}, expense: {} };
  Object.defineProperty(s, 'cps', { get: () => CPApp.counterparties(), enumerable: false, configurable: true });
  Object.defineProperty(s, 'details', { get: () => CPApp.details(), enumerable: false, configurable: true });
  return s;
}

function addAudit(siId, event, userId, detail) {
  S.audit.unshift({ id: 'a' + nextId('audit'), siId, event, userId, time: nowIso(), detail: detail || '' });
}

/* ---------------------------------------------------------------- obligations (FR-5) */
function deriveObs(legs) {
  const map = new Map();
  const add = (key, base, signed, leg, dir0) => {
    if (!map.has(key)) map.set(key, Object.assign({}, base, { net: 0, legIds: [], fixed: true, dir0 }));
    const e = map.get(key);
    e.net = r8(e.net + signed); e.legIds.push(leg.id);
    if (!leg.fixed) e.fixed = false;
  };
  legs.forEach(l => {
    const amt = l.amount == null ? 0 : l.amount;
    const ext = l.from.type === 'cp' || l.to.type === 'cp';
    const solo = ext || !l.fixed;
    if (l.from.type === 'account') {
      add(solo ? 'L' + l.id + 'd' : [l.from.id, l.assetId, l.date, l.seq || 0].join('|'), { accountId: l.from.id, asset: l.assetId, date: l.date, seq: l.seq || 0, cpId: ext ? l.to.id : null }, -amt, l, 'deliver');
    }
    if (l.to.type === 'account') {
      add(solo ? 'L' + l.id + 'r' : [l.to.id, l.assetId, l.date, l.seq || 0].join('|'), { accountId: l.to.id, asset: l.assetId, date: l.date, seq: l.seq || 0, cpId: ext ? l.from.id : null }, amt, l, 'receive');
    }
  });
  const out = [];
  map.forEach(e => {
    if (e.fixed && e.net === 0) return;
    const dir = e.fixed ? (e.net < 0 ? 'deliver' : 'receive') : e.dir0;
    out.push({ accountId: e.accountId, asset: e.asset, date: e.date, seq: e.seq, cpId: e.cpId, dir, amount: e.fixed ? Math.abs(e.net) : null, fixed: e.fixed, legIds: e.legIds, settled: 0, status: 'pending', expectedLeft: 0, waiting: false });
  });
  return out;
}

/* ---------------------------------------------------------------- funding (FR-7, FR-19) */
function fundingCalc(obs, accId, asset) {
  const list = obs.filter(o => o.accountId === accId && o.asset === asset && !isFinalOb(o));
  const groups = new Map();
  let expected = 0;
  list.forEach(o => {
    const rem = o.amount == null ? 0 : r8(o.amount - (o.settled || 0));
    if (o.dir === 'receive' && o.fixed) expected += rem;
    const k = posKey(o.date, o.seq);
    groups.set(k, r8((groups.get(k) || 0) + (o.dir === 'deliver' ? -rem : rem)));
  });
  let cum = 0, min = 0;
  const steps = [];
  [...groups.keys()].sort().forEach(k => {
    cum = r8(cum + groups.get(k)); min = Math.min(min, cum);
    steps.push({ key: k, date: k.split('|')[0], seq: +k.split('|')[1], delta: groups.get(k), cum });
  });
  return { steps, earmark: r8(-min) + 0, expected: r8(expected) };
}
function accountAssets(obs, accId) { return [...new Set(obs.filter(o => o.accountId === accId).map(o => o.asset))]; }
function fundingProblems(obs, accId, held) {
  const out = [];
  if (acct(accId).mayOverCommit) return out;
  accountAssets(obs, accId).forEach(asset => {
    const c = fundingCalc(obs, accId, asset);
    const b = B(accId, asset);
    const available = r8(b.total - b.reserved + ((held && held[accId + '|' + asset]) || 0));
    if (c.earmark > available) out.push({ kind: 'a', accountId: accId, asset, earmark: c.earmark, available, shortfall: r8(c.earmark - available) });
    let run = b.total;
    for (const s of c.steps) {
      run = r8(run + s.delta);
      if (run < 0) { out.push({ kind: 'b', accountId: accId, asset, date: s.date, seq: s.seq, shortfall: r8(-run) }); break; }
    }
  });
  return out;
}
function problemText(p) {
  const a = acct(p.accountId);
  if (p.kind === 'a') return a.name + ' ' + p.asset + ': needs ' + fmtAmt(p.earmark, p.asset) + ' but only ' + fmtAmt(p.available, p.asset) + ' is available (short ' + fmtAmt(p.shortfall, p.asset) + ').';
  return a.name + ' ' + p.asset + ': short ' + fmtAmt(p.shortfall, p.asset) + ' on ' + p.date + (p.seq ? ' [' + p.seq + ']' : '') + '.';
}
function placeEarmark(si, accId) {
  accountAssets(si.obs, accId).forEach(asset => {
    const c = fundingCalc(si.obs, accId, asset);
    B(accId, asset).reserved = r8(B(accId, asset).reserved + c.earmark);
    si.hold[accId + '|' + asset] = c.earmark;
    si.obs.filter(o => o.accountId === accId && o.asset === asset && o.dir === 'receive' && o.fixed && !isFinalOb(o)).forEach(o => {
      o.expectedLeft = o.amount; B(accId, asset).expected = r8(B(accId, asset).expected + o.amount);
    });
  });
}
function restate(si, accId, asset) {
  const k = accId + '|' + asset;
  if (si.hold[k] == null) return;
  const c = fundingCalc(si.obs, accId, asset);
  B(accId, asset).reserved = r8(B(accId, asset).reserved + c.earmark - si.hold[k]);
  si.hold[k] = c.earmark;
}
function releaseAll(si) {
  Object.keys(si.hold).forEach(k => { const [a, asset] = k.split('|'); B(a, asset).reserved = r8(B(a, asset).reserved - si.hold[k]); si.hold[k] = 0; });
  si.obs.forEach(o => { if (o.expectedLeft) { B(o.accountId, o.asset).expected = r8(B(o.accountId, o.asset).expected - o.expectedLeft); o.expectedLeft = 0; } });
}

/* ---------------------------------------------------------------- validation (FR-4) */
function validateLegs(user, legs, opts) {
  const errs = [];
  const err = (i, code, message) => errs.push({ leg: i, code, message });
  if (!legs.length) errs.push({ leg: -1, code: 'MISSING_REQUIRED_FIELD', message: 'Add at least one transfer leg.' });
  legs.forEach((l, i) => {
    const sides = [l.from, l.to];
    if (sides.every(x => x.type === 'cp')) err(i, 'INVALID_ARGUMENT', 'A leg can have only one outside party.');
    if (l.from.type === 'account' && l.to.type === 'account' && l.from.id === l.to.id) err(i, 'INVALID_ARGUMENT', 'From and To must be different.');
    sides.forEach(x => {
      if (x.type === 'account' && !acct(x.id)) err(i, 'INVALID_ACCOUNT_ID', 'Invalid account ID.');
      if (x.type === 'cp') {
        const cp = cpOf(x.id);
        if (!cp) err(i, 'RECORD_NOT_FOUND', 'The counterparty could not be found.');
        else if (cp.status !== 'active') err(i, 'INVALID_RECORD_STATE', 'The counterparty is not active.');
        else if (!S.details.some(d => d.cpId === cp.id && d.asset === l.assetId)) err(i, 'NO_COUNTERPARTY_WHITELIST', 'The counterparty has no approved whitelists for this asset.');
        else if (S.details.filter(d => d.cpId === cp.id && d.asset === l.assetId).length > 1 && !l.detailId) err(i, 'MISSING_REQUIRED_FIELD', 'Choose which whitelist to use.');
      }
    });
    if (!l.assetId || !ASSETS[l.assetId]) err(i, 'RECORD_NOT_FOUND', 'The asset could not be found.');
    if (l.fixed) { if (!(l.amount > 0)) err(i, 'INVALID_AMOUNT', 'Amount must be greater than zero.'); else if (!amountOk(l.amount, l.assetId)) err(i, 'INVALID_AMOUNT', 'Amount has more decimal places than ' + l.assetId + ' supports.'); }
    else if (!(l.from.type === 'cp' || l.to.type === 'cp')) err(i, 'INVALID_AMOUNT', 'Amount must be greater than zero.');
    if (!l.date || !/^\d{4}-\d{2}-\d{2}$/.test(l.date) || l.date < S.today) err(i, 'INVALID_DATE', 'The settlement date is not valid. It cannot be before today.');
  });
  if (opts && opts.fields) {
    if (!opts.fields.purpose) errs.push({ leg: -1, code: 'MISSING_REQUIRED_FIELD', message: 'Transaction purpose is required.' });
    if (opts.fields.purpose === 'others' && !String(opts.fields.purposeOther || '').trim()) errs.push({ leg: -1, code: 'MISSING_REQUIRED_FIELD', message: 'Please specify the transaction purpose.' });
    if (!String(opts.fields.extRef || '').trim()) errs.push({ leg: -1, code: 'MISSING_REQUIRED_FIELD', message: 'External reference is required.' });
  }
  return errs;
}

/* Preview (FR-19). Uses draft legs; returns rows per account the user can see. */
function previewFor(user, legs) {
  const draft = legs.map((l, i) => Object.assign({ id: 'D' + i }, l));
  const obs = deriveObs(draft);
  const ids = [...new Set(obs.map(o => o.accountId))].filter(a => user.role === 'operator' || (user.accounts || []).includes(a));
  const rows = [];
  ids.forEach(a => accountAssets(obs, a).forEach(asset => {
    const c = fundingCalc(obs, a, asset); const b = B(a, asset);
    let run = b.total; let flagged = false;
    const steps = c.steps.map(s => { run = r8(run + s.delta); const bad = run < 0 && !acct(a).mayOverCommit; if (bad) flagged = true; return Object.assign({}, s, { balance: run, bad }); });
    const availShort = !acct(a).mayOverCommit && c.earmark > r8(b.total - b.reserved);
    rows.push({ accountId: a, asset, total: b.total, available: r8(b.total - b.reserved), earmark: c.earmark, steps, flagged: flagged || availShort, overCommit: !!acct(a).mayOverCommit && c.earmark > r8(b.total - b.reserved) });
  }));
  return { rows, problems: ids.flatMap(a => fundingProblems(obs, a)) };
}

/* ---------------------------------------------------------------- instruction lifecycle */
function createSI(user, input, opts) {
  opts = opts || {};
  const si = {
    id: 'SI-' + nextId('si'), status: 'awaiting_client_approval', purpose: input.purpose, purposeOther: input.purposeOther || '', extRef: input.extRef, note: input.note || '',
    createdVia: opts.via || (user.role === 'operator' ? 'operator' : 'client'), createdBy: user.id, createdAt: nowIso(), legs: [], obs: [], approvals: [], hold: {}, legacy: !!opts.legacy
  };
  si.legs = input.legs.map(l => Object.assign({}, l, { id: 'L' + nextId('leg'), posted: false }));
  si.obs = deriveObs(si.legs).map(o => Object.assign({ id: 'OB-' + nextId('ob'), siId: si.id }, o));
  const accounts = [...new Set(si.obs.map(o => o.accountId).concat(si.legs.flatMap(l => [l.from, l.to]).filter(x => x.type === 'account').map(x => x.id)))];
  si.approvals = accounts.map(a => ({ accountId: a, status: 'awaiting_approval', automatic: false }));
  let auto = [];
  if (opts.autoAccounts === 'all') auto = accounts;
  else if (user.role === 'individual') auto = accounts.filter(a => (user.accounts || []).includes(a));
  const problems = auto.flatMap(a => fundingProblems(si.obs, a));
  if (problems.length) return fail('INSUFFICIENT_BALANCE', problems.map(problemText).join(' '), { problems });
  const approver = opts.approvedBy || user.id;
  auto.forEach(a => {
    const ap = si.approvals.find(x => x.accountId === a);
    ap.status = 'approved'; ap.automatic = true; ap.actionBy = approver; ap.actionAt = nowIso();
    placeEarmark(si, a);
  });
  si.status = si.approvals.every(a => a.status === 'approved') ? 'under_review' : 'awaiting_client_approval';
  S.sis.unshift(si);
  addAudit(si.id, 'settlement_instruction:create', user.id, si.legs.length + ' legs, ' + si.obs.length + ' obligations');
  saveState();
  return { ok: true, si };
}

function approveAccounts(user, si, accIds, reason, mfa) {
  if (si.status !== 'awaiting_client_approval') return fail('INVALID_RECORD_STATE', 'This instruction is not awaiting approval.');
  if (si.createdBy === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The submitter cannot approve their own instruction.');
  if (mfa !== MFA_CODE) return fail('UNAUTHENTICATED', 'The MFA code is not correct. Use ' + MFA_CODE + ' in this prototype.');
  if (!accIds.length) return fail('MISSING_REQUIRED_FIELD', 'Choose at least one account.');
  const aps = accIds.map(a => si.approvals.find(x => x.accountId === a));
  if (aps.some(a => !a || a.status !== 'awaiting_approval' || !(user.accounts || []).includes(a.accountId))) return fail('FORBIDDEN', 'You cannot approve one of these accounts.');
  const problems = accIds.flatMap(a => fundingProblems(si.obs, a));
  if (problems.length) return fail('INSUFFICIENT_BALANCE', problems.map(problemText).join(' '), { problems });
  aps.forEach(ap => { ap.status = 'approved'; ap.actionBy = user.id; ap.actionAt = nowIso(); ap.reason = reason || ''; placeEarmark(si, ap.accountId); });
  if (si.approvals.every(a => a.status === 'approved')) si.status = 'under_review';
  addAudit(si.id, 'settlement_instruction:approve_account', user.id, accIds.map(a => acct(a).name).join(', '));
  saveState();
  return { ok: true };
}
function rejectByClient(user, si, reason, mfa) {
  if (si.status !== 'awaiting_client_approval') return fail('INVALID_RECORD_STATE', 'This instruction is not awaiting approval.');
  if (si.createdBy === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The submitter cannot reject their own instruction.');
  if (mfa !== MFA_CODE) return fail('UNAUTHENTICATED', 'The MFA code is not correct. Use ' + MFA_CODE + ' in this prototype.');
  if (!String(reason || '').trim()) return fail('MISSING_REQUIRED_FIELD', 'A reason is required.');
  releaseAll(si); si.obs.forEach(o => { o.status = 'cancelled'; });
  si.approvals.forEach(a => { if (a.status === 'awaiting_approval' && (user.accounts || []).includes(a.accountId)) { a.status = 'rejected'; a.actionBy = user.id; a.actionAt = nowIso(); a.reason = reason; } });
  si.status = 'rejected'; si.reason = 'One of the counterparties has rejected the SI. ' + reason;
  addAudit(si.id, 'settlement_instruction:reject', user.id, reason);
  saveState();
  return { ok: true };
}
function approveForSettlement(user, si) {
  if (si.status !== 'under_review') return fail('INVALID_RECORD_STATE', 'This instruction is not under review.');
  const inactive = si.approvals.find(a => !acct(a.accountId));
  if (inactive) return fail('ACCOUNT_NOT_ACTIVE', 'An involved account is not active.');
  si.status = 'settling';
  addAudit(si.id, 'settlement_instruction:approve_for_settlement', user.id, '');
  runSI(si);
  saveState();
  return { ok: true };
}
function anySettled(si) { return si.obs.some(o => o.settled > 0) || si.legs.some(l => l.posted); }
function rejectSI(user, si, reason) {
  if (!['under_review', 'settling'].includes(si.status)) return fail('INVALID_RECORD_STATE', 'This instruction cannot be rejected from its current status.');
  if (anySettled(si)) return fail('INVALID_RECORD_STATE', 'Something has already settled. Close the instruction out instead.');
  if (!String(reason || '').trim()) return fail('MISSING_REQUIRED_FIELD', 'A reason is required.');
  S.movs.filter(m => m.obSiId === si.id && ['pending', 'submitted'].includes(m.status) && m.dir === 'out').forEach(m => failMovementCore(m, 'Instruction rejected'));
  releaseAll(si); si.obs.forEach(o => { o.status = 'cancelled'; });
  si.status = 'rejected'; si.reason = reason;
  addAudit(si.id, 'settlement_instruction:reject', user.id, reason);
  saveState();
  return { ok: true };
}
function closeOut(user, si, reason) {
  if (si.status !== 'settling') return fail('INVALID_RECORD_STATE', 'Only a settling instruction can be closed out.');
  if (!anySettled(si)) return fail('INVALID_RECORD_STATE', 'Nothing has settled. Reject the instruction instead.');
  if (!String(reason || '').trim()) return fail('MISSING_REQUIRED_FIELD', 'A reason is required.');
  S.movs.filter(m => m.obSiId === si.id && ['pending', 'submitted'].includes(m.status) && m.dir === 'out').forEach(m => failMovementCore(m, 'Instruction closed out'));
  si.obs.forEach(o => { if (!isFinalOb(o)) o.status = 'cancelled'; });
  releaseAll(si);
  si.status = 'failed'; si.reason = reason; si.closedOutAt = nowIso();
  addAudit(si.id, 'settlement_instruction:close_out', user.id, reason);
  saveState();
  return { ok: true };
}

/* ---------------------------------------------------------------- execution (FR-9) */
function sortedKeys(si) {
  return [...new Set(si.obs.map(o => posKey(o.date, o.seq)).concat(si.legs.map(l => posKey(l.date, l.seq))))].sort();
}
const internalLeg = (l) => l.from.type === 'account' && l.to.type === 'account';
function posFinal(si, key) {
  return si.obs.filter(o => posKey(o.date, o.seq) === key).every(isFinalOb) && si.legs.filter(l => internalLeg(l) && posKey(l.date, l.seq) === key).every(l => l.posted);
}
function refreshEligibility(si) {
  let changed = false, earlierFinal = true;
  sortedKeys(si).forEach(k => {
    si.obs.filter(o => posKey(o.date, o.seq) === k && o.status === 'pending' && earlierFinal && o.date <= S.today).forEach(o => { o.status = 'eligible'; changed = true; });
    earlierFinal = earlierFinal && posFinal(si, k);
  });
  return changed;
}
function postLedger(si, legId, dr, cr, amount, asset, event) {
  S.posts.push({ id: 'P-' + nextId('pst'), siId: si.id, legId, obIds: legId ? si.obs.filter(o => o.legIds.includes(legId)).map(o => o.id) : [], dr, cr, amount, asset, event, at: nowIso(), valueDate: S.today });
}
function executeInternal(si) {
  let earlierFinal = true, target = null;
  for (const k of sortedKeys(si)) {
    const date = k.split('|')[0];
    if (!posFinal(si, k)) {
      if (earlierFinal && date <= S.today && si.legs.some(l => internalLeg(l) && !l.posted && posKey(l.date, l.seq) === k)) target = k;
      break;
    }
  }
  if (!target) return false;
  let cand = si.legs.filter(l => internalLeg(l) && !l.posted && posKey(l.date, l.seq) === target);
  const all = cand.slice();
  for (let guard = 0; guard < 20 && cand.length; guard++) {
    const net = {};
    cand.forEach(l => { net[l.from.id + '|' + l.assetId] = r8((net[l.from.id + '|' + l.assetId] || 0) - l.amount); net[l.to.id + '|' + l.assetId] = r8((net[l.to.id + '|' + l.assetId] || 0) + l.amount); });
    const short = Object.keys(net).filter(k => { const [a, as] = k.split('|'); return r8(B(a, as).total + net[k]) < 0; });
    if (!short.length) break;
    cand = cand.filter(l => !short.includes(l.from.id + '|' + l.assetId));
  }
  const touched = new Set();
  cand.forEach(l => {
    B(l.from.id, l.assetId).total = r8(B(l.from.id, l.assetId).total - l.amount);
    B(l.to.id, l.assetId).total = r8(B(l.to.id, l.assetId).total + l.amount);
    l.posted = true; l.postedAt = nowIso();
    postLedger(si, l.id, acct(l.from.id).name, acct(l.to.id).name, l.amount, l.assetId, 'Leg ' + l.id + ' settles');
    touched.add(l.from.id + '|' + l.assetId); touched.add(l.to.id + '|' + l.assetId);
  });
  si.obs.filter(o => posKey(o.date, o.seq) === target && o.cpId == null && !isFinalOb(o)).forEach(o => {
    const done = o.legIds.every(id => si.legs.find(l => l.id === id).posted);
    o.waiting = !done;
    if (done) {
      o.settled = o.amount; o.status = 'settled'; o.completedAt = S.today;
      if (o.dir === 'receive' && o.expectedLeft) { B(o.accountId, o.asset).expected = r8(B(o.accountId, o.asset).expected - o.expectedLeft); o.expectedLeft = 0; }
      restate(si, o.accountId, o.asset);
    }
  });
  si.obs.forEach(o => { if (o.cpId != null) o.waiting = false; });
  return cand.length > 0 || all.length === 0;
}
function checkComplete(si) {
  if (si.status !== 'settling') return;
  if (si.obs.every(isFinalOb) && si.legs.every(l => !internalLeg(l) || l.posted) && si.obs.every(o => o.status === 'settled')) {
    si.status = 'completed'; si.transactedAt = nowIso();
    addAudit(si.id, 'settlement_instruction:complete', 'system', '');
  }
}
function runSI(si) {
  if (si.status !== 'settling') return;
  for (let g = 0; g < 50; g++) {
    const a = refreshEligibility(si);
    const b = executeInternal(si);
    if (!a && !b) break;
  }
  checkComplete(si);
}
function runAll() { S.sis.forEach(runSI); }
function advanceDay(n) {
  for (let i = 0; i < (n || 1); i++) { S.today = addDays(S.today, 1); runAll(); }
  saveState();
}

/* ---------------------------------------------------------------- external obligations (FR-10 to FR-14) */
const undischarged = (o) => o.amount == null ? 0 : r8(o.amount - o.settled - activeLinks(o).reduce((s, l) => s + l.amount, 0));
function activeLinks(o) { return S.movs.filter(m => m.status === 'pending' || m.status === 'submitted').flatMap(m => (m.links || []).filter(l => l.obId === o.id && l.active)); }
const findOb = (obId) => { for (const si of S.sis) { const o = si.obs.find(x => x.id === obId); if (o) return { si, o }; } return null; };
const isOverdue = (o) => !isFinalOb(o) && o.date < S.today;
function detailsFor(cpId, asset) { return S.details.filter(d => d.cpId === cpId && d.asset === asset); }

function createMovement(user, obId, venueId, detailId) {
  const f = findOb(obId); if (!f) return fail('RECORD_NOT_FOUND', 'Obligation not found.');
  const { si, o } = f;
  if (si.status !== 'settling') return fail('INVALID_RECORD_STATE', 'The instruction is not settling.');
  if (o.cpId == null || o.dir !== 'deliver') return fail('INVALID_ARGUMENT', 'Only an outside delivery needs a movement.');
  if (!['eligible', 'partially_settled', 'instructed'].includes(o.status) || o.status === 'pending') return fail('INVALID_RECORD_STATE', 'The obligation is not eligible yet.');
  const cp = cpOf(o.cpId);
  if (cp.status !== 'active') return fail('INVALID_RECORD_STATE', 'The counterparty is suspended. New movements are blocked.');
  const amt = undischarged(o);
  if (!(amt > 0)) return fail('INVALID_AMOUNT', 'There is nothing left to discharge.');
  const venue = VENUES.find(v => v.id === venueId);
  if (!venue || !venue.assets.includes(o.asset)) return fail('INVALID_SOURCE_VENUE', 'The selected venue cannot be used for this asset.');
  const vb = VB(venueId, o.asset);
  if (r8(vb.total - vb.reserved) < amt) return fail('VENUE_INSUFFICIENT_BALANCE', 'Insufficient available balance at the selected venue.');
  const det = S.details.find(d => d.id === detailId && d.cpId === o.cpId && d.asset === o.asset);
  if (!det) return fail('NO_COUNTERPARTY_WHITELIST', 'Choose an approved whitelist.');
  vb.reserved = r8(vb.reserved + amt);
  const m = { id: 'OM-' + nextId('mv'), dir: 'out', classification: 'settlement', source: 'settlement', venueName: venue.name, cpId: o.cpId, obSiId: si.id, amount: amt, asset: o.asset, status: 'pending', exec: '', venueId, detailId: det.id, via: det.label + ' v' + det.version, ref: '', at: '', links: [{ obId, amount: amt, active: true }], created: nowIso() };
  S.movs.unshift(m);
  addAudit(si.id, 'movement:create', user.id, m.id + ' for ' + obId + ' (' + fmtAmt(amt, o.asset) + ' ' + o.asset + ')');
  saveState();
  return { ok: true, mv: m };
}
function submitMovement(user, mv) {
  if (mv.status !== 'pending') return fail('INVALID_MOVEMENT_STATUS', 'Submit requires status pending.');
  const f = findOb(mv.links[0].obId);
  if (cpOf(mv.cpId).status !== 'active') return fail('INVALID_RECORD_STATE', 'The counterparty is suspended. The movement is held at pending.');
  mv.status = 'submitted'; mv.exec = 'processing'; mv.ref = (ASSETS[mv.asset].fiat ? 'DBS-REF-' : 'TX-') + (8000 + Math.floor(Math.random() * 1999));
  f.o.status = f.o.settled > 0 ? 'partially_settled' : 'instructed';
  addAudit(f.si.id, 'outgoing_movement:submit', user.id, mv.id);
  saveState();
  return { ok: true };
}
function confirmMovement(user, mv, amount) {
  if (mv.status !== 'submitted') return fail('INVALID_MOVEMENT_STATUS', 'Confirm requires status submitted.');
  const link = mv.links[0]; const f = findOb(link.obId);
  amount = r8(+amount);
  if (!(amount > 0) || amount > link.amount) return fail('INVALID_AMOUNT', 'The settled amount must be between 0 and ' + fmtAmt(link.amount, mv.asset) + '.');
  const vb = VB(mv.venueId, mv.asset);
  vb.reserved = r8(vb.reserved - link.amount); vb.total = r8(vb.total - amount);
  B(f.o.accountId, mv.asset).total = r8(B(f.o.accountId, mv.asset).total - amount);
  link.amount = amount; mv.amount = amount; mv.status = 'confirmed'; mv.exec = 'settled'; mv.at = S.today;
  f.o.settled = r8(f.o.settled + amount);
  const done = r8(f.o.amount - f.o.settled) <= f.o.amount * TOL;
  f.o.status = done ? 'settled' : 'partially_settled'; if (done) f.o.completedAt = S.today;
  postLedger(f.si, null, acct(f.o.accountId).name, VENUES.find(v => v.id === mv.venueId).name, amount, mv.asset, mv.id + ' confirmed (' + mv.via + ')');
  S.posts[S.posts.length - 1].obIds = [f.o.id];
  restate(f.si, f.o.accountId, f.o.asset);
  addAudit(f.si.id, 'outgoing_movement:confirm', user.id, mv.id + ' ' + fmtAmt(amount, mv.asset));
  runAll();
  saveState();
  return { ok: true };
}
function failMovementCore(mv, reason) {
  mv.failedAt = S.today;
  const link = mv.links[0]; const f = findOb(link.obId);
  if (mv.dir === 'out') { const vb = VB(mv.venueId, mv.asset); vb.reserved = r8(vb.reserved - link.amount); }
  link.active = false; mv.status = 'failed'; mv.exec = 'rejected'; mv.failure = reason;
  if (f && !isFinalOb(f.o)) f.o.status = f.o.settled > 0 ? 'partially_settled' : 'eligible';
}
function failMovement(user, mv, reason) {
  if (!['pending', 'submitted'].includes(mv.status)) return fail('INVALID_MOVEMENT_STATUS', 'Only a pending or submitted movement can fail.');
  const f = findOb(mv.links[0].obId);
  failMovementCore(mv, reason);
  addAudit(f.si.id, 'outgoing_movement:fail', user.id, mv.id + ': ' + reason);
  saveState();
  return { ok: true };
}

function receiveArrival(user, cpId, detailId, asset, amount) {
  amount = r8(+amount);
  if (!(amount > 0)) return fail('INVALID_AMOUNT', 'Amount must be greater than zero.');
  const venue = venueFor(asset);
  const det = detailId ? S.details.find(d => d.id === detailId) : null;
  const cands = [];
  if (det) S.sis.filter(s => s.status === 'settling').forEach(s => s.obs.forEach(o => { if (o.cpId === det.cpId && o.dir === 'receive' && o.asset === asset && o.fixed && ['eligible', 'instructed', 'partially_settled'].includes(o.status)) cands.push({ si: s, o }); }));
  cands.sort((a, b) => posKey(a.o.date, a.o.seq).localeCompare(posKey(b.o.date, b.o.seq)));
  const vb = VB(venue.id, asset);
  const mkMov = (amt, cls, links) => {
    const m = { id: 'IM-' + nextId('mv'), dir: 'in', source: cls === 'settlement' ? 'settlement' : 'detected', cpId: det ? det.cpId : (cpId || null), amount: amt, asset, status: cls === 'settlement' ? 'confirmed' : 'detected', classification: cls, venueId: venue.id, via: det ? det.label + ' v' + det.version : 'Unknown sender', ref: (ASSETS[asset].fiat ? 'BANK-IN-' : '0x') + (7000 + Math.floor(Math.random() * 2999)), at: S.today, links: links || [], settlement: links && links[0] ? findOb(links[0].obId).si.id : '', created: nowIso() };
    S.movs.unshift(m); return m;
  };
  if (cands.length) {
    const { si, o } = cands[0];
    const und = undischarged(o);
    const applied = amount <= r8(und + o.amount * TOL) ? amount : und;
    vb.total = r8(vb.total + applied);
    B(o.accountId, asset).total = r8(B(o.accountId, asset).total + applied);
    const drawn = Math.min(o.expectedLeft, applied);
    B(o.accountId, asset).expected = r8(B(o.accountId, asset).expected - drawn); o.expectedLeft = r8(o.expectedLeft - drawn);
    const m = mkMov(applied, 'settlement', [{ obId: o.id, amount: applied, active: true }]);
    o.settled = r8(o.settled + applied);
    const done = r8(o.amount - o.settled) <= o.amount * TOL;
    o.status = done ? 'settled' : 'partially_settled'; if (done) { o.completedAt = S.today; B(o.accountId, asset).expected = r8(B(o.accountId, asset).expected - o.expectedLeft); o.expectedLeft = 0; }
    postLedger(si, null, venue.name, acct(o.accountId).name, applied, asset, m.id + ' arrival from ' + m.via);
    S.posts[S.posts.length - 1].obIds = [o.id];
    addAudit(si.id, 'incoming_movement:confirm', user.id, m.id + ' linked to ' + o.id);
    let excessMov = null;
    if (amount > applied) {
      const ex = r8(amount - applied);
      excessMov = mkMov(ex, 'unclassified'); vb.total = r8(vb.total + ex); S.suspense[asset] = r8((S.suspense[asset] || 0) + ex);
    }
    runAll(); saveState();
    return { ok: true, mv: m, excess: excessMov, matched: true };
  }
  const m = mkMov(amount, 'unclassified');
  vb.total = r8(vb.total + amount); S.suspense[asset] = r8((S.suspense[asset] || 0) + amount);
  saveState();
  return { ok: true, mv: m, matched: false };
}
function setObAmount(user, obId, amount) {
  const f = findOb(obId); if (!f) return fail('RECORD_NOT_FOUND', 'Obligation not found.');
  const { si, o } = f; amount = r8(+amount);
  if (o.fixed) return fail('INVALID_RECORD_STATE', 'The amount is already fixed.');
  if (!(amount > 0)) return fail('INVALID_AMOUNT', 'Amount must be greater than zero.');
  o.amount = amount; o.fixed = true;
  o.legIds.forEach(id => { const l = si.legs.find(x => x.id === id); l.amount = amount; l.fixed = true; });
  if (o.dir === 'receive') { o.expectedLeft = amount; B(o.accountId, o.asset).expected = r8(B(o.accountId, o.asset).expected + amount); }
  addAudit(si.id, 'obligation:set_amount', user.id, o.id + ' = ' + fmtAmt(amount, o.asset));
  saveState();
  return { ok: true };
}

/* ---------------------------------------------------------------- maker-checker requests */
function newRequest(type, user, payload, comment) {
  const r = { id: 'R-' + nextId('req'), type, makerId: user.id, payload, comment: comment || '', status: 'pending', createdAt: nowIso() };
  S.reqs.unshift(r);
  if (type === 'book_movement' || type === 'classify') {
    const mv = payload.movId ? mvById(payload.movId) : null; const dir = type === 'book_movement' ? payload.dir : (mv ? mv.dir : 'in');
    addAudit(mv ? 'MV-' + mv.id : 'REQ-' + r.id, (dir === 'out' ? 'outgoing' : 'incoming') + '_movement:' + (type === 'book_movement' ? 'create' : 'classify') + '_request', user.id, r.id);
  }
  saveState(); return r;
}
function approveRequest(user, req) {
  if (req.status !== 'pending') return fail('INVALID_RECORD_STATE', 'This request is not awaiting approval.');
  if (req.makerId === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The maker cannot approve their own request.');
  if (req.type === 'si_create') {
    const maker = userById(req.makerId);
    const bad = validateLegs(maker, req.payload.legs, { fields: req.payload.fields });
    if (bad.length) return fail(bad[0].code, bad[0].message + ' The request stays awaiting approval.');
    const res = createSI(maker, Object.assign({}, req.payload.fields, { legs: req.payload.legs }), { via: 'operator', autoAccounts: 'all', approvedBy: user.id });
    if (!res.ok) return fail(res.code, res.message + ' The request stays awaiting approval.');
    req.siId = res.si.id;
  } else if (req.type === 'classify' && (!req.payload.classification || req.payload.classification === 'settlement')) {
    const mv = mvById(req.payload.movId); const f = findOb(req.payload.obId);
    if (!mv || mv.classification !== 'unclassified') return fail('INVALID_RECORD_STATE', 'The arrival is no longer unclassified.');
    if (!f || isFinalOb(f.o)) return fail('INVALID_RECORD_STATE', 'The obligation is final.');
    const { si, o } = f;
    const applied = o.fixed ? Math.min(mv.amount, undischarged(o) + o.amount * TOL) : mv.amount;
    const venue = venueFor(mv.asset);
    B(o.accountId, mv.asset).total = r8(B(o.accountId, mv.asset).total + applied);
    S.suspense[mv.asset] = r8((S.suspense[mv.asset] || 0) - applied);
    const drawn = Math.min(o.expectedLeft, applied);
    B(o.accountId, mv.asset).expected = r8(B(o.accountId, mv.asset).expected - drawn); o.expectedLeft = r8(o.expectedLeft - drawn);
    mv.classification = 'settlement'; mv.status = 'confirmed'; mv.settlement = si.id; mv.links = [{ obId: o.id, amount: applied, active: true }];
    o.settled = r8(o.settled + applied);
    const done = o.fixed ? r8(o.amount - o.settled) <= o.amount * TOL : true;
    o.status = done ? 'settled' : 'partially_settled'; if (done) o.completedAt = S.today;
    postLedger(si, null, 'Deposit Suspense', acct(o.accountId).name, applied, mv.asset, mv.id + ' classified as settlement');
    S.posts[S.posts.length - 1].obIds = [o.id];
    addAudit(si.id, 'incoming_movement:classify', user.id, mv.id + ' to ' + o.id + ' (maker ' + userById(req.makerId).name + ')');
    runAll();
  } else if (req.type === 'classify') {
    const r2 = applyClassifyRequest(user, req); if (!r2.ok) return r2;
  } else if (req.type === 'book_movement') {
    const r2 = applyBookRequest(user, req); if (!r2.ok) return r2;
  } else if (req.type === 'fail_movement') {
    const mv = mvById(req.payload.movId); if (!mv) return fail('RECORD_NOT_FOUND', 'The movement could not be found.');
    const r2 = failMovement(user, mv, req.payload.reason); if (!r2.ok) return r2;
  }
  req.status = 'approved'; req.decidedBy = user.id; req.decidedAt = nowIso();
  saveState();
  return { ok: true };
}
function rejectRequest(user, req, reason) {
  if (req.status !== 'pending') return fail('INVALID_RECORD_STATE', 'This request is not awaiting approval.');
  if (req.makerId === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The maker cannot reject their own request.');
  if (!reason) return fail('MISSING_REQUIRED_FIELD', 'Reason is required.');
  req.status = 'rejected'; req.decidedBy = user.id; req.decidedAt = nowIso(); req.reason = reason;
  saveState();
  return { ok: true };
}

/* ---------------------------------------------------------------- derived queries */
function exceptions() {
  const overdue = [], failed = [], unclass = [], waiting = [], suspended = [];
  S.sis.forEach(si => si.obs.forEach(o => {
    if (isFinalOb(o)) return;
    if (isOverdue(o) && si.status === 'settling') overdue.push({ si, o });
    if (o.waiting) waiting.push({ si, o });
    if (o.cpId && cpOf(o.cpId).status === 'suspended' && si.status === 'settling') suspended.push({ si, o });
    const mvs = S.movs.filter(m => m.links && m.links.some(l => l.obId === o.id));
    if (o.dir === 'deliver' && o.cpId && mvs.some(m => m.status === 'failed') && !activeLinks(o).length && undischarged(o) > 0) failed.push({ si, o, mv: mvs.find(m => m.status === 'failed') });
  }));
  S.movs.filter(m => m.dir === 'in' && m.classification === 'unclassified').forEach(m => unclass.push({ mv: m }));
  return { overdue, failed, unclass, waiting, suspended };
}

/* ---------------------------------------------------------------- persistence and seeding */
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
function loadState() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { S = attachShared(JSON.parse(raw)); S.txns = S.txns || []; return; } } catch (e) { /* ignore */ }
  seedDemo();
}
function resetState() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } seedDemo(); }

function seedDemo() {
  S = baseState();
  const real = S.today;
  const alice = USERS[0], bob = USERS[1], sam = USERS[2];
  const leg = (from, to, assetId, amount, date, o) => Object.assign({ from, to, assetId, amount, fixed: amount != null, date, seq: 0, extRef: '', remarks: '' }, o || {});
  const A = (id) => ({ type: 'account', id }), C = (id) => ({ type: 'cp', id });
  const make = (fields, legs) => { const r = createSI(alice, Object.assign({}, fields, { legs }), { via: 'operator', autoAccounts: 'all', approvedBy: bob.id }); if (!r.ok) throw new Error(r.message); return r.si; };

  // 1. Fund subscription booked 6 days ago, now overdue
  S.today = addDays(real, -6);
  const sub = make({ purpose: 'subscription', extRef: 'SUB-FB-0412', note: 'Subscribe to Crestline Fund' }, [
    leg(A('a1'), C('cp2'), 'USD', 10000, S.today, { detailId: 's4' }),
    leg(C('cp2'), A('a1'), 'UNIT', 50, addDays(S.today, 4), { detailId: 's10' })
  ]);
  approveForSettlement(alice, sub);
  const payOb = sub.obs.find(o => o.asset === 'USD');
  const mv = createMovement(alice, payOb.id, 'v1', 's4').mv;
  submitMovement(alice, mv); confirmMovement(alice, mv, mv.amount);
  while (S.today < real) advanceDay(1);

  // 2. Principal buy: two instructions
  const buy = make({ purpose: 'trade', extRef: 'BUY-0925', note: 'Client buys 0.25 BTC' }, [
    leg(A('a1'), A('a4'), 'SGD', 10000, real), leg(A('a1'), A('a5'), 'SGD', 25, real), leg(A('a4'), A('a1'), 'BTC', 0.25, addDays(real, 2))
  ]);
  approveForSettlement(alice, buy);
  make({ purpose: 'trade', extRef: 'SRC-0925', note: 'Source 0.25 BTC from the broker' }, [
    leg(A('a4'), C('cp1'), 'SGD', 9950, addDays(real, 2), { seq: 1, detailId: 's1' }), leg(C('cp1'), A('a4'), 'BTC', 0.25, addDays(real, 2), { seq: 2, detailId: 's2' })
  ]);
  const src = S.sis[0]; approveForSettlement(alice, src);

  // 3. Client instruction awaiting approvals
  createSI(sam, { purpose: 'transfer', extRef: 'ACME-ZEN-77', note: 'Transfer SGD and return USD', legs: [
    leg(A('a1'), A('a3'), 'SGD', 3000, real), leg(A('a3'), A('a1'), 'USD', 500, addDays(real, 1))
  ].map(l => Object.assign(l, { posted: false })) }, { via: 'client' });

  // 4. Legacy single-date instruction under review
  createSI(alice, { purpose: 'transfer', extRef: 'LEGACY-0900', note: 'Existing instruction (single date)', legs: [leg(A('a2'), A('a1'), 'SGD', 1000, real)] }, { via: 'operator', autoAccounts: 'all', approvedBy: bob.id, legacy: true });

  // 5. Unclassified arrival from the broker's wallet
  receiveArrival(alice, 'cp1', 's2', 'BTC', 0.05);

  // 5b. Crestline Fund (active) has one completed and one ongoing instruction, each with movements both ways
  const arr = receiveArrival(alice, 'cp2', null, 'UNIT', 25);
  const done = make({ purpose: 'subscription', extRef: 'SUB-CF-0301', note: 'Earlier subscription to Crestline Fund, fully settled' }, [
    leg(A('a3'), C('cp2'), 'USD', 5000, real, { seq: 1, detailId: 's4' }),
    leg(C('cp2'), A('a3'), 'UNIT', 25, real, { seq: 2, detailId: 's10' })
  ]);
  approveForSettlement(alice, done);
  const pay2 = createMovement(alice, done.obs.find(o => o.asset === 'USD').id, 'v1', 's4').mv; submitMovement(alice, pay2); confirmMovement(alice, pay2, pay2.amount);
  const cls = newRequest('classify', alice, { movId: arr.mv.id, obId: done.obs.find(o => o.asset === 'UNIT').id }, 'Units for the earlier subscription.');
  approveRequest(bob, cls);
  receiveArrival(alice, null, 's10', 'UNIT', 20);
  const exch = make({ purpose: 'trade', extRef: 'EXCH-BTC-0301', note: 'Exchange trade: Atlas Capital (buyer) buys 0.25 BTC from Beacon Trading (seller) at 10,000 SGD. Each side pays the exchange a 10 SGD fee.' }, [
    leg(A('a6'), A('a7'), 'SGD', 10000, real),
    leg(A('a7'), A('a6'), 'BTC', 0.25, real),
    leg(A('a6'), A('a8'), 'SGD', 10, real),
    leg(A('a7'), A('a8'), 'SGD', 10, real)
  ]);
  approveForSettlement(alice, exch);
  S.sis.sort((a, b) => b.id.localeCompare(a.id));

  // 6. Movements that no instruction created
  const ago = (days, hh) => { const x = new Date(Date.now() - days * 86400000); x.setHours(hh, 0, 0, 0); return localDT(x); };
  const bookNow = (dir, d, maker) => { const r = applyBook(maker || bob, alice, dir, d); if (!r.ok) throw new Error(r.message); return r.mv; };
  const classNow = (mv, d) => { const r = applyClassification(alice, mv, d); if (!r.ok) throw new Error(r.message); };
  classNow(bookNow('in', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 5000, at: ago(3, 10), ref: 'BANK-REF-1001', depositor: 'Acme Capital Pte Ltd' }), { classification: 'deposit', tied: true, accountId: 'a2', relatedTx: 'DEP-1001' });
  classNow(bookNow('out', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 25, at: ago(2, 9), ref: 'DBS-FEE-0930' }), { classification: 'venue_charges', chargeType: 'bank_charge', tied: false, note: 'Monthly account maintenance fee' });
  classNow(bookNow('out', { kind: 'token', venueId: 'v2', asset: 'BTC', amount: 0.00012, at: ago(1, 10), ref: 'TX-FEE-8800', depositor: 'bc1qminer0fee0payee5addr8z', netFee: '' }), { classification: 'venue_charges', chargeType: 'network_fee', tied: false, relatedTx: 'WD-2042', note: 'Fee paid from the hot wallet, separate from the transfer' });
  classNow(bookNow('out', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 12.5, at: ago(2, 11), ref: 'DBS-FEE-0931', rail: 'tt', chargeBearer: 'DEBT' }), { classification: 'venue_charges', chargeType: 'bank_charge', tied: true, accountId: 'a1', relatedTx: 'DEP-1001', note: 'Incoming TT fee on deposit DEP-1001' });
  classNow(bookNow('in', { kind: 'fiat', venueId: 'v1', asset: 'USD', amount: 200, at: ago(1, 15), ref: 'BANK-REF-2002', depositor: 'Unknown remitter' }), { classification: 'unknown_funds', tied: false });
  bookNow('in', { kind: 'token', venueId: 'v2', asset: 'TOKEN', amount: 25, at: ago(1, 8), ref: '0x9f3a7c21d4e08b66a1f5', depositor: '0x3c71…e90a' });
  bookNow('out', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 8, at: ago(0, 8), ref: 'DBS-FEE-0932' });
  const wd = { id: 'OM-' + nextId('mv'), dir: 'out', status: 'confirmed', exec: 'settled', execMethod: 'automated', classification: 'withdrawal', source: 'instruction', rail: 'fast_paynow', kind: 'fiat', accountId: 'a2', tied: true, amount: 2000, asset: 'SGD', venueId: 'v1', via: 'Acme DBS SGD', ref: 'DBS-WD-4410', at: S.today, atFull: ago(0, 9), links: [], relatedTx: '', transactionId: 'WD-2041', payRef: 'PAY-2041', chargeBearerAcct: 'a2', bank: { id: 'WBA-7781', number: '0123456789', beneficiary: 'Acme Treasury Pte Ltd', swift: 'DBSSSGSG', country: 'Singapore' }, created: nowIso() };
  VB('v1', 'SGD').total = r8(VB('v1', 'SGD').total - 2000); B('a2', 'SGD').total = r8(B('a2', 'SGD').total - 2000); S.movs.unshift(wd);
  postGen('Acme Treasury', 'Bank Venue V', 2000, 'SGD', wd.id + ' withdrawal', wd.id);
  const twd = { id: 'OM-' + nextId('mv'), dir: 'out', status: 'confirmed', exec: 'settled', execMethod: 'automated', classification: 'withdrawal', source: 'instruction', kind: 'token', accountId: 'a1', tied: true, amount: 0.05, asset: 'BTC', venueId: 'v2', via: 'bc1q9whitelisted0client7addr3x', ref: '9f2c41a7e0b35d8c64f1a2907be3d5c8', at: S.today, atFull: ago(0, 10), links: [], relatedTx: '', transactionId: 'WD-2042', chain: 'Bitcoin', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: 'bc1q9whitelisted0client7addr3x', netFee: '0.00004', totalReceived: '0.04996', wlAddr: 'WA-3320', kyt: 'Passed', kytRemarks: 'No risk found', created: nowIso() };
  VB('v2', 'BTC').total = r8(VB('v2', 'BTC').total - 0.05); B('a1', 'BTC').total = r8(B('a1', 'BTC').total - 0.05); S.movs.unshift(twd);
  postGen('Acme Main Account', 'Token Venue W', 0.05, 'BTC', twd.id + ' withdrawal', twd.id);
  const inflight = (o) => { const m = Object.assign({ id: 'OM-' + nextId('mv'), dir: 'out', classification: 'withdrawal', source: 'instruction', tied: true, links: [], relatedTx: '', at: S.today, created: nowIso() }, o); m.atFull = m.atFull || ago(0, 11); S.movs.unshift(m); return m; };
  const bk = { id: 'WBA-7781', number: '0123456789', beneficiary: 'Acme Treasury Pte Ltd', swift: 'DBSSSGSG', country: 'Singapore' };
  inflight({ kind: 'fiat', status: 'pending', exec: '', execMethod: 'manual', fallback: 'No rail accepts this amount', rail: 'meps', chargeBearer: 'DEBT', chargeBearerAcct: 'a2', accountId: 'a2', amount: 1500, asset: 'SGD', venueId: 'v1', via: 'Acme DBS SGD', ref: '', transactionId: 'WD-2043', bank: bk });
  inflight({ kind: 'fiat', status: 'submitted', exec: 'processing', execMethod: 'automated', rail: 'tt', chargeBearer: 'DEBT', chargeBearerAcct: 'a1', accountId: 'a1', amount: 800, asset: 'USD', venueId: 'v1', via: 'Acme DBS USD', ref: 'DBS-WD-4412', payRef: 'PAY-2044', transactionId: 'WD-2044', bank: Object.assign({}, bk, { id: 'WBA-7790', number: '0987654321', beneficiary: 'Acme Capital Pte Ltd' }) });
  inflight({ kind: 'fiat', status: 'failed', exec: 'rejected', execMethod: 'automated', rail: 'fast_paynow', accountId: 'a2', amount: 600, asset: 'SGD', venueId: 'v1', via: 'Acme DBS SGD', ref: 'DBS-WD-4398', payRef: 'PAY-2039', failure: 'Beneficiary account is closed', transactionId: 'WD-2039', bank: bk });
  const wl = 'bc1q9whitelisted0client7addr3x';
  inflight({ kind: 'token', status: 'pending', exec: '', execMethod: 'automated', accountId: 'a1', amount: 0.02, asset: 'BTC', venueId: 'v2', via: wl, ref: '', transactionId: 'WD-2045', chain: 'Bitcoin', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: wl, wlAddr: 'WA-3320', kyt: 'Pending', kytRemarks: 'Wallet analysis in progress' });
  inflight({ kind: 'token', status: 'submitted', exec: 'processing', execMethod: 'automated', accountId: 'a1', amount: 0.01, asset: 'BTC', venueId: 'v2', via: wl, ref: '4be71c09a2d85f3e6170b9c4d2a8e5f1', transactionId: 'WD-2046', chain: 'Bitcoin', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: wl, netFee: '0.00003', wlAddr: 'WA-3320', kyt: 'Passed', kytRemarks: 'No risk found' });
  inflight({ kind: 'token', status: 'failed', exec: 'rejected', execMethod: 'automated', accountId: 'a3', amount: 100, asset: 'TOKEN', venueId: 'v2', via: '0x71c0ffee0badaddr5risk9hi', ref: '', transactionId: 'WD-2040', chain: 'Ethereum', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: '0x71c0ffee0badaddr5risk9hi', wlAddr: 'WA-3411', kyt: 'Failed', kytRemarks: 'High risk address', failure: 'Failed the KYT check' });
  newRequest('book_movement', bob, { dir: 'out', form: { kind: 'token', venueId: 'v2', asset: 'BTC', amount: 0.00015, at: ago(0, 7), ref: 'TX-FEE-8841', note: 'BTC network fee paid separately from the transfer' } }, 'Fee paid from the hot wallet.');
  saveState();
}

/* Views part 1: helpers, list, create (FR-1 to FR-4, FR-17 list, FR-19, FR-20 list) */

let CUR = USERS[0];
let ROUTE = { path: '', query: {}, parts: [] };
const ACT = {};
const go = (h) => { location.hash = h; };
const isOp = () => CUR.role === 'operator';
const myAccts = () => (isOp() ? ACCOUNTS.map(a => a.id) : (CUR.accounts || []));
const canCreate = () => ['operator', 'submitter', 'individual'].includes(CUR.role);

const SI_OP = { awaiting_client_approval: 'Awaiting client approval', under_review: 'Under review', settling: 'Settling', completed: 'Completed', rejected: 'Rejected', failed: 'Failed' };
const SI_CL = { awaiting_client_approval: 'Awaiting approval', under_review: 'Processing', settling: 'Processing', completed: 'Completed', rejected: 'Rejected', failed: 'Failed' };
const siLabels = () => (isOp() ? SI_OP : SI_CL);
const OB_LABELS = { pending: 'Pending', eligible: 'Eligible', instructed: 'Instructed', partially_settled: 'Partly settled', settled: 'Settled', cancelled: 'Cancelled' };
Object.assign(BADGE, { awaiting_client_approval: 'warning', under_review: 'processing', settling: 'processing', completed: 'success', rejected: 'error', failed: 'error', pending: 'default', eligible: 'processing', instructed: 'processing', partially_settled: 'warning', settled: 'success', cancelled: 'default', detected: 'processing', confirmed: 'success', submitted: 'processing' });

const acctLabel = (id) => { const a = acct(id); return a ? esc(a.name) + '<div class="sub">' + esc(a.number) + '</div>' : '-'; };
const acctName = (id) => (acct(id) || { name: id }).name;
const amtTxt = (n, asset) => fmtAmt(n, asset) + ' ' + asset;
const legInvolvesMine = (l) => isOp() || [l.from, l.to].some(x => x.type === 'account' && myAccts().includes(x.id));
const visibleLegs = (si) => si.legs.filter(legInvolvesMine);
const visibleObs = (si) => si.obs.filter(o => isOp() || myAccts().includes(o.accountId));
const siVisible = (si) => isOp() || visibleLegs(si).length > 0;
const party = (p) => (p.type === 'cp' ? cpOf(p.id) : acct(p.id));
const partyName = (p) => (p ? (party(p) || { name: '?' }).name : '-');
const partyTag = (p) => {
  if (p.type === 'cp') { const c = cpOf(p.id); return c ? esc(c.name) + '<div class="sub gold">Outside party · ' + esc(cpTypeLabel(c.type)) + '</div>' : '<span class="gold-txt">Counterparty not set</span>'; }
  const a = acct(p.id); return a ? esc(acctName(p.id)) + '<div class="sub">' + esc(a.number) + '</div>' : '<span class="gold-txt">Account not set</span>';
};
const cpTypeLabel = (t) => ({ broker: 'Broker', exchange: 'Exchange', issuer: 'Issuer', fund: 'Fund' }[t] || t);
const nextDate = (obs) => { const open = obs.filter(o => !isFinalOb(o)).map(o => o.date).sort(); return open[0] || ''; };
const siAccts = (si) => [...new Set(si.legs.flatMap(l => [l.from, l.to]).filter(p => p.type === 'account' && (isOp() || myAccts().includes(p.id))).map(p => p.id))];
const siCps = (si) => [...new Set(si.legs.flatMap(l => [l.from, l.to]).filter(p => p.type === 'cp').map(p => p.id))];
const overdueCount = (si) => visibleObs(si).filter(isOverdue).length;

/* ======================================================= LIST */
function listDefaults() { return { id: '', account: '', cp: '', statuses: [], from: '', to: '', ext: '', overdue: false, page: 1, size: 10 }; }
const listQuery = (route) => Object.assign(listDefaults(), b64d(route.query.q || '') || {});
const setList = (patch) => go('#' + ROUTE.path + '?q=' + b64e(Object.assign(listQuery(ROUTE), patch)));
function filterSIs(f) {
  return S.sis.filter(si => {
    if (!siVisible(si)) return false;
    if (f.id && !si.id.toLowerCase().includes(f.id.toLowerCase())) return false;
    if (f.ext && !si.extRef.toLowerCase().includes(f.ext.toLowerCase())) return false;
    if (f.account && !siAccts(si).includes(f.account)) return false;
    if (f.cp && !siCps(si).includes(f.cp)) return false;
    if (f.statuses.length && !f.statuses.includes(si.status)) return false;
    if (f.from || f.to) { const nd = nextDate(visibleObs(si)); if (!nd || (f.from && nd < f.from) || (f.to && nd > f.to)) return false; }
    if (f.overdue && !overdueCount(si)) return false;
    return true;
  });
}
function opTabs(active) {
  if (!isOp()) return '';
  return '<div class="sec-bar"><div class="seg"><button class="seg-b' + (active === 'list' ? ' active' : '') + '" data-href-go="#/si">Instructions</button><button class="seg-b' + (active === 'ex' ? ' active' : '') + '" data-href-go="#/exceptions">Exceptions (' + exCount() + ')</button></div></div>';
}
function listView(route) {
  const f = listQuery(route);
  const rows = filterSIs(f);
  const total = rows.length, pages = Math.max(1, Math.ceil(total / f.size)), page = Math.min(f.page, pages);
  const slice = rows.slice((page - 1) * f.size, page * f.size);
  const any = f.id || f.account || f.cp || f.statuses.length || f.from || f.to || f.ext || f.overdue;
  const inp = (key, ph, tip) => '<div class="f input-wrap"><input class="input" id="flt-' + key + '" data-list-text="' + key + '" placeholder="' + ph + '" title="' + tip + '" value="' + esc(f[key]) + '"><span class="search-ico">⌕</span></div>';
  const filters = '<div class="filters">' + inp('id', 'Settlement Instruction ID', 'Matches part of the instruction ID') + inp('ext', 'External reference', 'Matches part of the external reference') +
    '<div class="f">' + selectHtml('f-acc', f.account, ACCOUNTS.filter(a => isOp() || myAccts().includes(a.id)).map(a => [a.id, a.name]), { placeholder: 'Account' }).replace('data-f="f-acc"', 'data-list-sel="account"') + '</div>' +
    '<div class="f">' + selectHtml('f-cp', f.cp, S.cps.map(c => [c.id, c.name]), { placeholder: 'Counterparty' }).replace('data-f="f-cp"', 'data-list-sel="cp"') + '</div>' +
    '<div class="f f-range"><span class="f-lbl">Next settlement</span><input type="date" class="input" title="Next settlement from" data-list-sel="from" value="' + esc(f.from) + '"><span class="f-lbl">to</span><input type="date" class="input" title="Next settlement to" data-list-sel="to" value="' + esc(f.to) + '"></div>' +
    multiSelect('statuses', 'Status', Object.keys(siLabels()).map(k => [k, siLabels()[k]]), f.statuses) +
    (isOp() ? '<label class="f-check"><button type="button" class="switch' + (f.overdue ? ' on' : '') + '" data-act="toggleOverdue"></button> Overdue only</label>' : '') +
    (any ? '<button class="btn btn-link danger" data-act="resetList">Reset all</button>' : '') + '</div>';
  const head = '<th>Settlement Instruction</th><th>External Reference</th><th>Account</th><th>Counterparty</th><th>Next settlement</th><th>Progress</th><th>Status</th>';
  const body = slice.length ? slice.map(si => {
    const vo = visibleObs(si); const settled = vo.filter(o => o.status === 'settled').length; const od = overdueCount(si);
    const prog = vo.length ? settled + ' of ' + vo.length + ' settled' + (od ? ' <span class="tag red">' + od + ' overdue</span>' : '') : '-';
    const nd = nextDate(vo) || '-';
    const st = badge(si.status, siLabels());
    const ac = siAccts(si).map(a => acctName(a)); const acTxt = ac.length ? esc(ac[0]) + (ac.length > 1 ? ' <span class="sub">+' + (ac.length - 1) + ' more</span>' : '') : '<span class="sub">-</span>';
    const cps = siCps(si).map(c => cpOf(c).name); const cpTxt = cps.length ? esc(cps[0]) + (cps.length > 1 ? ' <span class="sub">+' + (cps.length - 1) + ' more</span>' : '') : '<span class="sub">-</span>';
    return '<tr class="click" data-href="#/si/' + si.id + '"><td>' + esc(si.id) + '</td><td>' + esc(si.extRef) + '</td><td class="nw">' + acTxt + '</td><td>' + cpTxt + '</td><td class="nw">' + esc(nd) + '</td><td>' + prog + '</td><td>' + st + '</td></tr>';
  }).join('') : '<tr><td colspan="7"><div class="empty"><div class="big">No settlement instructions found</div>' + (any ? '<button class="btn" data-act="resetList">Reset all</button>' : '') + '</div></td></tr>';
  const pageBtns = []; for (let i = 1; i <= pages; i++) pageBtns.push('<button class="page-btn' + (i === page ? ' active' : '') + '" data-act="goPage" data-arg="' + i + '">' + i + '</button>');
  const html = opTabs('list') + filters + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table><div class="pager"><span>' + (total ? (page - 1) * f.size + 1 : 0) + '-' + Math.min(page * f.size, total) + ' of ' + total + ' items</span>' + pageBtns.join('') +
    '<select class="select" data-act-change="setSize">' + [10, 20, 50].map(n => '<option' + (n === f.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>';
  return { title: 'Settlement Instructions', crumbs: ['Dashboard', 'Transaction Management', 'Settlement Instructions'], buttons: btn('Export CSV', 'exportCsv', null, '') + (canCreate() ? btn('Add New', 'addSI', null, 'btn-primary') : ''), html };
}
function btn(label, act, arg, cls, o) {
  o = o || {};
  return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + (o.disabled ? ' disabled' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + esc(label) + '</button>';
}
ACT.resetList = () => go('#' + ROUTE.path);
ACT.toggleOverdue = () => setList({ overdue: !listQuery(ROUTE).overdue, page: 1 });
ACT.goPage = (el) => setList({ page: +el.dataset.arg });
ACT.setSize = (el) => setList({ size: +el.value, page: 1 });
ACT.addSI = () => { CR = null; go('#/si/create'); };
ACT.exportCsv = () => {
  const rows = filterSIs(listQuery(ROUTE));
  csvDownload('settlement-instructions.csv', [['ID', 'External reference', 'Status', 'Legs', 'Next settlement', 'Created at']].concat(rows.map(si => [si.id, si.extRef, siLabels()[si.status], visibleLegs(si).length, nextDate(visibleObs(si)), si.createdAt])));
  toast({ title: 'Export started', desc: rows.length + ' rows exported using the current filters.' });
};

/* ======================================================= CREATE */
let CR = null;
const newCR = () => ({ purpose: '', purposeOther: '', extRef: '', note: '', legs: [], errors: [], started: false, submitted: false });
const LEG_TYPES = () => (isOp()
  ? [['internal', 'Internal transfer'], ['send_ext', 'Send to outside party'], ['recv_ext', 'Receive from outside party']]
  : [['internal', 'Internal transfer'], ['send', 'Send (to an account I cannot access)'], ['recv', 'Receive (from an account I cannot access)'], ['send_ext', 'Send to outside party'], ['recv_ext', 'Receive from outside party']]);
const legTypeLabel = (t) => (LEG_TYPES().find(x => x[0] === t) || [0, t])[1];
function resolveAccountNumber(txt) {
  const n = String(txt || '').replace(/\s/g, '').toLowerCase();
  const a = ACCOUNTS.find(x => x.number.replace(/\s/g, '').toLowerCase() === n);
  return a ? a.id : null;
}
function draftLegs() { return CR.legs.map(l => ({ from: l.from, to: l.to, assetId: l.assetId, amount: l.amount, fixed: l.fixed, date: l.date, seq: l.seq || 0, detailId: l.detailId, extRef: l.extRef, remarks: l.remarks })); }

/* Funding preview (FR-19): plain-language status per account, schedule behind a link */
const PVOPEN = new Set();
document.addEventListener('toggle', (e) => { const k = e.target && e.target.dataset && e.target.dataset.pv; if (k) { if (e.target.open) PVOPEN.add(k); else PVOPEN.delete(k); } }, true);
function pvSummary(r, problems) {
  const mine = problems.filter(p => p.accountId === r.accountId && p.asset === r.asset);
  const bad = r.steps.find(s => s.bad);
  const lowest = r.steps.reduce((m, s) => (s.balance < m.v ? { v: s.balance, d: s.date } : m), { v: r.total, d: '' });
  const A = (n) => amtTxt(n, r.asset);
  let level = 'ok', text;
  if (bad) { level = 'bad'; text = 'Short by <b>' + esc(A(-bad.balance)) + '</b> on ' + esc(bad.date) + '. Move a receipt earlier, or reduce or delay a payment.'; }
  else if (mine.length) { level = 'bad'; const p = mine[0]; text = 'Needs <b>' + esc(A(p.earmark)) + '</b> set aside but only ' + esc(A(p.available)) + ' is available (short ' + esc(A(p.shortfall)) + ').'; }
  else if (r.overCommit) { level = 'info'; text = 'Can promise more than it holds. A payment waits until the funds arrive, and the balance never goes below zero.'; }
  else text = 'Has enough. Holds ' + esc(A(r.total)) + ' and needs ' + esc(A(r.earmark)) + ' set aside.';
  return { level, text, lowest };
}
function pvResult(x, pv) {
  const r = x.r; const A = (n) => amtTxt(n, r.asset);
  const bad = r.steps.find(st => st.bad); const mine = pv.problems.filter(p => p.accountId === r.accountId && p.asset === r.asset);
  if (bad) return '<span class="pv-res bad">Short by ' + esc(A(-bad.balance)) + '<i>on ' + esc(bad.date) + '</i></span>';
  if (mine.length) return '<span class="pv-res bad">Short by ' + esc(A(mine[0].shortfall)) + '<i>' + esc(A(mine[0].available)) + ' available</i></span>';
  if (r.overCommit) return '<span class="pv-res info">Can commit beyond balance</span>';
  return '<span class="pv-res ok">Enough funds</span>';
}
function previewHtml() {
  const head = (extra) => '<div class="card-head"><span class="ch-title"><b>Funding check</b><span class="ch-desc">Shows whether each account has enough funds for the legs above.</span></span>' + (extra || '') + '</div>';
  if (!draftLegs().length) return '<div class="card preview">' + head() + '<div class="card-body note">Add a transfer leg to see whether each account has enough funds.</div></div>';
  const pv = previewFor(CUR, draftLegs());
  if (!pv.rows.length) return '<div class="card preview">' + head() + '<div class="card-body note">None of the accounts in this draft are visible to you.</div></div>';
  const items = pv.rows.map(r => Object.assign({ r }, pvSummary(r, pv.problems)));
  const rank = { bad: 0, info: 1, ok: 2 };
  items.sort((x, y) => rank[x.level] - rank[y.level]);
  const nBad = items.filter(x => x.level === 'bad').length;
  const badge = nBad ? '<span class="tag red">' + nBad + (nBad > 1 ? ' accounts are short' : ' account is short') + '</span>' : '<span class="tag green">All accounts covered</span>';
  const result = (x) => pvResult(x, pv);
  const row = (x) => {
    const r = x.r; const key = r.accountId + '|' + r.asset;
    return '<details class="pv-row ' + x.level + '" data-pv="' + esc(key) + '"' + (PVOPEN.has(key) || x.level === 'bad' ? ' open' : '') + '><summary><span class="pv-acct-name">' + esc(acctName(r.accountId)) + ' <span class="sub">' + esc(r.asset) + '</span></span>' +
      '<span class="pv-num">' + esc(fmtAmt(r.total, r.asset)) + '</span><span class="pv-num">' + esc(fmtAmt(r.earmark, r.asset)) + '</span><span class="pv-num">' + esc(fmtAmt(x.lowest.v, r.asset)) + (x.lowest.d ? '<i>' + esc(x.lowest.d) + '</i>' : '') + '</span>' + result(x) + '</summary>' +
      '<div class="pv-steps"><table class="pv-tbl"><tr><th>Date</th><th>Change</th><th>Balance after</th></tr>' +
      r.steps.map(st => '<tr class="' + (st.bad ? 'pv-short' : '') + '"><td>' + esc(st.date) + '</td><td>' + (st.delta > 0 ? '+' : '') + fmtAmt(st.delta, r.asset) + '</td><td>' + fmtAmt(st.balance, r.asset) + (st.bad ? ' ⚠' : '') + '</td></tr>').join('') + '</table></div></details>';
  };
  return '<div class="card preview">' + head(badge) + '<div class="pv-list"><div class="pv-hdr"><span>Account</span><span>Balance</span><span>Needs set aside</span><span>Lowest balance</span><span>Result</span></div>' + items.map(row).join('') + '</div>' +
    '<div class="note pv-foot">Updates as you edit legs. Click an account to see the day-by-day schedule. The final check runs when the instruction is approved.</div></div>';
}
function legRowFlag(i, pvIn) {
  const pv = pvIn || previewFor(CUR, draftLegs()); const l = CR.legs[i];
  const hit = pv.rows.some(r => r.steps.some(s => s.bad && s.date === l.date) && [l.from, l.to].some(p => p.type === 'account' && p.id === r.accountId && r.asset === l.assetId));
  return hit ? '<div><span class="tag red">short on ' + esc(l.date) + '</span></div>' : '';
}

/* Legs table: grouped by date, collapsible groups, filters when there are many legs */
const LEG_MANY = 8, GROUP_COLLAPSE = 6;
const lf = () => { CR.lf = CR.lf || { q: '', date: '', ext: false, problems: false }; CR.open = CR.open || {}; return CR.lf; };
ACT.legFilter = (el) => { lf()[el.dataset.lf] = el.type === 'checkbox' ? el.checked : el.value; rerender(); };
ACT.toggleDate = (el) => { const d = el.dataset.arg; const cnt = CR.legs.filter(l => l.date === d).length; lf(); const cur = d in CR.open ? CR.open[d] : cnt <= GROUP_COLLAPSE; CR.open[d] = !cur; rerender(); };
ACT.clearLegFilter = () => { CR.lf = { q: '', date: '', ext: false, problems: false }; rerender(); };
const legExt = (l) => l.from.type === 'cp' || l.to.type === 'cp';
function legsTableHtml() {
  if (!CR.legs.length) return '<div class="empty"><div class="big">No transfer legs</div><div>Add your transfer leg by clicking the button below.</div><button class="btn" data-act="addLeg" style="margin-top:8px">+ Add Transfer Leg</button></div>';
  const f = lf(); const many = CR.legs.length > LEG_MANY; const pv = previewFor(CUR, draftLegs());
  const dates = [...new Set(CR.legs.map(l => l.date))].sort();
  let bar = '';
  if (many) {
    bar = '<div class="leg-filters"><input class="input" data-lf="q" id="lf-q" placeholder="Search account, counterparty or asset" value="' + esc(f.q) + '">' +
      '<select class="select" data-lf="date"><option value="">All dates</option>' + dates.map(d => '<option value="' + d + '"' + (f.date === d ? ' selected' : '') + '>' + d + '</option>').join('') + '</select>' +
      '<label><input type="checkbox" data-lf="ext"' + (f.ext ? ' checked' : '') + '> Outside party only</label><label><input type="checkbox" data-lf="problems"' + (f.problems ? ' checked' : '') + '> Problems only</label>' +
      (f.q || f.date || f.ext || f.problems ? '<button class="btn btn-link" data-act="clearLegFilter">Clear</button>' : '') + '</div>';
  }
  const q = f.q.trim().toLowerCase();
  const match = (l, i) => {
    if (!many) return true;
    if (f.date && l.date !== f.date) return false;
    if (f.ext && !legExt(l)) return false;
    if (f.problems && !legRowFlag(i, pv)) return false;
    if (q && !(partyName(l.from) + ' ' + partyName(l.to) + ' ' + l.assetId).toLowerCase().includes(q)) return false;
    return true;
  };
  const order = CR.legs.map((l, i) => i).sort((a, b) => posKey(CR.legs[a].date, CR.legs[a].seq).localeCompare(posKey(CR.legs[b].date, CR.legs[b].seq)));
  let rows = '', shown = 0;
  dates.forEach(d => {
    const all = order.filter(i => CR.legs[i].date === d); const idx = all.filter(i => match(CR.legs[i], i));
    if (!idx.length) return;
    shown += idx.length;
    const open = many && (f.q || f.problems || f.ext || f.date) ? true : (d in CR.open ? CR.open[d] : all.length <= GROUP_COLLAPSE);
    const nExt = all.filter(i => legExt(CR.legs[i])).length;
    rows += '<tr class="date-row click" data-act="toggleDate" data-arg="' + d + '"><td colspan="5"><span class="chev">' + (open ? '▾' : '▸') + '</span> Settles ' + esc(d) + (d === S.today ? ' (today)' : '') + ' <span class="sub">· ' + all.length + ' leg' + (all.length > 1 ? 's' : '') + (nExt ? ', ' + nExt + ' with outside parties' : '') + '</span></td></tr>';
    if (!open) return;
    idx.forEach(i => {
      const l = CR.legs[i]; const ext = legExt(l);
      const amt = l.fixed && !(l.amount > 0) ? '<span class="gold-txt">Amount not set</span>' : l.fixed ? '<b class="mono">' + esc(fmtAmt(l.amount, l.assetId)) + '</b> <span class="sub">' + esc(l.assetId) + '</span>' : '<span class="gold-txt">Unknown</span> <span class="sub">' + esc(l.assetId) + '</span>';
      rows += '<tr class="' + (ext ? 'leg-ext' : '') + '"><td class="pcell">' + partyTag(l.from) + '</td><td class="pcell">' + partyTag(l.to) + '</td><td class="nw amt-cell">' + amt + '</td><td class="stat-cell">' + (ext ? '<span class="tag gold">Leaves custody</span>' : '') + (legNeedsFix(l) ? '<span class="tag red">Needs attention</span>' : '') + '</td><td class="nw act-cell"><button class="btn btn-link" data-act="editLeg" data-arg="' + i + '">Edit</button><button class="btn btn-link" data-act="dupLeg" data-arg="' + i + '">Duplicate</button><button class="btn btn-link danger" data-act="delLeg" data-arg="' + i + '">Delete</button></td></tr>';
    });
  });
  if (!shown) rows = '<tr><td colspan="5"><div class="empty"><div class="big">No legs match</div><button class="btn" data-act="clearLegFilter">Clear filters</button></div></td></tr>';
  const count = many ? '<div class="sub" style="margin-bottom:8px">Showing ' + shown + ' of ' + CR.legs.length + ' legs</div>' : '';
  return bar + count + '<div class="tbl-wrap' + (many ? ' legs-scroll' : '') + '"><table class="tbl legs-tbl legs-edit"><thead><tr><th>Source</th><th>Destination</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
function bindForm(root, st, cb) {
  root.querySelectorAll('[data-f]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { st[el.dataset.f] = el.value; if (cb) cb(el.dataset.f, el); }));
}
ACT.exitCreate = () => { CR = null; go('#/si'); };
ACT.delLeg = (el) => { CR.legs.splice(+el.dataset.arg, 1); rerender(); };
ACT.addLeg = () => openLegModal(-1);
ACT.editLeg = (el) => openLegModal(+el.dataset.arg);

let ADD_MORE = false;
function openLegModal(index, prefill) {
  const editing = index >= 0;
  const F = editing ? JSON.parse(JSON.stringify(CR.legs[index])) : Object.assign({ type: 'internal', from: { type: 'account', id: '' }, to: { type: 'account', id: '' }, assetId: '', amount: null, fixed: true, date: S.today, seq: 0, detailId: '', extRef: '', remarks: '', manual: '', showSeq: false }, prefill ? JSON.parse(JSON.stringify(prefill)) : {});
  if (!editing && !prefill) ADD_MORE = false;
  if (editing && !F.type) F.type = 'internal';
  if (editing || !F.mside) { F.mside = F.type === 'send' ? 'to' : F.type === 'recv' ? 'from' : (F.mside || ''); if (editing && F.mside) { const ac = ACCOUNTS.find(x => x.id === F[F.mside].id); F.manual = ac ? ac.number : ''; } }
  const mine = ACCOUNTS.filter(a => myAccts().includes(a.id));
  const accSel = (id, val, opts) => selectHtml(id, val, (opts || mine).map(a => [a.id, a.name + ' | ' + a.number]), { placeholder: 'Search and select account' });
  const cpSel = (id, val) => '<select class="select" id="' + id + '" data-f="' + id + '"><option value="">Search and select counterparty</option>' + S.cps.filter(c => c.status !== 'closed').map(c => '<option value="' + c.id + '"' + (c.status !== 'active' ? ' disabled' : '') + (c.id === val ? ' selected' : '') + '>' + esc(c.name + ' | ' + cpTypeLabel(c.type) + (c.status !== 'active' ? ' (suspended)' : '')) + '</option>').join('') + '</select>';
  const paint = (m) => {
    const body = m.querySelector('.modal-body');
    const derive = () => { const fm = F.mside === 'from', tm = F.mside === 'to'; F.type = fm ? 'recv' : tm ? 'send' : F.from.type === 'cp' ? 'recv_ext' : F.to.type === 'cp' ? 'send_ext' : 'internal'; };
    derive(); const t = F.type; const ext = t === 'send_ext' || t === 'recv_ext';
    const sv = (p, side) => F.mside === side ? 'm:' : p.type === 'cp' ? (p.id ? 'c:' + p.id : '') : (p.id ? 'a:' + p.id : '');
    const partySel = (id, p, side) => {
      const cur = sv(p, side);
      return '<select class="select" id="' + id + '" data-f="' + id + '"><option value="">Search and select account</option>' +
        '<optgroup label="Internal accounts">' + mine.map(a => '<option value="a:' + a.id + '"' + (cur === 'a:' + a.id ? ' selected' : '') + '>' + esc(a.name + ' | ' + a.number) + '</option>').join('') + '</optgroup>' +
        '<optgroup label="External counterparties">' + S.cps.filter(c => c.status !== 'closed').map(c => '<option value="c:' + c.id + '"' + (c.status !== 'active' ? ' disabled' : '') + (cur === 'c:' + c.id ? ' selected' : '') + '>' + esc(c.name + ' | ' + cpTypeLabel(c.type) + (c.status !== 'active' ? ' (suspended)' : '')) + '</option>').join('') + '</optgroup>' +
        (isOp() ? '' : '<optgroup label="Other"><option value="m:"' + (cur === 'm:' ? ' selected' : '') + '>Account I cannot access (enter account number)</option></optgroup>') + '</select>' +
        (cur === 'm:' ? '<input class="input" id="manual" data-f="manual" style="margin-top:8px" placeholder="Enter the account number" value="' + esc(F.manual) + '">' : '');
    };
    const fromH = partySel('src', F.from, 'from'), toH = partySel('dst', F.to, 'to');
    const cpId = ext ? (t === 'send_ext' ? F.to.id : F.from.id) : '';
    const dets = cpId && F.assetId ? detailsFor(cpId, F.assetId) : [];
    const detH = dets.length > 1 ? formItem('Counterparty whitelist', selectHtml('detailId', F.detailId, dets.map(d => [d.id, d.label + ' v' + d.version + ' · ' + d.ref]), { placeholder: 'Choose which to use' }), { id: 'detailId', required: true, hint: 'More than one approved detail exists for this asset.' })
      : (cpId && F.assetId ? '<div class="note" style="margin:-8px 0 16px">' + (dets.length === 1 ? 'Uses the approved whitelist: ' + esc(dets[0].label) + ' v' + dets[0].version : '<span style="color:var(--error-text)">This counterparty has no approved whitelists for ' + esc(F.assetId) + '.</span>') + '</div>' : '');
    body.innerHTML = '<div class="alert info">Only unified accounts can be used. ' + (ext ? 'Outside party legs leave custody and are always gross (never netted).' : '') + '</div>' +
      '<div class="form-sec">Parties</div><div class="form-sec-desc">Select the account that sends the asset and the account that receives it.</div>' +
      '<div class="row2">' + formItem('Source', fromH, { id: 'from', required: true }) + formItem('Destination', toH, { id: 'to', required: true }) + '</div>' +
      '<div class="form-sec">Asset and amount</div><div class="form-sec-desc">Select the asset to transfer and specify the amount.</div>' +
      '<div class="row3">' + formItem('Asset', selectHtml('assetId', F.assetId, Object.keys(ASSETS), { placeholder: 'Select asset' }), { id: 'assetId', required: true }) +
      formItem('Amount type', '<select class="select" id="atype" data-f="atype"><option value="known"' + (F.fixed ? ' selected' : '') + '>Known</option><option value="unknown"' + (F.fixed ? '' : ' selected') + '>Unknown</option></select>', { id: 'atype', required: true, hint: F.fixed ? '' : 'The amount is set later, for example when a fund NAV is struck.' }) + (F.fixed ? formItem('Amount', '<input class="input" id="amount" data-f="amount" type="number" step="any" min="0" placeholder="Enter amount" value="' + (F.amount == null ? '' : F.amount) + '">', { id: 'amount', required: true }) : '') + '</div>' +
      detH +
      '<div class="form-sec">Schedule and references</div><div class="form-sec-desc">Set the settlement date and add optional references.</div>' +
      '<div class="row2">' + formItem('Settlement date', '<input class="input" id="date" data-f="date" type="date" min="' + S.today + '" value="' + esc(F.date) + '">', { id: 'date', required: true }) + formItem('External reference', '<input class="input" id="lextRef" data-f="extRef" value="' + esc(F.extRef) + '">', { optional: true }) + '</div>' +
      formItem('Internal note', '<textarea class="input" id="lremarks" data-f="remarks" rows="2" style="height:auto;padding:8px 12px">' + esc(F.remarks) + '</textarea>', { optional: true, hint: 'Only visible internally.' }) +
      (editing ? '' : '<div class="form-item"><label><input type="checkbox" id="addmore"' + (ADD_MORE ? ' checked' : '') + '> Add another leg after this one <span class="opt">(keeps source, destination, asset and date)</span></label></div>') +
      '<div class="help" id="leg-err"></div>';
    const am = body.querySelector('#addmore'); if (am) am.addEventListener('change', () => { ADD_MORE = am.checked; });
    const read = () => {
      const v = (id) => { const e = body.querySelector('#' + id); return e ? e.value : ''; };
      F.assetId = v('assetId'); F.date = v('date'); F.extRef = v('lextRef'); F.remarks = v('lremarks');
      const amt = v('amount'); F.amount = amt === '' ? null : +amt; F.manual = v('manual'); F.detailId = v('detailId') || F.detailId;
    };
    body.querySelectorAll('[data-f]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      const id = el.id; read();
      const pick = (v) => v.startsWith('c:') ? { type: 'cp', id: v.slice(2) } : { type: 'account', id: v.startsWith('a:') ? v.slice(2) : '' };
      if (id === 'src') { F.mside = el.value === 'm:' ? 'from' : (F.mside === 'from' ? '' : F.mside); F.from = pick(el.value); F.detailId = ''; F.manual = F.mside ? F.manual : ''; }
      if (id === 'dst') { F.mside = el.value === 'm:' ? 'to' : (F.mside === 'to' ? '' : F.mside); F.to = pick(el.value); F.detailId = ''; F.manual = F.mside ? F.manual : ''; }
      if (id === 'atype') { F.fixed = el.value === 'known'; if (!F.fixed) F.amount = null; }
      if (['src', 'dst', 'assetId', 'atype'].includes(id)) paint(m);
    }));
  };
  openModal({
    title: editing ? 'Edit Transfer Leg' : 'Add New Transfer Leg', sub: 'Provide the details for your transfer.', wide: true, body: '', okText: editing ? 'Update' : 'Add',
    onMount: paint,
    onOk(m) {
      const body = m.querySelector('.modal-body');
      const bad = (msg) => { body.querySelector('#leg-err').textContent = msg; return false; };
      const mv = (id) => { const e = body.querySelector('#' + id); return e ? e.value : ''; };
      F.assetId = mv('assetId'); F.date = mv('date'); F.extRef = mv('lextRef'); F.remarks = mv('lremarks'); F.manual = mv('manual') || F.manual; const amt = mv('amount'); F.amount = F.fixed ? (amt === '' ? null : +amt) : null;
      const t = F.type; const ext = t === 'send_ext' || t === 'recv_ext';
      if (!F.from.id && F.mside !== 'from' || !F.to.id && F.mside !== 'to') return bad('Choose both Source and Destination.');
      if (t === 'send') { const id = resolveAccountNumber(F.manual); if (!id) return bad('INVALID_ACCOUNT_ID: Invalid account ID.'); F.to = { type: 'account', id }; }
      if (t === 'recv') { const id = resolveAccountNumber(F.manual); if (!id) return bad('INVALID_ACCOUNT_ID: Invalid account ID.'); F.from = { type: 'account', id }; }
      if (F.from.type === 'cp' && F.to.type === 'cp') return bad('Source and Destination cannot both be counterparties.');
      if (F.from.type === 'account' && F.to.type === 'account' && F.from.id === F.to.id) return bad('Source and Destination must differ.');
      if (!F.assetId) return bad('Choose an asset.');
      if (!F.fixed && !(isOp() && ext)) return bad('Unknown amount is only allowed for an operator on a leg with an outside party.');
      if (F.fixed && !(F.amount > 0)) return bad('Amount must be greater than zero.');
      if (F.fixed && !amountOk(F.amount, F.assetId)) return bad('Amount has more decimal places than ' + F.assetId + ' supports.');
      if (!F.date) return bad('Choose a settlement date.');
      F.seq = F.seq || 0;
      const leg = { type: t, from: F.from, to: F.to, assetId: F.assetId, amount: F.fixed ? F.amount : null, fixed: F.fixed, indicative: null, date: F.date, seq: F.seq, detailId: F.detailId || '', extRef: F.extRef, remarks: F.remarks };
      if (editing) CR.legs[index] = leg; else CR.legs.push(leg);
      CR.errors = [];
      rerender();
      if (editing) { const nx = CR.legs.findIndex((l2, k2) => k2 > index && legNeedsFix(l2)); if (nx >= 0) setTimeout(() => openLegModal(nx), 60); }
      if (!editing && ADD_MORE) setTimeout(() => openLegModal(-1, { type: t, from: leg.from, to: leg.to, assetId: leg.assetId, date: leg.date, fixed: leg.fixed, detailId: leg.detailId, manual: F.manual, showSeq: false }), 60);
    }
  });
}

ACT.submitCreate = () => {
  const fields = { purpose: CR.purpose, purposeOther: CR.purposeOther, extRef: CR.extRef, note: CR.note };
  const errs = validateLegs(CUR, draftLegs(), { fields }).map(e => Object.assign(e, e.leg === -1 ? { field: /purpose.*required/i.test(e.message) ? 'purpose' : /specify/i.test(e.message) ? 'purposeOther' : /reference/i.test(e.message) ? 'extRef' : '' } : {}));
  CR.errors = errs;
  if (errs.length) { rerender(); return; }
  const pv = previewFor(CUR, draftLegs());
  rerender();
  const groups = {};
  CR.legs.forEach(l => { (groups[l.date] = groups[l.date] || []).push(l); });
  const dates = Object.keys(groups).sort();
  const rows = dates.map(d => '<tr class="date-row"><td colspan="4">Settles ' + esc(d) + ' <span class="sub">· ' + groups[d].length + ' leg' + (groups[d].length > 1 ? 's' : '') + '</span></td></tr>' + groups[d].map(l => '<tr class="' + (legExt(l) ? 'leg-ext' : '') + '"><td class="pcell">' + partyTag(l.from) + '</td><td class="pcell">' + partyTag(l.to) + '</td><td class="nw amt-cell">' + (l.fixed ? '<b class="mono">' + esc(fmtAmt(l.amount, l.assetId)) + '</b> <span class="sub">' + esc(l.assetId) + '</span>' : '<span class="gold-txt">Unknown</span> <span class="sub">' + esc(l.assetId) + '</span>') + '</td><td class="stat-cell">' + (legExt(l) ? '<span class="tag gold">Leaves custody</span>' : '') + '</td></tr>').join('')).join('');
  /* plain-language summary */
  const sumBy = (arr) => { const t = {}; arr.filter(l => l.fixed).forEach(l => { t[l.assetId] = (t[l.assetId] || 0) + l.amount; }); return Object.keys(t).map(k => amtTxt(r8(t[k]), k)).join(', '); };
  const outL = CR.legs.filter(l => l.to.type === 'cp'), inL = CR.legs.filter(l => l.from.type === 'cp'), intL = CR.legs.filter(l => !legExt(l));
  const unk = (arr) => { const n = arr.filter(l => !l.fixed).length; return n ? (sumBy(arr) ? ', plus ' : '') + n + ' with an unknown amount' : ''; };
  const pl = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
  const lines = [];
  if (outL.length) lines.push('<li><b>' + pl(outL.length, 'payment') + ' leave' + (outL.length > 1 ? '' : 's') + ' custody</b> to outside parties: ' + esc(sumBy(outL)) + esc(unk(outL)) + '.</li>');
  if (inL.length) lines.push('<li><b>' + pl(inL.length, 'receipt') + '</b> expected from outside parties: ' + esc(sumBy(inL)) + esc(unk(inL)) + '.</li>');
  if (intL.length) lines.push('<li><b>' + pl(intL.length, 'transfer') + '</b> stay' + (intL.length > 1 ? '' : 's') + ' between accounts' + (sumBy(intL) ? ': ' + esc(sumBy(intL)) : '') + '.</li>');
  lines.push('<li>Settles on <b>' + dates.length + ' date' + (dates.length > 1 ? 's' : '') + '</b>: ' + esc(dates.slice(0, 4).join(', ')) + (dates.length > 4 ? ' and ' + (dates.length - 4) + ' more' : '') + '.</li>');
  const items = pv.rows.map(r => Object.assign({ r }, pvSummary(r, pv.problems)));
  items.sort((x, y) => ({ bad: 0, info: 1, ok: 2 }[x.level] - { bad: 0, info: 1, ok: 2 }[y.level]));
  const perAcct = items.map(x => '<div class="pv-row ' + x.level + '"><div class="pv-sum-row"><span class="pv-acct-name">' + esc(acctName(x.r.accountId)) + ' <span class="sub">' + esc(x.r.asset) + '</span></span><span class="pv-num">' + esc(fmtAmt(x.r.total, x.r.asset)) + '</span><span class="pv-num">' + esc(fmtAmt(x.r.earmark, x.r.asset)) + '</span><span class="pv-num">' + esc(fmtAmt(x.lowest.v, x.r.asset)) + (x.lowest.d ? '<i>' + esc(x.lowest.d) + '</i>' : '') + '</span>' + pvResult(x, pv) + '</div></div>').join('');
  const badItems = pv.rows.map(r => Object.assign({ r }, pvSummary(r, pv.problems))).filter(x => x.level === 'bad');
  const check = badItems.length ? '<div class="alert warning" style="margin-top:12px"><div><b>The funding check found a problem.</b> You can still submit, but approval will fail until it is fixed.</div></div>' : '';
  const purposeLabel = (PURPOSES.find(p => p[0] === CR.purpose) || [0, CR.purpose])[1];
  const detailsRows = [['Transaction purpose', esc(CR.purpose === 'others' && CR.purposeOther ? purposeLabel + ': ' + CR.purposeOther : purposeLabel)], ['External reference', esc(CR.extRef)], ['Internal note', esc(CR.note || '-')]];
  const next = isOp() ? 'Another operator must approve this before anything happens. Nothing is earmarked until then.' : (CUR.role === 'individual' ? 'Your own accounts are approved straight away and funds are set aside now. An operator then reviews the instruction.' : 'The approvers of the accounts involved will be asked to approve. Funds are set aside as each account approves.');
  const sec = (t, d) => '<div class="form-sec">' + t + '</div>' + (d ? '<div class="form-sec-desc">' + d + '</div>' : '');
  const body = '<div class="rv-sum"><div class="rv-h">What this instruction does</div><ul>' + lines.join('') + '</ul></div>' +
    sec('Settlement Instruction Details') + '<div class="rv-kv">' + detailsRows.map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>' +
    sec('Transfer Legs (' + CR.legs.length + ')') +
    '<details class="rv-legs" style="margin-top:0"' + (CR.legs.length <= GROUP_COLLAPSE ? ' open' : '') + '><summary' + (CR.legs.length <= GROUP_COLLAPSE ? ' style="display:none"' : '') + '>Show legs</summary><div class="tbl-wrap' + (CR.legs.length > LEG_MANY ? ' legs-scroll' : '') + '"><table class="tbl legs-tbl legs-edit"><thead><tr><th>Source</th><th>Destination</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>' +
    (perAcct ? sec('Funding check') + '<div class="pv-list rv-pv"><div class="pv-hdr"><span>Account</span><span>Balance</span><span>Needs set aside</span><span>Lowest balance</span><span>Result</span></div>' + perAcct + '</div>' : '') + check +
    sec('What happens next') + '<div class="rv-next">' + esc(next) + '</div>' +
    '<div class="form-item" style="margin-top:16px"><label>Comment <span class="opt">(Optional)</span></label><textarea class="textarea" id="rv-comment"></textarea></div>';
  openModal({
    title: 'Review settlement instruction', sub: 'Check what will happen before you submit.', wide: true,
    body,
    okText: isOp() ? 'Confirm and submit for approval' : 'Confirm and submit',
    onOk(m) {
      const comment = m.querySelector('#rv-comment').value;
      const legs = draftLegs();
      if (isOp()) {
        const req = newRequest('si_create', CUR, { fields, legs }, comment);
        CR = null; toast({ title: 'Settlement instruction submitted', desc: 'Awaiting approval by another operator. Nothing is earmarked yet.', button: { label: 'View Details', onClick: () => go('#/approvals/' + req.id) } }); go('#/si');
        return;
      }
      const res = createSI(CUR, Object.assign({}, fields, { legs }), { via: 'client' });
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; }
      CR = null;
      toast({ title: 'Settlement instruction created', desc: res.si.status === 'under_review' ? 'All accounts are approved. Awaiting the operator.' : 'Awaiting approval of the accounts involved. Nothing is earmarked yet for them.', button: { label: 'View Details', onClick: () => go('#/si/' + res.si.id) } });
      go('#/si/' + res.si.id);
    }
  });
};

/* Views part 2: detail, actions, exceptions, maker-checker, balances, demo controls */

const SI_TABS = ['progress', 'legs', 'approvals', 'postings', 'other', 'audit'];
const curTab = () => (SI_TABS.includes(ROUTE.query.tab) ? ROUTE.query.tab : 'progress');
const setTab = (id, tab) => { go('#/si/' + id + '?tab=' + tab); rerender(); };
ACT.setTab = (el) => setTab(ROUTE.parts[1], el.dataset.arg);
ACT.openSec = ACT.setTab;
ACT.noop = () => {};
function tabsHtml(defs, active) {
  return '<div class="tabs">' + defs.map(d => '<button class="tab' + (d.key === active ? ' active' : '') + '" data-act="setTab" data-arg="' + d.key + '">' + esc(d.label) + (d.flag ? '<span class="dot"></span>' : '') + '</button>').join('') + '</div>';
}
function overviewHtml(facts, attn) {
  return '<div class="overview"><h3>Overview</h3><div class="ov-grid">' + facts.map(f => '<div><div class="ov-k">' + esc(f[0]) + '</div><div class="ov-v">' + f[1] + '</div></div>').join('') + '</div>' +
    '<div class="ov-attn"><div class="ov-k">Needs attention</div>' + (attn.length ? attn.map(a => '<div class="attn ' + a.level + '"><div class="grow">' + a.html + '</div></div>').join('') : '<div class="attn-ok"><b>✓</b>Nothing needs attention.</div>') + '</div></div>';
}
const exCount = () => { const e = exceptions(); return e.overdue.length + e.failed.length + e.unclass.length + e.waiting.length + e.suspended.length; };

function reasonModal(o) {
  return openModal({
    title: o.title, sub: o.sub, okText: o.okText, okDanger: o.danger, body: (o.info || '') + '<div class="form-item"><label><span class="req">*</span>' + esc(o.label) + '</label><textarea class="textarea" id="rs-text"></textarea></div>',
    onMount(m) { const ok = m.querySelector('[data-m="ok"]'); ok.disabled = true; m.querySelector('#rs-text').addEventListener('input', (e) => { ok.disabled = !e.target.value.trim(); }); },
    onOk(m) { return o.onOk(m.querySelector('#rs-text').value.trim()); }
  });
}
const done = (res, okTitle, okDesc) => { if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; } toast({ title: okTitle, desc: okDesc }); rerender(); return true; };

/* ======================================================= DETAIL (FR-17) */
function obCard(si, o) {
  const ext = o.cpId != null; const over = isOverdue(o); const cp = ext ? cpOf(o.cpId) : null;
  const pct = o.amount ? Math.min(100, (o.settled / o.amount) * 100) : 0;
  const mvs = S.movs.filter(m => m.links && m.links.some(l => l.obId === o.id));
  const op = isOp() && si.status === 'settling';
  let actions = '';
  if (op && !isFinalOb(o)) {
    const und = undischarged(o);
    const live = ['eligible', 'instructed', 'partially_settled'].includes(o.status);
    if (ext && o.dir === 'deliver' && live && und > 0) actions += btn(mvs.some(m => m.status === 'failed') ? 'Reissue movement' : 'Select venue and create movement', 'createMv', o.id, 'btn-primary', { disabled: cp.status !== 'active', title: cp.status !== 'active' ? 'The counterparty is suspended.' : '' });
    if (ext && o.dir === 'receive' && live) actions += btn('Simulate arrival', 'simArrival', o.id, '');
    if (!o.fixed) actions += btn('Set amount', 'setAmt', o.id, '');
  }
  const mvHtml = isOp() ? mvs.map(m => {
    const dead = m.status === 'failed';
    let a = '';
    if (m.dir === 'out' && si.status === 'settling') {
      if (m.status === 'pending') a = btn('Submit', 'submitMv', m.id, 'btn-primary btn-sm') + btn('Mark failed', 'markFailed', m.id, 'btn-sm');
      if (m.status === 'submitted') a = btn('Simulate bank confirmation', 'confirmMv', m.id, 'btn-primary btn-sm') + btn('Simulate bank rejection', 'bankReject', m.id, 'btn-sm') + btn('Mark failed', 'markFailed', m.id, 'btn-sm');
    }
    return '<div class="mv ' + (dead ? 'dead' : '') + '"><div class="mv-row"><b><a href="' + mvHref(m) + '">' + esc(m.id) + '</a></b><span class="sub">' + (m.dir === 'out' ? 'outgoing' : 'incoming') + '</span>' + badge(m.status) + (m.exec ? '<span class="sub">' + esc(m.exec) + '</span>' : '') +
      (m.classification === 'unclassified' ? tag('Unclassified', 'red') : '') + '<span style="margin-left:auto" class="mono">' + esc(amtTxt(m.amount, m.asset)) + '</span></div><div class="sub" style="margin-top:2px">' +
      (m.dir === 'out' ? 'Venue ' + esc((VENUES.find(v => v.id === m.venueId) || {}).name) + ' to ' : 'Received from ') + esc(m.via || '-') + (m.ref ? ' · ref ' + esc(m.ref) : '') + (m.failure ? ' · <span style="color:var(--error-text)">' + esc(m.failure) + '</span>' : '') + '</div>' + (a ? '<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">' + a + '</div>' : '') + '</div>';
  }).join('') : '';
  return '<div class="ob ' + (ext ? 'ext' : '') + (over ? ' over' : '') + '"><div class="ob-head"><span class="ob-id">' + esc(o.id) + '</span><span>' + acctLabel(o.accountId) + '</span>' +
    '<span class="' + (o.dir === 'deliver' ? 'dir-d' : 'dir-r') + '">' + (o.dir === 'deliver' ? '▲ deliver' : '▼ receive') + '</span>' + (ext ? '<span class="tag gold">' + esc(cp.name) + ' · ' + cpTypeLabel(cp.type) + '</span>' : '<span class="sub">(internal)</span>') +
    badge(o.status, OB_LABELS) + (over ? tag('Overdue', 'red') : '') + (o.status === 'settled' && o.completedAt ? '<span class="sub">' + (o.completedAt > o.date ? 'due ' + esc(o.date) + ', settled ' + esc(o.completedAt) + ' (' + Math.round((new Date(o.completedAt) - new Date(o.date)) / 86400000) + ' days late)' : 'settled ' + esc(o.completedAt)) + '</span>' : '') + (o.waiting && isOp() ? tag('Waiting for funds', 'gold') : '') + (ext && cp.status === 'suspended' && !isFinalOb(o) && isOp() ? tag('Counterparty suspended', 'gold') : '') +
    '<div class="ob-amt"><span class="mono"><b>' + esc(fmtAmt(o.settled, o.asset)) + '</b> / ' + (o.amount == null ? '<span class="tag gold">amount not known yet</span>' : esc(fmtAmt(o.amount, o.asset))) + ' ' + esc(o.asset) + '</span>' +
    '<div class="bar ' + (o.status === 'settled' ? 'ok' : '') + '"><i style="width:' + pct + '%"></i></div></div></div>' + (mvHtml ? '<div style="padding-top:2px">' + mvHtml + '</div>' : '') + (actions ? '<div class="ob-actions">' + actions + '</div>' : '') + '</div>';
}
function progressHtml(si) {
  const vo = visibleObs(si);
  if (!vo.length) return '<div class="empty">No obligations are visible to you.</div>';
  const dates = [...new Set(vo.map(o => o.date))].sort();
  return dates.map(d => {
    const at = vo.filter(o => o.date === d).sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const st = at.every(isFinalOb) ? 'done' : at.some(o => o.status !== 'pending') ? 'cur' : 'up';
    return '<div class="band"><span class="chip ' + st + '">' + esc(d) + '</span><span class="sub">' + (st === 'done' ? 'all final' : st === 'cur' ? 'in progress' : 'upcoming') + (d === S.today ? ' · today' : '') + '</span><span class="band-line"></span></div>' + at.map(o => obCard(si, o)).join('');
  }).join('');
}
function legsHtml(si) {
  const legs = visibleLegs(si);
  const dates = [...new Set(legs.map(l => l.date))].sort();
  const rows = dates.map(d => '<tr class="date-row"><td colspan="6">Settles ' + esc(d) + '</td></tr>' + legs.filter(l => l.date === d).sort((a, b) => (a.seq || 0) - (b.seq || 0)).map(l => {
    const ext = l.from.type === 'cp' || l.to.type === 'cp';
    return '<tr class="click ' + (ext ? 'leg-ext' : '') + '" data-act="viewLeg" data-arg="' + si.id + '|' + l.id + '"><td>' + esc(l.id) + '</td><td>' + partyTag(l.from) + '</td><td>' + partyTag(l.to) + '</td><td>' + esc(l.assetId) + '</td><td>' + (l.fixed ? esc(fmtAmt(l.amount, l.assetId)) : '<span class="tag gold">not known yet</span>') + '</td><td>' + (ext ? '<span class="tag gold">leaves custody</span> ' : '') + (isOp() ? (l.posted ? tag('Posted', 'green') : '') : '') + (l.seq ? '[' + l.seq + ']' : '') + '</td></tr>';
  }).join('')).join('');
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Source</th><th>Destination</th><th>Asset</th><th>Amount</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
ACT.viewLeg = (el) => {
  const [sid, lid] = el.dataset.arg.split('|'); const si = siById(sid); const l = si.legs.find(x => x.id === lid);
  const det = l.detailId ? S.details.find(d => d.id === l.detailId) : null;
  openDrawer({ title: 'Transfer Leg ' + l.id, body: dl([['Source', partyTag(l.from)], ['Destination', partyTag(l.to)], ['Asset', esc(l.assetId)], ['Amount', l.fixed ? esc(amtTxt(l.amount, l.assetId)) : 'Unknown'], ['Settlement date', esc(l.date)], ['External reference', esc(l.extRef || '-')], ['Internal note', esc(l.remarks || '-')]].concat(isOp() && det ? [['Whitelist', esc(det.label + ' v' + det.version)]] : [])).replace('class="dl"', 'class="dl" style="grid-template-columns:1fr"') });
};
function approvalsHtml(si) {
  const rows = si.approvals.filter(a => isOp() || myAccts().includes(a.accountId));
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Status</th><th>By</th><th>At</th><th>Reason</th></tr></thead><tbody>' + rows.map(a => '<tr><td>' + acctLabel(a.accountId) + '</td><td>' + badge(a.status === 'awaiting_approval' ? 'pending' : a.status, { pending: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected' }) + (a.automatic ? ' ' + tag('Automatic', 'blue') : '') + '</td><td>' + (a.actionBy ? esc(userById(a.actionBy).name) : '-') + '</td><td>' + (a.actionAt ? dateCell(a.actionAt) : '-') + '</td><td>' + esc(a.reason || (a.automatic ? 'Approved because the submitter holds authority' : '-')) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="note" style="margin-top:8px">Counterparties have no approval row. The operator decision is separate: ' + (si.status === 'awaiting_client_approval' ? 'not yet requested' : si.status === 'under_review' ? 'awaiting the operator' : si.status === 'rejected' ? 'instruction rejected' : 'approved for settlement') + '.</div>';
}
function postingsHtml(si) {
  const mineNames = ACCOUNTS.filter(a => myAccts().includes(a.id)).map(a => a.name);
  const rows = S.posts.filter(p => p.siId === si.id && (isOp() || mineNames.includes(p.dr) || mineNames.includes(p.cr)));
  if (!rows.length) return '<div class="empty">No postings yet.</div>';
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Event</th><th>Debit</th><th>Credit</th><th>Amount</th><th>Settles</th><th>Value date</th></tr></thead><tbody>' + rows.map(p => '<tr><td>' + esc(p.id) + '</td><td>' + esc(p.event) + '</td><td><span class="dir-d">DR</span> ' + esc(p.dr) + '</td><td><span class="dir-r">CR</span> ' + esc(p.cr) + '</td><td class="mono">' + esc(amtTxt(p.amount, p.asset)) + '</td><td>' + esc(p.obIds.join(', ') || '-') + '</td><td>' + esc(p.valueDate) + '</td></tr>').join('') + '</tbody></table></div><div class="note" style="margin-top:8px">Postings are gross: one per leg, even when the obligations are netted.</div>';
}
function detailsHtml(si, cps) {
  return dl([['Settlement Instruction ID', esc(si.id)], ['Status', badge(si.status, siLabels())], ['Counterparties', esc((cps || []).join(', ') || 'None')], ['Settlement dates', esc((() => { const d = visibleLegs(si).map(l => l.date).sort(); return d.length ? (d[0] === d[d.length - 1] ? d[0] : d[0] + ' to ' + d[d.length - 1]) : '-'; })())], ['Purpose', esc((PURPOSES.find(p => p[0] === si.purpose) || [0, si.purpose])[1] + (si.purposeOther ? ': ' + si.purposeOther : ''))], ['External reference', esc(si.extRef)], ['Internal note', esc(si.note || '-')], ['Created via', esc(si.createdVia)], ['Created by', esc(userById(si.createdBy).name)], ['Created at', dateCell(si.createdAt)], ['Transacted at', si.transactedAt ? dateCell(si.transactedAt) : '-'], ['Reason', esc(si.reason || '-')]]);
}
function auditHtml(si) {
  const rows = S.audit.filter(a => a.siId === si.id && (isOp() || /settlement_instruction:(create|approve_account|reject|complete)/.test(a.event)));
  return rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>User</th><th>Detail</th><th>Time</th></tr></thead><tbody>' + rows.map(a => '<tr><td class="mono">' + esc(a.event) + '</td><td>' + esc(userById(a.userId).name) + '</td><td>' + esc(a.detail) + '</td><td>' + dateCell(a.time) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">No audit events.</div>';
}
function detailView(route, id) {
  const si = siById(id);
  if (!si || !siVisible(si)) return { title: 'Not found', crumbs: ['Dashboard', 'Transaction Management', 'Settlement Instructions'], buttons: '', html: '<div class="empty"><div class="big">Settlement instruction not found</div><a href="#/si">Back to list</a></div>' };
  const vo = visibleObs(si); const od = vo.filter(isOverdue).length;
  const waiting = isOp() ? si.obs.filter(o => o.waiting && !isFinalOb(o)).length : 0;
  const susp = isOp() ? si.obs.filter(o => o.cpId && cpOf(o.cpId).status === 'suspended' && !isFinalOb(o)).length : 0;
  const pend = si.approvals.filter(a => a.status === 'awaiting_approval' && (CUR.accounts || []).includes(a.accountId));
  const canClient = !isOp() && si.status === 'awaiting_client_approval' && pend.length && si.createdBy !== CUR.id && ['approver', 'individual'].includes(CUR.role);
  let buttons = '';
  if (canClient) buttons = btn('Reject', 'clientReject', si.id, 'btn-danger') + btn('Approve', 'clientApprove', si.id, 'btn-primary');
  if (isOp() && si.status === 'under_review') buttons = btn('Reject', 'rejectSI', si.id, 'btn-danger') + btn('Approve for settlement', 'approveSettle', si.id, 'btn-primary');
  if (isOp() && si.status === 'settling') buttons = anySettled(si) ? btn('Close out', 'closeOutSI', si.id, 'btn-danger') : btn('Reject', 'rejectSI', si.id, 'btn-danger');
  const settled = vo.filter(o => o.status === 'settled').length;
  const nextD = nextDate(vo);
  const hasMv = (o, st) => S.movs.some(m => m.links && m.links.some(l => l.obId === o.id) && st.includes(m.status));
  const failedMv = isOp() && si.status === 'settling' ? si.obs.filter(o => !isFinalOb(o) && hasMv(o, ['failed']) && !hasMv(o, ['pending', 'submitted'])).length : 0;
  const unclass = isOp() ? S.movs.filter(m => m.classification === 'unclassified' && m.status !== 'failed' && m.cpId && siCps(si).includes(m.cpId) && si.status === 'settling').length : 0;
  const attn = [];
  const open = si.obs.filter(o => !isFinalOb(o)).length;
  if (si.status === 'rejected') attn.push({ level: 'red', html: '<b>Rejected.</b> ' + esc(si.reason || '') });
  if (si.status === 'failed') attn.push({ level: 'red', html: '<b>Failed (closed out).</b> ' + esc(si.reason || '') + ' Obligations that had settled stand; the rest were cancelled.' });
  if (si.status === 'under_review' && isOp()) attn.push({ level: 'blue', html: '<b>Your decision:</b> approve for settlement, or reject. All accounts have approved.' });
  if (si.status === 'awaiting_client_approval') attn.push({ level: canClient ? 'amber' : 'grey', html: canClient ? '<b>Your approval is needed</b> for: ' + pend.map(a => esc(acctName(a.accountId))).join(', ') + '.' : '<b>Waiting for approval</b> from: ' + si.approvals.filter(a => a.status === 'awaiting_approval' && (isOp() || myAccts().includes(a.accountId))).map(a => esc(acctName(a.accountId))).join(', ') + '. <a data-act="setTab" data-arg="approvals">View approvals</a>' });
  if (od && !['rejected', 'failed'].includes(si.status)) attn.push({ level: 'red', html: '<b>' + od + ' obligation' + (od > 1 ? 's are' : ' is') + ' overdue.</b> <a data-act="setTab" data-arg="progress">View progress</a>' });
  if (failedMv && si.status === 'settling') attn.push({ level: 'red', html: '<b>' + failedMv + ' failed movement' + (failedMv > 1 ? 's' : '') + '.</b> Reissue from the obligation card. <a data-act="setTab" data-arg="progress">View progress</a>' });
  if (waiting) attn.push({ level: 'amber', html: '<b>' + waiting + ' obligation' + (waiting > 1 ? 's are' : ' is') + ' waiting for funds.</b> The delivering account does not hold the asset yet. <a data-act="setTab" data-arg="progress">View progress</a>' });
  if (susp) attn.push({ level: 'amber', html: '<b>A counterparty is suspended.</b> ' + susp + ' open obligation(s) are flagged. New movements are blocked.' });
  if (unclass) attn.push({ level: 'amber', html: '<b>' + unclass + ' unclassified arrival' + (unclass > 1 ? 's' : '') + '</b> from a counterparty of this instruction. <a href="#/exceptions">Open exceptions</a>' });
  const cps = siCps(si).map(c => cpOf(c).name);
  const facts = [
    ['Status', badge(si.status, siLabels())],
    ['Obligations settled', settled + ' of ' + vo.length + (nextD && !['rejected', 'failed', 'completed'].includes(si.status) ? ' <span class="ov-sub">(next: ' + esc(nextD) + ')</span>' : '')]
  ];
  const tab0 = curTab();
  const defs = [
    { key: 'progress', label: 'Progress (' + vo.length + ')', flag: od > 0 || failedMv > 0 },
    { key: 'legs', label: 'Legs (' + visibleLegs(si).length + ')' },
    { key: 'approvals', label: 'Approvals (' + si.approvals.filter(a => isOp() || myAccts().includes(a.accountId)).length + ')', flag: canClient },
    ].concat(isOp() ? [{ key: 'postings', label: 'Postings' }] : []).concat([{ key: 'other', label: 'Other Details' }, { key: 'audit', label: 'Audit log' }]);
  const tab = defs.some(d => d.key === tab0) ? tab0 : 'progress';
  const content = { progress: () => progressHtml(si), legs: () => legsHtml(si), approvals: () => approvalsHtml(si), postings: () => postingsHtml(si), other: () => detailsHtml(si, cps), audit: () => auditHtml(si) }[tab]();
  return { title: si.id, sub: esc(si.extRef) + ' ' + badge(si.status, siLabels()) + (si.legacy ? ' ' + tag('existing instruction') : ''), crumbs: ['Dashboard', 'Transaction Management', 'Settlement Instructions', si.id], buttons, html: overviewHtml(facts, attn) + tabsHtml(defs, tab) + '<div class="card"><div class="card-body">' + content + '</div></div>' };
}

/* ======================================================= ACTIONS */
ACT.approveSettle = (el) => done(approveForSettlement(CUR, siById(el.dataset.arg)), 'Approved for settlement', 'Positions now run in order on their settlement dates.');
ACT.rejectSI = (el) => {
  const si = siById(el.dataset.arg);
  reasonModal({ title: 'Reject ' + si.id, sub: 'Nothing has settled, so every reservation and expected balance will be released.', label: 'Reason', okText: 'Reject', danger: true, onOk: (r) => done(rejectSI(CUR, si, r), 'Instruction rejected', 'All earmarks and expected balances were released.') });
};
ACT.closeOutSI = (el) => {
  const si = siById(el.dataset.arg);
  const keep = si.obs.filter(o => o.settled > 0), drop = si.obs.filter(o => !isFinalOb(o));
  reasonModal({
    title: 'Close out ' + si.id, sub: 'Something has settled, so the instruction cannot be cancelled. Closing out ends what is left.', label: 'Reason', okText: 'Close out', danger: true,
    info: '<div class="alert warning"><b>Stays settled:</b> ' + (keep.map(o => esc(o.id + ' (' + amtTxt(o.settled, o.asset) + ')')).join(', ') || 'none') + '<br><b>Will be cancelled and released:</b> ' + (drop.map(o => esc(o.id)).join(', ') || 'none') + '<br>Recovering assets already delivered is a separate claim, not part of this instruction.</div>',
    onOk: (r) => done(closeOut(CUR, si, r), 'Instruction closed out', 'Status is now Failed. Reservations were released.')
  });
};
ACT.clientApprove = (el) => {
  const si = siById(el.dataset.arg); const pend = si.approvals.filter(a => a.status === 'awaiting_approval' && (CUR.accounts || []).includes(a.accountId));
  openModal({
    title: 'Approve ' + si.id, sub: 'You are approving for the accounts you select. You can approve some or all.',
    body: '<div class="form-item"><label>You are approving for</label>' + pend.map(a => '<label style="display:block;margin:4px 0"><input type="checkbox" class="apx" value="' + a.accountId + '" checked> ' + esc(acctName(a.accountId)) + ' <span class="sub">' + esc(acct(a.accountId).number) + '</span></label>').join('') + '</div>' +
      '<div class="form-item"><label>Reason <span class="opt">(Optional)</span></label><textarea class="textarea" id="ap-r"></textarea></div><div class="form-item"><label><span class="req">*</span>MFA code</label><input class="input" id="ap-mfa" placeholder="Use ' + MFA_CODE + ' in this prototype"></div><div class="help" id="ap-err"></div>',
    okText: 'Approve',
    onOk(m) {
      const ids = [...m.querySelectorAll('.apx')].filter(x => x.checked).map(x => x.value);
      const res = approveAccounts(CUR, si, ids, m.querySelector('#ap-r').value, m.querySelector('#ap-mfa').value);
      if (!res.ok) { m.querySelector('#ap-err').textContent = res.code + ': ' + res.message + (res.problems ? ' Nothing was earmarked.' : ''); return false; }
      toast({ title: 'Approved', desc: si.status === 'under_review' ? 'Every account has approved. Awaiting the operator.' : 'Earmarks were placed for your accounts.' }); rerender();
    }
  });
};
ACT.clientReject = (el) => {
  const si = siById(el.dataset.arg);
  openModal({
    title: 'Reject ' + si.id, sub: 'All earmarks and expected balances already placed will be reversed.',
    body: '<div class="form-item"><label><span class="req">*</span>Reason</label><textarea class="textarea" id="rj-r"></textarea></div><div class="form-item"><label><span class="req">*</span>MFA code</label><input class="input" id="rj-mfa" placeholder="Use ' + MFA_CODE + ' in this prototype"></div><div class="help" id="rj-err"></div>',
    okText: 'Reject', okDanger: true,
    onOk(m) { const res = rejectByClient(CUR, si, m.querySelector('#rj-r').value, m.querySelector('#rj-mfa').value); if (!res.ok) { m.querySelector('#rj-err').textContent = res.code + ': ' + res.message; return false; } toast({ title: 'Instruction rejected' }); rerender(); }
  });
};
ACT.createMv = (el) => {
  const f = findOb(el.dataset.arg); const o = f.o; const dets = detailsFor(o.cpId, o.asset); const venues = VENUES.filter(v => v.assets.includes(o.asset));
  openModal({
    title: 'Create outgoing movement', sub: 'Pays ' + cpOf(o.cpId).name + '. The movement snapshots the whitelist you choose.',
    body: dl([['Obligation', esc(o.id)], ['Amount to send', esc(amtTxt(undischarged(o), o.asset))]]).replace('class="dl"', 'class="dl" style="grid-template-columns:1fr"') +
      formItem('Source venue', selectHtml('mv-venue', '', venues.map(v => [v.id, v.name + ' (available ' + fmtAmt(r8(VB(v.id, o.asset).total - VB(v.id, o.asset).reserved), o.asset) + ')']), { placeholder: 'Select source venue' }), { required: true }) +
      formItem('Counterparty whitelist', selectHtml('mv-det', dets.length === 1 ? dets[0].id : '', dets.map(d => [d.id, d.label + ' v' + d.version + ' · ' + d.ref]), { placeholder: 'Select' }), { required: true, hint: dets.length > 1 ? 'More than one approved detail exists.' : 'Only one approved detail exists.' }) + '<div class="help" id="mv-err"></div>',
    okText: 'Create movement',
    onOk(m) { const res = createMovement(CUR, o.id, m.querySelector('#mv-venue').value, m.querySelector('#mv-det').value); if (!res.ok) { m.querySelector('#mv-err').textContent = res.code + ': ' + res.message; return false; } toast({ title: 'Movement created', desc: res.mv.id + ' is pending. The source venue is earmarked.' }); rerender(); }
  });
};
ACT.submitMv = (el) => done(submitMovement(CUR, mvById(el.dataset.arg)), 'Movement submitted', 'The venue now processes it.');
ACT.confirmMv = (el) => {
  const mv = mvById(el.dataset.arg);
  openModal({
    title: 'Simulate bank confirmation', sub: 'In the product the bank or chain reports this. Enter a smaller amount to simulate a partial settlement.',
    body: formItem('Amount settled', '<input class="input" id="cf-amt" type="number" step="any" value="' + mv.amount + '">', { required: true, hint: 'Sent: ' + amtTxt(mv.amount, mv.asset) }) + '<div class="help" id="cf-err"></div>', okText: 'Confirm',
    onOk(m) { const res = confirmMovement(CUR, mv, m.querySelector('#cf-amt').value); if (!res.ok) { m.querySelector('#cf-err').textContent = res.code + ': ' + res.message; return false; } toast({ title: 'Movement confirmed', desc: 'The ledger entry was posted and the earmark restated.' }); rerender(); }
  });
};
ACT.bankReject = (el) => done(failMovement(CUR, mvById(el.dataset.arg), 'Bank rejected the payment (beneficiary name mismatch)'), 'Movement failed', 'The obligation is unchanged and the earmark did not move. You can reissue.');
ACT.markFailed = (el) => {
  const mv = mvById(el.dataset.arg);
  reasonModal({ title: 'Mark ' + mv.id + ' as failed', sub: 'Needs a second operator (maker-checker). The venue earmark is released only when it is approved.', label: 'Internal comment', okText: 'Submit for approval', danger: true, onOk: (r) => { const q = newRequest('fail_movement', CUR, { movId: mv.id, reason: 'Marked failed: ' + r }, r); toast({ title: 'Request submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + q.id) } }); rerender(); } });
};
ACT.simArrival = (el) => {
  const f = findOb(el.dataset.arg); const o = f.o; const dets = detailsFor(o.cpId, o.asset);
  openModal({
    title: 'Simulate arrival', sub: 'Simulates the bank credit or chain transfer from ' + cpOf(o.cpId).name + '.',
    body: formItem('Sender', '<select class="select" id="ar-send">' + dets.map(d => '<option value="' + d.id + '">' + esc(d.label + ' v' + d.version) + ' (matches this counterparty)</option>').join('') + '<option value="">Unknown sender (does not match)</option></select>', { required: true }) +
      formItem('Amount', '<input class="input" id="ar-amt" type="number" step="any" value="' + (o.fixed ? undischarged(o) : '') + '">', { required: true, hint: o.fixed ? 'Undischarged: ' + amtTxt(undischarged(o), o.asset) + '. Smaller amounts are tranches. Above the tolerance the excess becomes unclassified.' : 'The amount is not fixed, so the arrival cannot auto-match. It stays unclassified.' }) + '<div class="help" id="ar-err"></div>', okText: 'Simulate arrival',
    onOk(m) {
      const d = m.querySelector('#ar-send').value;
      const res = receiveArrival(CUR, d ? null : o.cpId, d || null, o.asset, m.querySelector('#ar-amt').value);
      if (!res.ok) { m.querySelector('#ar-err').textContent = res.code + ': ' + res.message; return false; }
      toast({ title: res.matched ? 'Arrival matched and settled' : 'Arrival is unclassified', desc: res.matched ? res.mv.id + ' was linked to ' + o.id + (res.excess ? '. The excess ' + amtTxt(res.excess.amount, o.asset) + ' is unclassified.' : '.') : res.mv.id + ' needs classification (see Exceptions).' }); rerender();
    }
  });
};
ACT.setAmt = (el) => {
  const o = findOb(el.dataset.arg).o;
  openModal({ title: 'Set the amount', sub: 'The obligation becomes fixed and the expected balance is posted. The instruction does not return for approval.', body: formItem('Amount', '<input class="input" id="sa-amt" type="number" step="any">', { required: true }) + '<div class="help" id="sa-err"></div>', okText: 'Set amount',
    onOk(m) { const res = setObAmount(CUR, o.id, m.querySelector('#sa-amt').value); if (!res.ok) { m.querySelector('#sa-err').textContent = res.code + ': ' + res.message; return false; } toast({ title: 'Amount set', desc: 'Expected balance posted. Tolerance matching now applies.' }); rerender(); } });
};
ACT.classify = (el) => openClassifyModal(mvById(el.dataset.arg));

/* ======================================================= EXCEPTIONS (FR-18) */
let EXT = 'overdue';
ACT.exTab = (el) => { EXT = el.dataset.arg; rerender(); };
function exceptionsView() {
  const e = exceptions();
  const tabs = [['overdue', 'Overdue', e.overdue.length], ['failed', 'Failed movements', e.failed.length], ['unclass', 'Unclassified arrivals', e.unclass.length], ['waiting', 'Waiting for funds', e.waiting.length], ['suspended', 'Counterparty suspended', e.suspended.length]];
  const seg = '<div class="sec-bar"><div class="seg">' + tabs.map(t => '<button class="seg-b' + (EXT === t[0] ? ' active' : '') + '" data-act="exTab" data-arg="' + t[0] + '">' + t[1] + ' (' + t[2] + ')</button>').join('') + '</div></div>';
  const tbl = (head, rows) => rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '<div class="tbl-wrap"><div class="empty"><div class="big">Nothing here</div></div></div>';
  const link = (si) => '<a href="#/si/' + si.id + '">' + esc(si.id) + '</a>';
  let body = '';
  if (EXT === 'overdue') body = tbl(['Settlement instruction', 'Account', 'Counterparty', 'Direction', 'Amount', 'Due', 'Days overdue'], e.overdue.map(x => '<tr class="overdue"><td>' + link(x.si) + '</td><td>' + acctLabel(x.o.accountId) + '</td><td>' + esc(x.o.cpId ? cpOf(x.o.cpId).name : '(internal)') + '</td><td>' + esc(x.o.dir) + '</td><td>' + esc(amtTxt(x.o.amount, x.o.asset)) + '</td><td>' + esc(x.o.date) + '</td><td>' + Math.round((new Date(S.today) - new Date(x.o.date)) / 86400000) + '</td></tr>'));
  if (EXT === 'failed') body = tbl(['Movement', 'Settlement instruction', 'Counterparty', 'Amount', 'Failure reason', 'Failed at', ''], e.failed.map(x => '<tr><td>' + esc(x.mv.id) + '</td><td>' + link(x.si) + '</td><td>' + esc(cpOf(x.o.cpId).name) + '</td><td>' + esc(amtTxt(x.mv.amount, x.mv.asset)) + '</td><td>' + esc(x.mv.failure || '') + '</td><td>' + esc(x.mv.failedAt || '-') + '</td><td><a href="#/si/' + x.si.id + '">Open to reissue</a></td></tr>'));
  if (EXT === 'unclass') body = tbl(['Movement', 'Counterparty (matched)', 'Amount', 'Received from', 'Received at', ''], e.unclass.map(x => '<tr class="overdue"><td>' + esc(x.mv.id) + '</td><td>' + esc(x.mv.cpId ? cpOf(x.mv.cpId).name : 'None') + '</td><td>' + esc(amtTxt(x.mv.amount, x.mv.asset)) + '</td><td>' + esc(x.mv.via) + '</td><td>' + esc(x.mv.at) + '</td><td><button class="btn btn-link" data-act="classify" data-arg="' + x.mv.id + '">Classify</button></td></tr>'));
  if (EXT === 'waiting') body = tbl(['Settlement instruction', 'Account', 'Asset', 'Shortfall'], e.waiting.map(x => '<tr><td>' + link(x.si) + '</td><td>' + acctLabel(x.o.accountId) + '</td><td>' + esc(x.o.asset) + '</td><td class="mono">' + esc(fmtAmt(Math.max(0, r8(x.o.amount - B(x.o.accountId, x.o.asset).total)), x.o.asset)) + '</td></tr>'));
  if (EXT === 'suspended') body = tbl(['Settlement instruction', 'Counterparty', 'Direction', 'Amount'], e.suspended.map(x => '<tr><td>' + link(x.si) + '</td><td>' + esc(cpOf(x.o.cpId).name) + ' <span class="tag gold">suspended</span></td><td>' + esc(x.o.dir) + '</td><td>' + esc(amtTxt(x.o.amount, x.o.asset)) + '</td></tr>'));
  return { title: 'Settlement Instructions', crumbs: ['Dashboard', 'Transaction Management', 'Settlement Instructions', 'Exceptions'], buttons: '', html: opTabs('ex') + seg + body };
}

/* ======================================================= MAKER-CHECKER */
let RQF = '';
ACT.rqFilter = (el) => { RQF = el.value; rerender(); };
function reqTitle(r) {
  if (r.type === 'si_create') return 'Create settlement instruction';
  if (r.type === 'book_movement') return r.payload.dir === 'out' ? 'Book outgoing movement' : 'Book incoming movement';
  if (r.type === 'fail_movement') return 'Mark outgoing movement as failed';
  return r.payload.classification && r.payload.classification !== 'settlement' ? (mvById(r.payload.movId) && mvById(r.payload.movId).dir === 'out' ? 'Classify outgoing movement' : 'Classify incoming movement') : 'Classify arrival as settlement';
}
function requestsView() {
  const rows = S.reqs.filter(r => !RQF || r.status === RQF);
  const filters = '<div class="filters"><div class="f">' + selectHtml('rq', RQF, [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']], { placeholder: 'Status' }).replace('data-f="rq"', 'data-act-change="rqFilter"') + '</div></div>';
  const body = rows.length ? rows.map(r => '<tr class="click" data-href="#/approvals/' + r.id + '"><td>' + esc(reqTitle(r)) + '<div class="sub">' + esc(r.id) + '</div></td><td>' + esc(r.type === 'si_create' ? r.payload.fields.extRef : r.payload.movId) + '</td><td>' + esc(userById(r.makerId).name) + '</td><td>' + dateCell(r.createdAt) + '</td><td>' + badge(r.status) + '</td></tr>').join('') : '<tr><td colspan="5"><div class="empty">No requests.</div></td></tr>';
  return { title: 'Maker Checker', crumbs: ['Dashboard', 'Approval', 'Maker Checker'], buttons: '', html: filters + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Subject</th><th>Maker</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' + body + '</tbody></table></div>' };
}
function requestDetailView(id) {
  const r = S.reqs.find(x => x.id === id);
  if (!r) return { title: 'Not found', crumbs: ['Dashboard', 'Approval', 'Maker Checker'], buttons: '', html: '<div class="empty">Request not found. <a href="#/approvals">Back</a></div>' };
  const mine = r.makerId === CUR.id; const canDecide = r.status === 'pending' && !mine;
  let html = '';
  if (r.status === 'pending' && mine) html += '<div class="alert info">You submitted this request. A different operator must decide it.</div>';
  if (r.status === 'approved') html += '<div class="alert success">Approved by ' + esc(userById(r.decidedBy).name) + '.' + (r.siId ? ' <a href="#/si/' + r.siId + '">Open ' + esc(r.siId) + '</a>' : '') + (r.movId ? ' <a href="#/movement-management/' + (r.payload.dir === 'in' ? 'incoming' : 'outgoing') + '-movement/' + r.movId + '">Open ' + esc(r.movId) + '</a>' : '') + '</div>';
  if (r.status === 'rejected') html += '<div class="alert error">Rejected by ' + esc(userById(r.decidedBy).name) + '. Reason: ' + esc(r.reason || '') + '</div>';
  html += '<div class="card"><div class="card-head">Request</div><div class="card-body">' + dl([['Request ID', esc(r.id)], ['Status', badge(r.status)], ['Type', esc(reqTitle(r))], ['Maker', esc(userById(r.makerId).name)], ['Submitted', dateCell(r.createdAt)], ['Maker comment', esc(r.comment || '-')]]) + '</div></div>';
  if (r.type === 'si_create') {
    const f = r.payload.fields; const ds = [...new Set(r.payload.legs.map(l => l.date))].sort();
    html += '<div class="card"><div class="card-head">Proposed instruction</div><div class="card-body">' + dl([['External reference', esc(f.extRef)], ['Purpose', esc(f.purpose)], ['Internal note', esc(f.note || '-')]]) + '<div style="margin-top:12px" class="tbl-wrap"><table class="tbl"><thead><tr><th>Source</th><th>Destination</th><th>Amount</th></tr></thead><tbody>' + ds.map(d => '<tr class="date-row"><td colspan="4">Settles ' + esc(d) + '</td></tr>' + r.payload.legs.filter(l => l.date === d).map(l => '<tr class="' + (l.from.type === 'cp' || l.to.type === 'cp' ? 'leg-ext' : '') + '"><td>' + esc(partyName(l.from)) + '</td><td>' + esc(partyName(l.to)) + '</td><td>' + esc(l.fixed ? amtTxt(l.amount, l.assetId) : l.assetId + ' (unknown)') + '</td></tr>').join('')).join('') + '</tbody></table></div><div class="note" style="margin-top:8px">On approval the funding check runs for every account. If it fails, the request stays awaiting approval.</div></div></div>';
  } else if (r.type !== 'classify' || r.payload.classification) {
    html += requestExtraHtml(r);
  } else {
    const mv = mvById(r.payload.movId); const f = findOb(r.payload.obId);
    html += '<div class="card"><div class="card-head">Proposed classification</div><div class="card-body">' + dl([['Arrival', esc(mv ? mv.id + ' · ' + amtTxt(mv.amount, mv.asset) + ' from ' + mv.via : '-')], ['Link to obligation', esc(f ? f.si.id + ' · ' + f.o.id + ' · ' + acctName(f.o.accountId) : '-')]]) + '</div></div>';
  }
  return { title: reqTitle(r), sub: badge(r.status), crumbs: ['Dashboard', 'Approval', 'Maker Checker', r.id], buttons: canDecide ? btn('Reject', 'rejectReq', r.id, 'btn-danger') + btn('Approve', 'approveReq', r.id, 'btn-primary') : '', html };
}
ACT.approveReq = (el) => { const r = S.reqs.find(x => x.id === el.dataset.arg); const res = approveRequest(CUR, r); if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return; } toast({ title: 'Request approved', desc: r.siId ? r.siId + ' was created and earmarks were placed.' : r.type === 'book_movement' ? 'The movement was booked as Unclassified.' : r.type === 'classify' && r.payload.classification && r.payload.classification !== 'settlement' ? 'The classification was applied.' : r.type === 'fail_movement' ? 'The movement was marked as failed.' : 'The arrival was linked.' }); rerender(); };
ACT.rejectReq = (el) => { const r = S.reqs.find(x => x.id === el.dataset.arg); reasonModal({ title: 'Reject request', label: 'Reason', okText: 'Reject', danger: true, onOk: (reason) => done(rejectRequest(CUR, r, reason), 'Request rejected') }); };

/* ======================================================= BALANCES */
function balancesView() {
  const accs = ACCOUNTS.filter(a => myAccts().includes(a.id));
  const rows = accs.flatMap(a => Object.keys(S.bal[a.id] || {}).map(asset => ({ a, asset, b: S.bal[a.id][asset] })));
  const body = rows.map(({ a, asset, b }) => {
    const av = r8(b.total - b.reserved);
    return '<tr><td>' + acctLabel(a.id) + (a.mayOverCommit && av < 0 ? ' <span class="tag red">Over-committed</span>' : '') + '</td><td>' + asset + '</td><td class="mono">' + fmtAmt(b.total, asset) + '</td><td class="mono ' + (av < 0 ? 'dir-d' : '') + '">' + fmtAmt(av, asset) + '</td><td class="mono">' + fmtAmt(b.reserved, asset) + '</td><td class="mono">' + fmtAmt(b.expected, asset) + '</td></tr>';
  }).join('');
  let extra = '';
  if (isOp()) {
    extra = '<h3 style="margin:24px 0 8px">Venues</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Venue</th><th>Type</th><th>Asset</th><th>Total</th><th>Available</th><th>Reserved</th></tr></thead><tbody>' + Object.keys(S.vbal).map(k => { const [v, as] = k.split('|'); const b = S.vbal[k]; return '<tr><td>' + esc(VENUES.find(x => x.id === v).name) + '</td><td>' + esc(VKIND[VENUES.find(x => x.id === v).kind] || '') + '</td><td>' + as + '</td><td class="mono">' + fmtAmt(b.total, as) + '</td><td class="mono">' + fmtAmt(r8(b.total - b.reserved), as) + '</td><td class="mono">' + fmtAmt(b.reserved, as) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h3 style="margin:24px 0 8px">Deposit Suspense</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Held (unclassified arrivals)</th></tr></thead><tbody>' + (Object.keys(S.suspense).filter(k => S.suspense[k]).map(k => '<tr><td>' + k + '</td><td class="mono">' + fmtAmt(S.suspense[k], k) + '</td></tr>').join('') || '<tr><td colspan="2"><div class="empty">Empty</div></td></tr>') + '</tbody></table></div>' +
      '<h3 style="margin:24px 0 8px">Suspense (paid out)</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Paid out, not yet classified</th><th>Oldest unclassified</th></tr></thead><tbody>' + (Object.keys(S.suspenseOut || {}).filter(k => S.suspenseOut[k]).map(k => { const old = S.movs.filter(x => x.dir === 'out' && x.classification === 'unclassified' && x.asset === k && x.source === 'manual').map(x => x.at).sort()[0]; const days = old ? Math.max(0, Math.round((new Date(S.today) - new Date(old)) / 864e5)) : 0; return '<tr><td>' + k + '</td><td class="mono">' + fmtAmt(S.suspenseOut[k], k) + '</td><td>' + (old ? days + ' day' + (days === 1 ? '' : 's') + (days > 7 ? ' <span class="tag red">Over 7 days</span>' : '') : '-') + '</td></tr>'; }).join('') || '<tr><td colspan="3"><div class="empty">Empty</div></td></tr>') + '</tbody></table></div>';
  }
  return { title: 'Account Balances', crumbs: ['Dashboard', 'Balances'], buttons: '', html: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Asset</th><th>Total</th><th>Available</th><th>Reserved (earmarked)</th><th>Expected</th></tr></thead><tbody>' + body + '</tbody></table></div><div class="note" style="margin-top:8px">Available = total minus reserved. Expected is display only and cannot be spent. A house account may be over-committed (reserved above total), but no total can go negative.</div>' + extra + balancesMore() };
}

/* ======================================================= DEMO CONTROLS */
ACT.adv = (el) => { advanceDay(+el.dataset.arg); toast({ title: 'Date advanced', desc: 'Simulated date is now ' + S.today + '. Eligible positions ran.' }); rerender(); };
function demoView() {
  return {
    title: 'Demo Controls', crumbs: ['Dashboard', 'Demo controls'], buttons: '',
    html: '<div class="card"><div class="card-head">Simulated date</div><div class="card-body"><p>Today in the demo is <b>' + S.today + '</b>. Positions run on their settlement date.</p>' + btn('Advance 1 day', 'adv', 1, 'btn-primary') + ' ' + btn('Advance 3 days', 'adv', 3, '') + '</div></div>' +
      '<div class="card"><div class="card-head">Counterparties</div><div class="card-body">Counterparties, their whitelists and suspend / close now live in <a href="#/counterparties">Counterparty Management</a> and <a href="#/whitelists/bank-accounts">Whitelist Management</a>. Suspend a counterparty there and the flags appear on the instructions here.</div></div>' +
      '<div class="card"><div class="card-head">What to try</div><div class="card-body"><ol style="margin:0;padding-left:18px;line-height:1.9">' +
      '<li><b>Overdue and close-out:</b> as Alice, open the Crestline Fund subscription (SI-1001). The UNIT delivery is overdue. Close it out.</li>' +
      '<li><b>Principal buy:</b> advance 2 days. Open SI-1003 (sourcing): select a venue, create the movement, submit, simulate the bank confirmation. Then on the BTC receive card, simulate arrivals of 0.1 and 0.15 BTC and watch SI-1002 deliver to the client.</li>' +
      '<li><b>Client approval:</b> as Ava, approve SI-1004 for Acme (MFA ' + MFA_CODE + '). Then as Ian approve for Zenith. Then as Alice, approve for settlement.</li>' +
      '<li><b>Funding check:</b> as Sam, create an instruction that pays more than an account holds, or pays before it is paid. Watch the preview flag the date.</li>' +
      '<li><b>Maker-checker:</b> as Alice create an instruction; as Bob approve it under Maker Checker.</li>' +
      '<li><b>Existing instruction:</b> SI-1005 is a single-date internal instruction. Approve for settlement and it completes in one step.</li>' +
      '<li><b>Failure and retry:</b> create a payment to Meridian Capital Markets, submit, simulate bank rejection, then reissue.</li>' +
      '<li><b>Counterparty with history:</b> open Crestline Opportunities Fund SPC. It is active and has one completed instruction (SUB-CF-0301) and one ongoing instruction (SUB-FB-0412), with outgoing and incoming movements for both. Check its Transactions tab.</li><li><b>Suspend a counterparty</b> from Counterparty Management and watch the flags and blocked movements here.</li><li><b>Book a bank charge (two steps):</b> as Alice open Movement Management > Outgoing Movement > Fiat > Book Outgoing Movement and enter the venue, amount and bank reference. As Bob approve it under Approvals. It now shows as Unclassified and the amount sits in Suspense (paid out) under Balances. As Alice press Classify, choose Venue charges, Bank charge and Borne by the custodian (or an account to charge a client), and as Bob approve it. The amount leaves Suspense for custodian expense or the client account and, for a client, a statement line.</li><li><b>Classify an arrival:</b> open the unclassified token arrival under Incoming Movement and classify it as Airdrop or Interest (account optional) or as Unknown funds (held in Suspense), then book a refund and classify it as Refund.</li><li><b>Mark as failed:</b> on a pending settlement movement it now needs a second operator.</li></ol></div></div>'
  };
}

/* Add New settlement instruction: template start step, then a read-only legs table with an Add / Edit Transfer Leg modal (as in the repo). */

const mkRow = (type, over) => {
  const l = { type, from: { type: 'account', id: '' }, to: { type: 'account', id: '' }, assetId: '', amount: null, fixed: true, indicative: null, date: S.today, seq: 0, detailId: '', extRef: '', remarks: '', manual: '', _raw: null };
  if (type === 'send_ext') l.to = { type: 'cp', id: '' };
  if (type === 'recv_ext') l.from = { type: 'cp', id: '' };
  return Object.assign(l, over || {});
};
const myFirst = () => (isOp() ? '' : (CUR.accounts || [])[0] || '');
const TEMPLATES = () => {
  const acc = myFirst();
  const list = [
    { id: 'blank', name: 'Blank', desc: 'Start with an empty list and add each leg yourself.', purpose: '', rows: () => [] },
    { id: 'transfer', name: 'Transfer between accounts', desc: 'One internal transfer that settles today.', purpose: 'transfer', rows: () => [mkRow('internal', { from: { type: 'account', id: acc } })] },
    { id: 'subscription', name: 'Subscription to a fund', desc: 'Cash goes out to the fund today. Units come back two days later.' + (isOp() ? ' Plus a fee leg.' : ''), purpose: 'subscription', rows: () => [
      mkRow('send_ext', { assetId: 'USD', seq: 1, from: { type: 'account', id: acc } }),
      mkRow('recv_ext', { assetId: 'UNIT', date: addDays(S.today, 2), fixed: !isOp(), to: { type: 'account', id: acc } })
    ].concat(isOp() ? [mkRow('internal', { assetId: 'SGD', to: { type: 'account', id: 'a5' } })] : []) }
  ];
  if (isOp()) {
    list.push({ id: 'sourcing', name: 'Buy from a broker (house)', desc: 'The house pays a broker cash today and receives the asset two days later.', purpose: 'trade', rows: () => [
      mkRow('send_ext', { assetId: 'SGD', seq: 1, from: { type: 'account', id: 'a4' } }),
      mkRow('recv_ext', { assetId: 'BTC', date: addDays(S.today, 2), to: { type: 'account', id: 'a4' } })
    ] });
    list.push({ id: 'principal', name: 'Client buys from us', desc: 'The client pays the house cash, then the house delivers the asset two days later.', purpose: 'trade', rows: () => [
      mkRow('internal', { assetId: 'SGD', seq: 1, to: { type: 'account', id: 'a4' } }),
      mkRow('internal', { assetId: 'BTC', date: addDays(S.today, 2), from: { type: 'account', id: 'a4' } })
    ] });
  }
  return list;
};

const hasCp = (l) => l.from.type === 'cp' || l.to.type === 'cp';
function rowErr(l) {
  const e = {};
  const t = l.type;
  const manualSide = t === 'send' ? 'to' : t === 'recv' ? 'from' : null;
  ['from', 'to'].forEach(side => {
    const p = l[side];
    if (!p.id) e[side] = (manualSide === side ? (l.manual ? 'Invalid account ID' : 'Required') : (l._raw && l._raw[side] ? 'Could not match "' + l._raw[side] + '"' : 'Required'));
  });
  if (!e.from && !e.to && l.from.type === 'account' && l.to.type === 'account' && l.from.id === l.to.id) e.to = 'From and To must differ';
  if (!l.assetId) e.asset = 'Required';
  ['from', 'to'].forEach(side => {
    const p = l[side]; if (p.type !== 'cp' || !p.id || e[side]) return;
    const cp = cpOf(p.id);
    if (!cp || cp.status !== 'active') { e[side] = 'Counterparty is not active'; return; }
    if (l.assetId) {
      const dets = detailsFor(cp.id, l.assetId);
      if (!dets.length) e[side] = 'No approved whitelist for ' + l.assetId;
      else if (dets.length > 1 && !l.detailId) e.detail = 'Choose a whitelist';
    }
  });
  if (l.fixed && !(l.amount > 0)) e.amount = 'Must be above 0';
  else if (l.fixed && l.assetId && !amountOk(l.amount, l.assetId)) e.amount = 'Too many decimals for ' + l.assetId;
  if (!l.date) e.date = 'Required'; else if (l.date < S.today) e.date = 'Cannot be before today';
  return e;
}
const legNeedsFix = (l) => Object.keys(rowErr(l)).length > 0;
function draftLegs() {
  return CR.legs.filter(l => !legNeedsFix(l)).map(l => ({ from: l.from, to: l.to, assetId: l.assetId, amount: l.fixed ? l.amount : null, fixed: l.fixed, indicative: l.fixed ? null : l.amount, date: l.date, seq: l.seq || 0, detailId: l.detailId, extRef: l.extRef, remarks: l.remarks }));
}

function fundChip() {
  const dl2 = draftLegs(); if (!dl2.length) return '';
  const pv = previewFor(CUR, dl2);
  const items = pv.rows.map(r => pvSummary(r, pv.problems)).filter(x => x.level === 'bad').length;
  return items ? '<a class="chip-bad" data-act="gotoPreview">⚠ ' + items + (items > 1 ? ' accounts are' : ' account is') + ' short. See funding check</a>' : '<span class="chip-ok">✓ Funding OK</span>';
}
function startHtml() {
  return '<div class="card"><div class="card-head">How do you want to start?</div><div class="card-body"><div class="tpl-grid">' + TEMPLATES().map(t => '<button class="tpl" data-act="startTpl" data-arg="' + t.id + '"><b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span></button>').join('') + '</div>' +
    '<div class="sub" style="margin-top:12px">A template only fills in the legs, dates and order. A window then opens for each leg so you choose the accounts, counterparty and amounts, and you can change anything.</div></div></div>';
}
function createFormHtml() {
  if (!CR.started && !CR.legs.length) return startHtml() + '<div class="form-actions" style="margin-top:16px">' + btn('Exit', 'exitCreate', null, '') + '</div>';
  const e = CR.errors;
  const errBox = e.length ? '<div class="alert error"><ul class="errlist">' + e.map(x => '<li><b>' + esc(x.code) + '</b> ' + esc(x.message) + '</li>').join('') + '</ul></div>' : '';
  const fe = (k) => (e.find(x => x.leg === -1 && x.field === k) || {}).message || '';
  const bad = CR.legs.filter(legNeedsFix).length;
  const banner = CR.submitted && bad ? '<div class="alert error" id="grid-banner"><div><b>' + bad + ' leg' + (bad > 1 ? 's need' : ' needs') + ' attention.</b> Click Edit on a flagged leg to complete it.</div></div>' : '';
;
  const legsCard = '<div class="card"><div class="card-head"><span class="ch-title"><b>Transfer Legs (' + CR.legs.length + ')</b><span class="ch-desc">Add each transfer between accounts or with an outside party.</span></span><button class="btn btn-link" data-act="restartTpl">Start from a template</button></div><div class="card-body" id="legs-area">' +
    '<div class="grid-tools">' + (CR.legs.length ? '<button class="btn btn-primary" data-act="addLeg">+ Add Transfer Leg</button>' : '') + '<button class="btn" data-act="pasteRows">Paste from spreadsheet</button></div>' + legsTableHtml() + '</div></div>';
  const detailsCard = '<div class="card"><div class="card-head"><span class="ch-title"><b>Settlement Instruction Details</b><span class="ch-desc">Enter the purpose and references for this instruction.</span></span></div><div class="card-body">' +
    '<div class="row2">' + formItem('Transaction Purpose', selectHtml('purpose', CR.purpose, PURPOSES, { placeholder: 'Select transaction purpose' }), { id: 'purpose', required: true, error: fe('purpose') }) +
    formItem('External Reference', inputHtml('extRef', CR.extRef, { placeholder: 'External Reference' }), { id: 'extRef', required: true, error: fe('extRef') }) + '</div>' +
    (CR.purpose === 'others' ? formItem('Please specify', inputHtml('purposeOther', CR.purposeOther, { placeholder: 'Please specify the transaction purpose' }), { id: 'purposeOther', error: fe('purposeOther') }) : '') +
    formItem('Internal Note', textareaHtml('note', CR.note, { placeholder: 'Enter Internal Note' }), { id: 'note', optional: true }) +
    '</div></div>';
  return errBox + '<div class="si-stack">' + banner + detailsCard + legsCard + '<div id="preview-area"></div>' +
    '<div class="form-actions" style="margin-top:0">' + btn('Exit', 'exitCreate', null, '') + btn('Submit', 'submitCreate', null, 'btn-primary') + '</div></div>';
}
function createView() {
  if (!CR) CR = newCR();
  return {
    title: 'Add New Settlement Instruction', crumbs: ['Dashboard', 'Transaction Management', 'Settlement Instructions', 'Add'], buttons: '', html: createFormHtml(),
    bind(root) { bindForm(root, CR, (f) => { if (f === 'purpose') rerender(); }); }
  };
}

ACT.startTpl = (el) => {
  const t = TEMPLATES().find(x => x.id === el.dataset.arg);
  CR.legs = t.rows(); CR.started = true; if (t.purpose && !CR.purpose) CR.purpose = t.purpose; CR.submitted = false; CR.errors = []; rerender();
  setTimeout(() => openLegModal(CR.legs.length ? 0 : -1), 80);
};
ACT.restartTpl = () => {
  const go2 = () => { CR.legs = []; CR.started = false; CR.submitted = false; CR.errors = []; rerender(); };
  if (!CR.legs.length) return go2();
  openModal({ title: 'Start from a template?', sub: 'This clears the legs you have entered. The instruction details below are kept.', okText: 'Clear legs and choose', okDanger: true, body: '', onOk() { go2(); } });
};
ACT.dupLeg = (el) => { const i = +el.dataset.arg; const c = JSON.parse(JSON.stringify(CR.legs[i])); CR.legs.splice(i + 1, 0, c); rerender(); setTimeout(() => openLegModal(i + 1), 60); };
ACT.gotoPreview = () => { const p = document.getElementById('preview-area'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

function matchParty(txt) {
  const q = String(txt || '').trim().toLowerCase(); if (!q) return null;
  const a = ACCOUNTS.find(x => x.number.toLowerCase() === q || x.name.toLowerCase() === q);
  if (a) return { type: 'account', id: a.id };
  const c = S.cps.find(x => x.uuid.toLowerCase() === q || x.name.toLowerCase() === q);
  return c ? { type: 'cp', id: c.id } : null;
}
function parsePaste(text) {
  const rows = [];
  String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach((line, n) => {
    const c = line.split(line.includes('\t') ? '\t' : ',').map(x => x.trim());
    if (n === 0 && /^from$/i.test(c[0])) return;
    const f = matchParty(c[0]), t = matchParty(c[1]);
    const type = f && f.type === 'cp' ? 'recv_ext' : t && t.type === 'cp' ? 'send_ext' : 'internal';
    const unk = c[3] === '' || c[3] === '?';
    const l = mkRow(type, { from: f || (type === 'recv_ext' ? { type: 'cp', id: '' } : { type: 'account', id: '' }), to: t || (type === 'send_ext' ? { type: 'cp', id: '' } : { type: 'account', id: '' }), assetId: ASSETS[(c[2] || '').toUpperCase()] ? c[2].toUpperCase() : '', amount: unk || isNaN(+c[3]) ? null : +c[3], fixed: !(unk && isOp()), date: /^\d{4}-\d{2}-\d{2}$/.test(c[4] || '') ? c[4] : S.today, seq: +c[5] || 0, _raw: { from: f ? '' : c[0], to: t ? '' : c[1] } });
    if (!isOp() && (type === 'send_ext' || type === 'recv_ext')) l.fixed = true;
    rows.push(l);
  });
  return rows;
}
ACT.pasteRows = () => {
  const ex = ACCOUNTS.filter(a => myAccts().includes(a.id))[0];
  openModal({
    title: 'Paste from spreadsheet', sub: 'One row per leg. Columns: Source, Destination, Asset, Amount, Settlement date (YYYY-MM-DD). Leave Amount empty for an unknown amount. Use account names or numbers, and counterparty names or counterparty IDs.', wide: true,
    body: '<textarea class="textarea" id="paste-text" style="min-height:160px;font-family:monospace" placeholder="' + esc(ex ? ex.name : 'Acme Main Account') + '\tCP-0001\tSGD\t10000\t' + S.today + '\t1"></textarea><div class="sub" style="margin-top:8px">Rows that cannot be matched are still added and flagged "Needs attention", so you can complete them with Edit.</div><div class="help" id="paste-err"></div>',
    okText: 'Add legs',
    onOk(m) { const rows = parsePaste(m.querySelector('#paste-text').value); if (!rows.length) { m.querySelector('#paste-err').textContent = 'Paste at least one row.'; return false; } CR.legs = CR.legs.concat(rows); CR.started = true; CR.submitted = true; rerender(); toast({ title: rows.length + ' legs added', desc: 'Check any legs flagged Needs attention.' }); }
  });
};

const submitReview = ACT.submitCreate;
ACT.submitCreate = () => {
  CR.submitted = true;
  if (!CR.legs.length) { CR.errors = [{ leg: -1, code: 'MISSING_REQUIRED_FIELD', message: 'Add at least one transfer leg.' }]; rerender(); return; }
  if (CR.legs.some(legNeedsFix)) { CR.errors = []; rerender(); const b = document.getElementById('grid-banner'); if (b) b.scrollIntoView({ block: 'center' }); return; }
  submitReview();
};


/* ======================================================= MOVEMENT MANAGEMENT (PRD - Manual Outgoing Movement Booking and Classification) */
const MV_CLASS = {
  in: [
    { code: 'deposit', label: 'Deposit', link: 'required' },
    { code: 'settlement', label: 'Settlement', link: 'required', auto: true },
    { code: 'airdrop', label: 'Airdrop', link: 'optional' },
    { code: 'interest', label: 'Interest', link: 'optional' },
    { code: 'withdrawal_reversal', label: 'Withdrawal reversal', link: 'required', needsRelated: true },
    { code: 'unknown_funds', label: 'Unknown funds', link: 'none' },
    { code: 'others', label: 'Others', link: 'optional', needsNote: true }
  ],
  out: [
    { code: 'withdrawal', label: 'Withdrawal', link: 'required', instructionLed: true },
    { code: 'rebalance', label: 'Rebalance', link: 'none', instructionLed: true },
    { code: 'settlement', label: 'Settlement', link: 'required', auto: true },
    { code: 'venue_charges', label: 'Venue charges', link: 'optional', charge: true },
    { code: 'refund', label: 'Refund', link: 'none', needsMov: true },
    { code: 'others', label: 'Others', link: 'optional', needsNote: true }
  ]
};
const CLS_LABEL = { unclassified: 'Unclassified', deposit: 'Deposit', settlement: 'Settlement', airdrop: 'Airdrop', interest: 'Interest', withdrawal_reversal: 'Withdrawal reversal', unknown_funds: 'Unknown funds', others: 'Others', withdrawal: 'Withdrawal', rebalance: 'Rebalance', venue_charges: 'Venue charges', refund: 'Refund' };
const OUT_RAILS = [['act', 'ACT'], ['fast_paynow', 'FAST'], ['meps', 'MEPS'], ['tt', 'TT']];
const BEARERS = [['CRED', 'Beneficiary Pays (CRED)'], ['DEBT', 'Sender Pays (DEBT)'], ['SHAR', 'Split (SHAR)']];
const railText = (r) => (OUT_RAILS.find(x => x[0] === r) || [0, r])[1];
const bearerText = (b) => (BEARERS.find(x => x[0] === b) || [0, b])[1];
const hasBearer = (r) => r === 'meps' || r === 'tt';
const CHAIN = { BTC: 'Bitcoin', UNIT: 'Ethereum', TOKEN: 'Ethereum' };
const chainOf = (asset) => CHAIN[asset] || '';
const CHARGE_LABEL = { bank_charge: 'Bank charge', network_fee: 'Network fee', other_venue_fee: 'Other venue fee' };
const mvKind = (asset) => (ASSETS[asset] && ASSETS[asset].fiat ? 'fiat' : 'token');
const mvBase = (m) => '#/movement-management/' + (m.dir === 'in' ? 'incoming' : 'outgoing') + '-movement';
const mvHref = (m) => mvBase(m) + '/' + m.id;
const clsInfo = (dir, code) => MV_CLASS[dir].find(c => c.code === code);
const venueOf = (id) => VENUES.find(v => v.id === id);
const tiedOf = (dir, d) => { const c = clsInfo(dir, d.classification); return !c ? false : c.link === 'required' ? true : c.link === 'none' ? false : d.tied === true || d.tied === 'true'; };
const clsText = (m) => (CLS_LABEL[m.classification || 'unclassified'] || m.classification) + (m.chargeType ? ' · ' + CHARGE_LABEL[m.chargeType] : '');
function localDT(x) { const p = (n) => String(n).padStart(2, '0'); return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()) + 'T' + p(x.getHours()) + ':' + p(x.getMinutes()); }
function postGen(dr, cr, amount, asset, event, movId) { S.posts.push({ id: 'P-' + nextId('pst'), siId: null, legId: null, obIds: [], dr, cr, amount, asset, event, at: nowIso(), valueDate: S.today, movId }); }

function validateClass(dir, d) {
  const e = []; const cls = clsInfo(dir, d.classification);
  if (!cls) return [{ field: 'classification', code: 'MISSING_REQUIRED_FIELD', message: 'Choose a classification.' }];
  const tied = tiedOf(dir, d);
  if (cls.link === 'optional' && (d.tied === null || d.tied === undefined || d.tied === '')) e.push({ field: 'tied', code: 'MISSING_REQUIRED_FIELD', message: dir === 'out' ? 'Choose who bears it.' : 'Choose whether to credit an account.' });
  if (tied && !d.accountId) e.push({ field: 'accountId', code: 'MISSING_REQUIRED_FIELD', message: 'An account is required.' });
  if (cls.needsNote && String(d.note || '').trim().length < 10) e.push({ field: 'note', code: 'MISSING_REQUIRED_FIELD', message: 'An explanation of at least 10 characters is required.' });
  if (cls.charge && !d.chargeType) e.push({ field: 'chargeType', code: 'MISSING_REQUIRED_FIELD', message: 'Choose a charge type.' });
  if (cls.needsRelated && !String(d.relatedTx || '').trim()) e.push({ field: 'relatedTx', code: 'MISSING_REQUIRED_FIELD', message: 'Enter the related withdrawal ID.' });
  if (cls.needsMov && !d.relatedMov) e.push({ field: 'relatedMov', code: 'MISSING_REQUIRED_FIELD', message: 'Choose the unknown funds entry to refund.' });
  return e;
}
function validateBooking(dir, d) {
  const e = [];
  const need = (k, msg) => { if (d[k] === '' || d[k] == null) e.push({ field: k, code: 'MISSING_REQUIRED_FIELD', message: msg }); };
  need('venueId', 'Choose a venue.'); need('asset', 'Choose an asset.'); need('at', 'Choose when it happened.'); need('ref', d.kind === 'fiat' ? 'Bank reference is required.' : 'Transaction hash is required.');
  if (!(+d.amount > 0)) e.push({ field: 'amount', code: 'INVALID_AMOUNT', message: 'Amount must be greater than zero.' });
  const v = venueOf(d.venueId);
  if (d.venueId && d.asset && (!v || !v.assets.includes(d.asset))) e.push({ field: 'venueId', code: 'INVALID_SOURCE_VENUE', message: 'The selected venue cannot be used for this asset.' });
  if (d.at && new Date(d.at) > new Date()) e.push({ field: 'at', code: 'INVALID_DATE', message: 'The date cannot be in the future.' });
  if (dir === 'in' && !String(d.depositor || '').trim()) e.push({ field: 'depositor', code: 'MISSING_REQUIRED_FIELD', message: d.kind === 'fiat' ? 'Depositor name is required.' : 'Source address is required.' });
  if (dir === 'in' && d.kind === 'fiat' && d.depBank && ![8, 11].includes(String(d.depBank).length)) e.push({ field: 'depBank', code: 'INVALID_FORMAT', message: 'Depositor bank must be 8 or 11 characters (SWIFT/BIC).' });
  if (d.ref && d.venueId && S.movs.some(m => m.venueId === d.venueId && m.ref && m.ref === d.ref)) e.push({ field: 'ref', code: 'ALREADY_EXISTS', message: 'A movement with this reference already exists at this venue.' });
  return e;
}
function effectText(dir, d) {
  const amt = amtTxt(+d.amount || 0, d.asset || ''); const v = (venueOf(d.venueId) || {}).name || 'the venue';
  if (dir === 'out') { const vbb = d.venueId && d.asset ? VB(d.venueId, d.asset) : null; const low = vbb && +d.amount > 0 && r8(vbb.total - +d.amount) < 0; return amt + ' has left ' + v + '. It is recorded as unclassified and held in Suspense (paid out) until an operator classifies it. One ledger entry is posted: DR Suspense / CR ' + v + '.' + (low ? ' Warning: the venue balance will go below zero. The money has already left, so the booking is allowed; check the reference and the venue balance.' : ''); }
  return amt + ' is recorded as an incoming movement at ' + v + ' (detected, unclassified). Nothing is posted to the ledger until an operator classifies it and confirms it.';
}
function effectClassify(dir, mv, d) {
  const amt = amtTxt(mv.amount, mv.asset); const v = (venueOf(mv.venueId) || {}).name || 'the venue'; const accn = d.accountId ? acctName(d.accountId) : '';
  const cls = clsInfo(dir, d.classification); if (!cls) return '';
  const tied = tiedOf(dir, d); const what = (CLS_LABEL[d.classification] || '').toLowerCase() + (d.chargeType ? ' (' + CHARGE_LABEL[d.chargeType].toLowerCase() + ')' : '');
  if (dir === 'out') {
    if (d.classification === 'refund') return amt + ' is recorded as a refund. It clears the same amount from the unknown funds held in Suspense. One ledger entry is posted: DR Suspense / CR Suspense (paid out).';
    return amt + ' is classified as ' + what + ', ' + (tied ? 'charged to ' + accn + '. That account balance falls and the line appears on its monthly statement. One ledger entry is posted: DR ' + accn + ' / CR Suspense (paid out).' : 'borne by the custodian. No account balance changes. One ledger entry is posted: DR Custodian expense / CR Suspense (paid out).');
  }
  if (d.classification === 'unknown_funds') return amt + ' from an unknown sender is held in Suspense until it is refunded. One ledger entry is posted when it is confirmed: DR ' + v + ' / CR Suspense.';
  return amt + ' is classified as ' + what + ', ' + (tied ? 'credited to ' + accn + '. That account balance rises and the line appears on its monthly statement. One ledger entry is posted when it is confirmed: DR ' + v + ' / CR ' + accn + '.' : 'not attributed to an account and recorded as custodian income. One ledger entry is posted when it is confirmed: DR ' + v + ' / CR Custodian income.');
}

function applyClassification(user, mv, d) {
  const dir = mv.dir; const errs = validateClass(dir, d); if (errs.length) return fail(errs[0].code, errs[0].message);
  if (mv.classification !== 'unclassified') return fail('INVALID_RECORD_STATE', 'The movement is no longer unclassified.');
  const tied = tiedOf(dir, d); const amt = mv.amount, asset = mv.asset; const vname = (venueOf(mv.venueId) || {}).name || 'Venue';
  const label = (CLS_LABEL[d.classification] || '').toLowerCase();
  if (dir === 'out') {
    if (d.classification === 'refund') {
      const o = mvById(d.relatedMov);
      if (r8(S.suspense[asset] || 0) < amt) return fail('INSUFFICIENT_BALANCE', 'Suspense does not hold this amount.');
      S.suspense[asset] = r8((S.suspense[asset] || 0) - amt);
      postGen('Suspense', 'Suspense (paid out)', amt, asset, mv.id + ' refund', mv.id);
      if (o) { o.refundedBy = mv.id; mv.relatedTx = o.id; }
    } else if (tied) {
      const b = B(d.accountId, asset); if (r8(b.total - b.reserved) < amt) return fail('INSUFFICIENT_BALANCE', 'The account does not have enough balance.');
      b.total = r8(b.total - amt);
      postGen(acct(d.accountId).name, 'Suspense (paid out)', amt, asset, mv.id + ' ' + label + (d.chargeType ? ' · ' + CHARGE_LABEL[d.chargeType].toLowerCase() : ''), mv.id);
    } else {
      S.custodian.expense[asset] = r8((S.custodian.expense[asset] || 0) + amt);
      postGen('Custodian expense', 'Suspense (paid out)', amt, asset, mv.id + ' ' + label + (d.chargeType ? ' · ' + CHARGE_LABEL[d.chargeType].toLowerCase() : ''), mv.id);
    }
    S.suspenseOut[asset] = r8((S.suspenseOut[asset] || 0) - amt);
    Object.assign(mv, { classification: d.classification, accountId: tied ? d.accountId : null, tied, chargeType: d.chargeType || '', note: d.note || mv.note || '', relatedTx: d.relatedTx || mv.relatedTx || '', classifiedAt: nowIso() });
    addAudit('MV-' + mv.id, 'outgoing_movement:classify', user.id, mv.id + ' as ' + d.classification);
    saveState();
    return { ok: true };
  }
  const vbIn = VB(mv.venueId, asset); vbIn.total = r8(vbIn.total + amt);
  if (d.classification === 'unknown_funds') { S.suspense[asset] = r8((S.suspense[asset] || 0) + amt); postGen(vname, 'Suspense', amt, asset, mv.id + ' ' + label, mv.id); }
  else if (tied) { B(d.accountId, asset).total = r8(B(d.accountId, asset).total + amt); postGen(vname, acct(d.accountId).name, amt, asset, mv.id + ' ' + label, mv.id); }
  else { S.custodian.income[asset] = r8((S.custodian.income[asset] || 0) + amt); postGen(vname, 'Custodian income', amt, asset, mv.id + ' ' + label, mv.id); }
  Object.assign(mv, { classification: d.classification, accountId: tied ? d.accountId : null, tied, status: 'confirmed', note: d.note || mv.note || '', relatedTx: d.relatedTx || mv.relatedTx || '', classifiedAt: nowIso() });
  addAudit('MV-' + mv.id, 'incoming_movement:classify', user.id, mv.id + ' as ' + d.classification);
  saveState();
  return { ok: true };
}
function applyBook(maker, checker, dir, d) {
  const errs = validateBooking(dir, d); if (errs.length) return fail(errs[0].code, errs[0].message);
  const venue = venueOf(d.venueId); const amt = r8(+d.amount); const asset = d.asset; const vb = VB(d.venueId, asset);
  const base = { cpId: null, obSiId: null, amount: amt, asset, venueId: d.venueId, via: d.depositor || '', ref: d.ref, at: String(d.at).slice(0, 10), atFull: d.at, links: [], source: 'manual', kind: mvKind(asset), created: nowIso(), bookedBy: maker.id, depositor: d.depositor || '', note: d.note || '', relatedTx: '', chargeType: '', chain: mvKind(asset) === 'token' ? chainOf(asset) : '', srcAddr: mvKind(asset) === 'token' ? (venue.address || '') : '', netFee: mvKind(asset) === 'token' && dir === 'out' ? (d.netFee || '') : '', rail: d.rail || '', chargeBearer: hasBearer(d.rail) ? (d.chargeBearer || '') : '', classification: 'unclassified', accountId: null, tied: false };
  if (dir === 'out') {
    const m = Object.assign(base, { id: 'OM-' + nextId('mv'), dir: 'out', status: 'confirmed', exec: 'settled', execMethod: 'manual' });
    vb.total = r8(vb.total - amt); S.suspenseOut[asset] = r8((S.suspenseOut[asset] || 0) + amt);
    postGen('Suspense (paid out)', venue.name, amt, asset, m.id + ' booked, unclassified', m.id);
    S.movs.unshift(m);
    addAudit('MV-' + m.id, 'outgoing_movement:create', (checker || maker).id, m.id + ' ' + fmtAmt(amt, asset) + ' ' + asset);
    saveState();
    return { ok: true, mv: m };
  }
  const m = Object.assign(base, { id: 'IM-' + nextId('mv'), dir: 'in', status: 'detected', exec: '' });
  Object.assign(m, { van: d.van || '', senderRef: d.senderRef || '', channel: d.channel || '', depAcct: d.depAcct || '', depBank: d.depBank || '' });
  S.movs.unshift(m);
  addAudit('MV-' + m.id, 'incoming_movement:create', (checker || maker).id, m.id + ' ' + fmtAmt(amt, asset) + ' ' + asset);
  saveState();
  return { ok: true, mv: m };
}
function applyClassifyRequest(user, req) {
  const p = req.payload; const mv = mvById(p.movId); if (!mv) return fail('RECORD_NOT_FOUND', 'The movement could not be found.');
  return applyClassification(user, mv, p);
}
function applyBookRequest(user, req) {
  const r = applyBook(userById(req.makerId), user, req.payload.dir, req.payload.form);
  if (r.ok) req.movId = r.mv.id;
  return r.ok ? r : fail(r.code, r.message + ' The request stays awaiting approval.');
}
function reqSubject2(r) {
  if (r.type === 'si_create') return esc(r.payload.fields.extRef);
  if (r.type === 'book_movement') return esc(amtTxt(+r.payload.form.amount, r.payload.form.asset) + ' · ' + r.payload.form.ref);
  return esc(r.payload.movId);
}
function requestExtraHtml(r) {
  if (r.type === 'fail_movement') { const mv = mvById(r.payload.movId); return '<div class="card"><div class="card-head">Proposed change</div><div class="card-body">' + dl([['Movement', mv ? '<a href="' + mvHref(mv) + '">' + esc(mv.id) + '</a>' : esc(r.payload.movId)], ['Amount', mv ? esc(amtTxt(mv.amount, mv.asset)) : '-'], ['Reason', esc(r.payload.reason)]]) + '<div class="note" style="margin-top:8px">On approval the movement is marked as failed, the source venue earmark is released and the obligation stays open for a new movement.</div></div></div>'; }
  if (r.type === 'classify') {
    const p = r.payload; const mv = mvById(p.movId); const dir = mv ? mv.dir : 'in';
    return '<div class="card"><div class="card-head">Proposed classification</div><div class="card-body">' + dl([['Movement', mv ? '<a href="' + mvHref(mv) + '">' + esc(mv.id) + '</a>' : '-'], ['Amount', mv ? esc(amtTxt(mv.amount, mv.asset)) : '-'], ['Classification', esc((CLS_LABEL[p.classification] || p.classification) + (p.chargeType ? ' · ' + CHARGE_LABEL[p.chargeType] : ''))], [dir === 'out' ? 'Charged to' : 'Account', p.accountId ? acctLabel(p.accountId) : (dir === 'out' ? 'Borne by the custodian' : '-')], ['Related transaction', esc(p.relatedTx || '-')], ['Explanation', esc(p.note || '-')]]) + '<div class="note" style="margin-top:8px">' + esc(mv ? effectClassify(dir, mv, p) : '') + '</div></div></div>';
  }
  const f = r.payload.form; const dir = r.payload.dir;
  return '<div class="card"><div class="card-head">Proposed booking</div><div class="card-body">' + dl([['Direction', dir === 'out' ? 'Outgoing' : 'Incoming'], ['Type', esc(f.kind === 'fiat' ? 'Fiat' : 'Token')], ['Venue', esc((venueOf(f.venueId) || {}).name || '-')], ['Amount', esc(amtTxt(+f.amount, f.asset))], ['Transacted at', esc(String(f.at).replace('T', ' '))], ['Reference', esc(f.ref)], ['Internal note', esc(f.note || '-')]]) + '<div class="note" style="margin-top:8px">' + esc(effectText(dir, f)) + '</div></div></div>';
}

/* ---------- lists */
let MVQ_DEFAULT = { cls: '', status: '', asset: '', venue: '', rail: '', q: '', page: 1, size: 10 };
const mvQuery = (route) => Object.assign({}, MVQ_DEFAULT, b64d(route.query.q || '') || {});
const setMv = (patch) => go('#' + ROUTE.path + '?q=' + b64e(Object.assign(mvQuery(ROUTE), patch)));
ACT.mvFilter = (el) => setMv({ [el.dataset.key]: el.value, page: 1 });
ACT.mvReset = () => go('#' + ROUTE.path);
ACT.mvPage = (el) => setMv({ page: +el.dataset.arg });
ACT.mvSize = (el) => setMv({ size: +el.value, page: 1 });
const mvAccountCell = (m) => {
  if (m.accountId) return acctLabel(m.accountId);
  if (m.links && m.links[0]) { const f = findOb(m.links[0].obId); if (f) return acctLabel(f.o.accountId); }
  if (m.classification === 'unclassified') return '<span class="sub">-</span>';
  if (m.classification === 'unknown_funds') return '<span class="sub">Held in Suspense</span>';
  if (m.classification === 'refund') return '<span class="sub">Cleared from Suspense</span>';
  if (m.source === 'instruction') return '-';
  return '<span class="sub">' + (m.dir === 'out' ? 'Borne by the custodian' : 'Not attributable') + '</span>';
};
function mvFiltered(dir, kind, f) {
  const q = (f.q || '').trim().toLowerCase();
  return S.movs.filter(m => m.dir === dir && mvKind(m.asset) === kind &&
    (!f.cls || (m.classification || 'unclassified') === f.cls) && (!f.status || m.status === f.status) && (!f.asset || m.asset === f.asset) && (!f.venue || m.venueId === f.venue) && (!f.rail || m.rail === f.rail) &&
    (!q || (m.id + ' ' + (m.ref || '') + ' ' + (m.via || '') + ' ' + (m.depositor || '')).toLowerCase().includes(q)));
}
function mvListView(dir, kind) {
  const f = mvQuery(ROUTE);
  const rows = mvFiltered(dir, kind, f);
  const total = rows.length, pages = Math.max(1, Math.ceil(total / f.size)), page = Math.min(f.page, pages);
  const slice = rows.slice((page - 1) * f.size, page * f.size);
  const base = '#/movement-management/' + (dir === 'in' ? 'incoming' : 'outgoing') + '-movement';
  const tabs = '<div class="tabs"><button class="tab' + (kind === 'token' ? ' active' : '') + '" data-href="' + base + '/token">Token</button><button class="tab' + (kind === 'fiat' ? ' active' : '') + '" data-href="' + base + '/fiat">Fiat</button><button class="tab" disabled>Securities</button></div>';
  const sel = (key, opts, ph) => '<div class="f"><select class="select" data-act-change="mvFilter" data-key="' + key + '"><option value="">' + ph + '</option>' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (f[key] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
  const clsOpts = MV_CLASS[dir].map(c => [c.code, c.label]).concat([['unclassified', 'Unclassified']]);
  const stOpts = dir === 'in' ? [['detected', 'Detected'], ['confirmed', 'Confirmed']] : [['pending', 'Pending'], ['submitted', 'Submitted'], ['confirmed', 'Confirmed'], ['failed', 'Failed']];
  const showRail = dir === 'out' && kind === 'fiat';
  const any = f.cls || f.status || f.asset || f.venue || f.rail || f.q;
  const filters = '<div class="filters"><div class="f input-wrap"><input class="input" data-act-change="mvFilter" data-key="q" placeholder="Search ID or reference" title="Matches part of the movement ID, reference or sender" value="' + esc(f.q) + '"><span class="search-ico">⌕</span></div>' +
    sel('cls', clsOpts, 'Classification') + sel('status', stOpts, 'Status') + sel('asset', Object.keys(ASSETS).filter(a => mvKind(a) === kind).map(a => [a, a]), 'Asset') + sel('venue', VENUES.map(v => [v.id, v.name]), 'Venue') + (showRail ? sel('rail', OUT_RAILS, 'Payment rail') : '') +
    (any ? '<button class="btn btn-link danger" data-act="mvReset">Reset all</button>' : '') + '</div>';
  const head = '<th>ID</th><th>Classification</th><th>Amount | Asset</th><th>Venue</th><th>Account</th>' + (showRail ? '<th>Payment rail</th>' : '') + '<th>Reference</th><th>Transacted at</th><th>' + (dir === 'out' ? 'Status | Execution' : 'Status') + '</th><th></th>';
  const body = slice.length ? slice.map(m => '<tr class="click' + (m.classification === 'unclassified' ? ' overdue' : '') + '" data-href="' + mvHref(m) + '"><td>' + esc(m.id) + (m.source === 'manual' ? '<div class="sub">booked by hand</div>' : '') + '</td><td>' + (m.classification === 'unclassified' ? tag('Unclassified', 'red') : esc(clsText(m))) + '</td><td class="mono">' + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</td><td>' + esc((venueOf(m.venueId) || {}).name || '-') + '</td><td>' + mvAccountCell(m) + '</td>' + (showRail ? '<td>' + esc(m.rail ? railText(m.rail) : '-') + '</td>' : '') + '<td class="mono">' + esc(m.ref || '-') + '</td><td>' + esc(m.at || '-') + '</td><td>' + badge(m.status) + (dir === 'out' && m.exec ? '<div class="sub">' + esc(m.exec) + '</div>' : '') + '</td><td>' + (isOp() && m.source === 'manual' && m.classification === 'unclassified' || isOp() && dir === 'in' && m.classification === 'unclassified' ? btn('Classify', 'classify', m.id, 'btn-primary btn-sm') : '') + '</td></tr>').join('')
    : '<tr><td colspan="' + (showRail ? 10 : 9) + '"><div class="empty"><div class="big">No movements found</div>' + (any ? '<button class="btn" data-act="mvReset">Reset all</button>' : '') + '</div></td></tr>';
  const pageBtns = []; for (let i = 1; i <= pages; i++) pageBtns.push('<button class="page-btn' + (i === page ? ' active' : '') + '" data-act="mvPage" data-arg="' + i + '">' + i + '</button>');
  const html = tabs + filters + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table><div class="pager"><span>' + (total ? (page - 1) * f.size + 1 : 0) + '-' + Math.min(page * f.size, total) + ' of ' + total + ' items</span>' + pageBtns.join('') + '<select class="select" data-act-change="mvSize">' + [10, 20, 50].map(n => '<option' + (n === f.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>';
  return { title: dir === 'in' ? 'Incoming Movement' : 'Outgoing Movement', crumbs: ['Dashboard', 'Movement Management', dir === 'in' ? 'Incoming Movement' : 'Outgoing Movement', kind === 'token' ? 'Token' : 'Fiat'], buttons: btn('Export CSV', 'mvExport', dir + '|' + kind, '') + (isOp() ? btn(dir === 'in' ? 'Book Incoming Movement' : 'Book Outgoing Movement', 'mvBook', dir + '|' + kind, 'btn-primary') : ''), html };
}
ACT.mvExport = (el) => {
  const [dir, kind] = el.dataset.arg.split('|'); const rows = mvFiltered(dir, kind, mvQuery(ROUTE));
  csvDownload('movements-' + dir + '-' + kind + '.csv', [['ID', 'Classification', 'Charge type', 'Amount', 'Asset', 'Venue', 'Account', 'Payment rail', 'Charge bearer', 'Reference', 'Transacted at', 'Status']].concat(rows.map(m => [m.id, CLS_LABEL[m.classification || 'unclassified'], CHARGE_LABEL[m.chargeType] || '', m.amount, m.asset, (venueOf(m.venueId) || {}).name || '', m.accountId ? acct(m.accountId).number : '', m.rail ? railText(m.rail) : '', m.chargeBearer || '', m.ref || '', m.at || '', m.status])));
  toast({ title: 'Export started', desc: rows.length + ' rows exported using the current filters.' });
};
ACT.mvBook = (el) => { BK = null; const [dir, kind] = el.dataset.arg.split('|'); go('#/movement-management/' + (dir === 'in' ? 'incoming' : 'outgoing') + '-movement/' + kind + '/create'); };

/* ---------- detail */
function mvDetailView(id) {
  const m = mvById(id);
  const back = ['Dashboard', 'Movement Management'];
  if (!m) return { title: 'Not found', crumbs: back, buttons: '', html: '<div class="empty"><div class="big">Movement not found</div><a href="#/movement-management/incoming-movement/token">Back to movements</a></div>' };
  if (!isOp()) return { title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty"><div class="big">FORBIDDEN</div>You do not have access to this page.</div>' };
  const pend = S.reqs.find(r => r.status === 'pending' && r.payload && r.payload.movId === m.id);
  const f = m.links && m.links[0] ? findOb(m.links[0].obId) : null;
  const cp = m.cpId ? cpOf(m.cpId) : null;
  let buttons = '';
  if (pend) buttons = btn('View request', 'viewMvReq', pend.id, '');
  else if (m.classification === 'unclassified' && (m.dir === 'in' || m.source === 'manual')) buttons = btn('Classify', 'classify', m.id, 'btn-primary');
  else if (m.dir === 'out' && m.source === 'settlement' && m.status === 'pending') buttons = btn('Mark as failed', 'markFailed', m.id, 'btn-danger') + btn('Submit', 'submitMv', m.id, 'btn-primary');
  else if (m.dir === 'out' && m.source === 'settlement' && m.status === 'submitted') buttons = btn('Mark as failed', 'markFailed', m.id, 'btn-danger') + btn('Simulate bank rejection', 'bankReject', m.id, '') + btn('Confirm', 'confirmMv', m.id, 'btn-primary');
  let banner = '';
  if (pend) banner = '<div class="alert warning">This entry has an ongoing maker checker request. Please resolve the maker checker request.</div>';
  else if (m.classification === 'unclassified') banner = '<div class="alert warning">This movement is unclassified and requires operator review. ' + (m.dir === 'out' ? 'The amount is held in Suspense (paid out).' : 'Classify it, then confirm it.') + '</div>';
  else if (m.status === 'confirmed') banner = '<div class="alert success">' + (m.dir === 'in' ? 'This movement is confirmed' + (m.accountId ? ' and the amount has been credited to the account.' : '.') : 'This movement is confirmed.') + '</div>';
  else if (m.status === 'pending' || m.status === 'submitted') banner = '<div class="alert info">This movement is ' + (m.status === 'pending' ? 'pending submission' : 'submitted and being processed') + '. Its actions run from the linked withdrawal and are not simulated in this prototype.</div>';
  else if (m.status === 'failed') banner = '<div class="alert error">This movement failed. ' + esc(m.failure || '') + '</div>';
  const manual = m.source === 'manual', isTok = mvKind(m.asset) === 'token';
  const NA = '<span class="sub">Not applicable (booked by hand)</span>';
  const src = { manual: 'Booked by hand', detected: 'Detected by the system', settlement: 'Settlement instruction', instruction: 'Withdrawal or rebalance' }[m.source || (f ? 'settlement' : 'manual')] || '-';
  const rows = [['Movement ID', esc(m.id)], ['Movement type', isTok ? 'Token' : 'Fiat'], ['Direction', m.dir === 'in' ? 'Incoming' : 'Outgoing'], ['Origin', esc(src)],
    [m.dir === 'out' ? 'From' : 'Venue', (function () { const v = venueOf(m.venueId) || {}; return '<a href="#/balances">' + esc(v.name || '-') + '</a><div class="sub">' + esc(VKIND[v.kind] || '') + (v.kind === 'fiat' && v.account ? ' · ' + esc(v.account) : '') + '</div>'; })()], ['Asset', esc(m.asset)], ['Amount', '<span class="mono">' + esc(fmtAmt(m.amount, m.asset)) + '</span>'], ['Movement status', badge(m.status)]];
  if (m.dir === 'out') rows.push(['Execution method', esc(m.execMethod || (m.source === 'settlement' ? 'automated' : '-'))], ['Execution status', esc(m.exec || '-')]);
  if (m.dir === 'out') {
    const typed = isTok ? (m.dstAddr || m.depositor) : m.depositor;
    let toV;
    if (!manual && !isTok && m.bank) toV = esc(m.bank.beneficiary + ' · ' + m.bank.number) + ' ' + tag('Whitelist Bank', 'blue');
    else if (!manual && isTok && m.dstAddr) toV = '<span class="mono">' + esc(m.dstAddr) + '</span> ' + tag('Whitelist Address', 'blue');
    else if (typed) toV = (isTok ? '<span class="mono">' + esc(typed) + '</span>' : esc(typed)) + ' ' + tag('Entered by hand', 'gold');
    else toV = m.classification === 'venue_charges' ? '<span class="sub">Not applicable (the bank or chain itself)</span>' : '-';
    rows.push(['To', toV]);
  }
  rows.push(['Classification', m.classification === 'unclassified' ? tag('Unclassified', 'red') : esc(CLS_LABEL[m.classification] || m.classification)]);
  if (m.chargeType) rows.push(['Charge type', esc(CHARGE_LABEL[m.chargeType])]);
  if (m.classification && m.classification !== 'unclassified') rows.push([m.classification === 'refund' ? 'Effect' : m.dir === 'out' ? 'Charged to' : 'Credited to', m.accountId ? acctLabel(m.accountId) : esc(m.classification === 'unknown_funds' ? 'Held in Suspense' : m.classification === 'refund' ? 'Cleared from Suspense' : m.dir === 'out' ? 'Borne by the custodian' : 'Not attributable (custodian income)')]);
  if (m.transactionId) rows.push(['Linked transaction', esc(m.transactionId) + '<div class="sub">' + esc(CLS_LABEL[m.classification] || '') + '</div>']);
  if (m.relatedTx) rows.push(['Related transaction', esc(m.relatedTx)]);
  if (m.note) rows.push(['Explanation', esc(m.note)]);
  if (m.dir === 'in') rows.push(['Reference', esc(m.ref || '-')], ['Received from', esc(m.via || '-')]);
  rows.push(['Transacted at', esc(m.atFull ? String(m.atFull).replace('T', ' ') : m.at || '-')], ['Created at', dateCell(m.created)]);
  if (m.bookedBy) rows.push(['Booked by', esc(userById(m.bookedBy).name)]);
  const card = (title, items, note) => '<div class="card"><div class="card-head">' + title + '</div><div class="card-body">' + (items.length ? dl(items) : '') + (note ? '<div class="note"' + (items.length ? ' style="margin-top:8px"' : '') + '>' + note + '</div>' : '') + '</div></div>';
  let html = banner + card('Details', rows);
  if (m.dir === 'out' && !isTok) {
    const pay = [['Payment rail', m.rail ? esc(railText(m.rail)) : '-']];
    if (m.chargeBearer) pay.push(['Charge bearer', esc(bearerText(m.chargeBearer))]);
    if (m.chargeBearerAcct) pay.push(['Charge bearer account', acctLabel(m.chargeBearerAcct)]);
    pay.push(['Bank reference', esc(m.ref || '-')], ['Payment reference', m.payRef ? esc(m.payRef) : (manual ? NA : '-')]);
    if (m.fallback) pay.push(['Fallback reason', esc(m.fallback)]);
    if (m.failure) pay.push(['Failure / rejection reason', esc(m.failure)]);
    html += card('Payment details', pay);
    if (m.bank) html += card('To (whitelisted bank account)', [['Bank account ID', esc(m.bank.id)], ['Bank account number', esc(m.bank.number)], ['Beneficiary name', esc(m.bank.beneficiary)], ['SWIFT/BIC code', esc(m.bank.swift)], ['Country', esc(m.bank.country)]]);
    else html += card('To', [['Beneficiary name', m.depositor ? esc(m.depositor) : '-']], manual ? 'Bank account details are not recorded for a movement booked by hand.' : '');
  }
  if (m.dir === 'out' && isTok) {
    const chain = [['Blockchain', esc(m.chain || chainOf(m.asset) || '-')], ['Source address', '<span class="mono">' + esc(m.srcAddr || '-') + '</span>'], ['Destination address', m.dstAddr || (manual && m.depositor) ? '<span class="mono">' + esc(m.dstAddr || m.depositor) + '</span>' : '-'], ['Transaction hash', '<span class="mono">' + esc(m.ref || '-') + '</span>'], ['Network fee', m.netFee ? '<span class="mono">' + esc(m.netFee) + ' ' + esc(m.asset) + '</span>' : '-']];
    if (m.totalReceived) chain.push(['Total received', '<span class="mono">' + esc(m.totalReceived) + ' ' + esc(m.asset) + '</span>']);
    if (m.wlAddr) chain.push(['Whitelist address ID', esc(m.wlAddr)]);
    html += card('Blockchain and addresses', chain);
    html += m.kyt ? card('Compliance (KYT)', [['KYT status', esc(m.kyt)], ['KYT remarks', esc(m.kytRemarks || '-')]]) : card('Compliance (KYT)', [], 'KYT does not apply: the money had already left when this movement was booked by hand.');
  }
  if (m.tied && m.accountId && m.status === 'confirmed' && m.source === 'manual') html += '<div class="alert info"><div><b>Appears on the monthly statement.</b> This movement changed the balance of ' + esc(acctName(m.accountId)) + ', so it is shown on that account\'s monthly statement.</div></div>';
  if (f || cp) html += '<div class="card"><div class="card-head">Settlement</div><div class="card-body">' + dl([['Settlement instruction', f ? '<a href="#/si/' + f.si.id + '">' + esc(f.si.id) + '</a>' : '-'], ['Obligation', f ? esc(f.o.id + ' · ' + acctName(f.o.accountId)) : '-'], ['Counterparty', cp ? '<a href="#/counterparties/' + cp.id + '">' + esc(cp.name) + '</a>' : '-']]) + '</div></div>';
  const au = S.audit.filter(a => a.siId === 'MV-' + m.id || (f && a.siId === f.si.id && a.detail && a.detail.includes(m.id)));
  html += '<div class="card"><div class="card-head">Audit log</div><div class="card-body">' + (au.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>User</th><th>Detail</th><th>Time</th></tr></thead><tbody>' + au.map(a => '<tr><td class="mono">' + esc(a.event) + '</td><td>' + esc(userById(a.userId).name) + '</td><td>' + esc(a.detail) + '</td><td>' + dateCell(a.time) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">No audit events.</div>') + '</div></div>';
  return { title: m.id, sub: badge(m.status) + (m.source === 'manual' ? ' ' + tag('Booked by hand', 'gold') : '') + ' ' + (m.classification === 'unclassified' ? tag('Unclassified', 'red') : tag(clsText(m))), crumbs: back.concat([m.dir === 'in' ? 'Incoming Movement' : 'Outgoing Movement', m.id]), buttons, html };
}
ACT.viewMvReq = (el) => go('#/approvals/' + el.dataset.arg);

/* ---------- classify (incoming) */
function openClassifyModal(mv) {
  const dir = mv.dir;
  const d = { classification: '', tied: null, accountId: '', note: '', relatedTx: '', obId: '', chargeType: '', relatedMov: '' };
  const obCands = () => { const c = []; S.sis.filter(s => s.status === 'settling').forEach(s => s.obs.forEach(o => { if (o.dir === 'receive' && o.cpId && o.asset === mv.asset && !isFinalOb(o) && (!mv.cpId || o.cpId === mv.cpId)) c.push({ s, o }); })); return c; };
  const options = dir === 'out' ? MV_CLASS.out.filter(c => !c.instructionLed && !c.auto) : MV_CLASS.in;
  const sec = (t, desc) => '<div class="form-sec">' + esc(t) + '</div>' + (desc ? '<div class="form-sec-desc">' + esc(desc) + '</div>' : '');
  const paint = (m) => {
    const body = m.querySelector('.modal-body'); const cls = clsInfo(dir, d.classification); const tied = cls ? tiedOf(dir, d) : false;
    let h = dl([['Amount', esc(amtTxt(mv.amount, mv.asset))], ['Venue', esc((venueOf(mv.venueId) || {}).name || '-')]].concat(dir === 'out' && mv.source === 'manual' ? [] : [[dir === 'in' ? 'Received from' : 'Sent to', esc(mv.depositor || mv.via || '-')]]).concat([['Reference', esc(mv.ref || '-')]])).replace('class="dl"', 'class="dl" style="grid-template-columns:1fr 1fr"');
    h += sec('What is it for?', dir === 'out' ? 'Choose the type that best describes this payment.' : 'Choose the type that best describes this arrival.');
    h += formItem('Classification', '<select class="select" id="cl-cls"><option value="">Select classification</option>' + options.map(c => '<option value="' + c.code + '"' + (d.classification === c.code ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('') + '</select>', { required: true });
    if (cls && cls.charge) h += formItem('Charge type', selectHtml('cl-charge', d.chargeType, Object.keys(CHARGE_LABEL).map(k => [k, CHARGE_LABEL[k]]), { placeholder: 'Select charge type' }), { required: true, tip: 'A network fee paid inside the same transfer stays on that movement. Classify it here only when it is paid separately.' });
    if (cls && cls.code === 'settlement') {
      const c = obCands();
      h += formItem('Settlement obligation', c.length ? selectHtml('cl-ob', d.obId, c.map(x => [x.o.id, x.s.id + ' · ' + x.o.id + ' · ' + acctName(x.o.accountId) + ' · ' + amtTxt(x.o.amount, x.o.asset) + ' (' + cpOf(x.o.cpId).name + ')']), { placeholder: 'Select obligation' }) : '<div class="note">No open obligation is waiting for this asset.</div>', { required: true });
    } else if (cls) {
      if (cls.needsMov) {
        const unk = S.movs.filter(x => x.dir === 'in' && x.classification === 'unknown_funds' && !x.refundedBy && x.asset === mv.asset);
        h += sec('What it settles', 'The unknown funds this refund returns.') + formItem('Unknown funds entry to refund', unk.length ? selectHtml('cl-rmov', d.relatedMov, unk.map(x => [x.id, x.id + ' · ' + amtTxt(x.amount, x.asset) + ' · ' + (x.ref || '')]), { placeholder: 'Select entry' }) : '<div class="note">No unrefunded unknown funds in ' + esc(mv.asset) + '.</div>', { required: true });
      }
      if (cls.link !== 'none') {
        h += sec(dir === 'out' ? 'Who bears it?' : 'Who is credited?', dir === 'out' ? 'Charge it to a customer account, or keep it as our own cost.' : 'Credit a customer account, or keep it as our own income.');
        if (cls.link === 'optional') h += '<div class="form-item"><label><span class="req">*</span>' + (dir === 'out' ? 'Charged to' : 'Credit') + '</label><div><label style="margin-right:24px"><input type="radio" name="cl-tied" value="true"' + (d.tied === true ? ' checked' : '') + '> An account</label><label><input type="radio" name="cl-tied" value="false"' + (d.tied === false ? ' checked' : '') + '> ' + (dir === 'out' ? 'Borne by the custodian' : 'Not attributable (custodian income)') + '</label></div></div>';
        if (tied) h += formItem(dir === 'out' ? 'Account' : 'Destination account', selectHtml('cl-acc', d.accountId, ACCOUNTS.map(a => [a.id, a.name + ' | ' + a.number]), { placeholder: 'Select account' }), { required: true });
        if (dir === 'in' && tied && d.accountId) h += '<div class="alert warning"><div><b>Manual verification required.</b> Ensure that the sender name matches the entity owning the selected account.<div class="cmp-line">Sender on transfer: <b>' + esc(mv.depositor || mv.via || '-') + '</b> &nbsp;|&nbsp; Entity on selected account: <b>' + esc(acct(d.accountId).entity) + '</b></div></div></div>';
      }
      h += sec('Notes');
      if (cls.needsRelated) h += formItem('Related withdrawal ID', inputHtml('cl-rel', d.relatedTx, { placeholder: 'e.g. WD-2041' }), { required: true });
      else h += formItem('Related transaction', inputHtml('cl-rel', d.relatedTx, { placeholder: 'e.g. DEP-1001' }), { optional: true, tip: 'For example the deposit that caused an incoming TT fee.' });
      h += formItem(cls.needsNote ? 'Explanation' : 'Note', textareaHtml('cl-note', d.note, { placeholder: cls.needsNote ? 'Explain what this movement is (at least 10 characters)' : 'Optional' }), cls.needsNote ? { required: true } : { optional: true });
      h += '<div class="note">' + esc(effectClassify(dir, mv, d)) + '</div>';
    }
    h += '<div class="help" id="cl-err"></div>';
    body.innerHTML = h;
    const read = () => { const g = (id) => { const e = body.querySelector('#' + id); return e ? e.value : null; }; if (g('cl-note') !== null) d.note = g('cl-note'); if (g('cl-rel') !== null) d.relatedTx = g('cl-rel'); };
    body.querySelector('#cl-cls').addEventListener('change', (e) => { read(); d.classification = e.target.value; d.tied = null; d.accountId = ''; d.obId = ''; d.chargeType = ''; d.relatedMov = ''; paint(m); });
    const ob = body.querySelector('#cl-ob'); if (ob) ob.addEventListener('change', () => { d.obId = ob.value; });
    const ch = body.querySelector('#cl-charge'); if (ch) ch.addEventListener('change', () => { read(); d.chargeType = ch.value; paint(m); });
    const rm = body.querySelector('#cl-rmov'); if (rm) rm.addEventListener('change', () => { read(); d.relatedMov = rm.value; paint(m); });
    const ac = body.querySelector('#cl-acc'); if (ac) ac.addEventListener('change', () => { read(); d.accountId = ac.value; paint(m); });
    body.querySelectorAll('input[name="cl-tied"]').forEach(r => r.addEventListener('change', () => { read(); d.tied = r.value === 'true'; if (!d.tied) d.accountId = ''; paint(m); }));
  };
  openModal({
    title: 'Classify ' + mv.id, sub: 'Needs a second operator (maker-checker). Say what this movement is for and, where needed, who bears it.', wide: true, body: '', okText: 'Submit for approval',
    onMount: paint,
    onOk(m) {
      const body = m.querySelector('.modal-body'); const err = (t) => { body.querySelector('#cl-err').textContent = t; return false; };
      const gv = (id) => { const e = body.querySelector('#' + id); return e ? e.value : ''; };
      if (!d.classification) return err('Choose a classification.');
      if (d.classification === 'settlement') {
        d.obId = gv('cl-ob') || d.obId; if (!d.obId) return err('Select an obligation.');
        const r = newRequest('classify', CUR, { movId: mv.id, obId: d.obId }, ''); toast({ title: 'Classification submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + r.id) } }); rerender(); return;
      }
      d.note = gv('cl-note') || d.note; d.relatedTx = gv('cl-rel') || d.relatedTx; d.chargeType = gv('cl-charge') || d.chargeType; d.relatedMov = gv('cl-rmov') || d.relatedMov;
      const errs = validateClass(dir, d); if (errs.length) return err(errs[0].message);
      if (dir === 'out' && tiedOf(dir, d) && d.accountId) { const b = B(d.accountId, mv.asset); if (r8(b.total - b.reserved) < mv.amount) return err('The account does not have enough balance.'); }
      const r = newRequest('classify', CUR, { movId: mv.id, classification: d.classification, tied: tiedOf(dir, d), accountId: tiedOf(dir, d) ? d.accountId : '', chargeType: d.chargeType, relatedMov: d.relatedMov, note: d.note, relatedTx: d.relatedTx }, '');
      toast({ title: 'Classification submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + r.id) } }); rerender();
    }
  });
}

/* ---------- book a movement (facts only; classification is a separate step) */
let BK = null;
const bkNew = (dir, kind) => ({ dir, kind, venueId: '', asset: '', amount: '', at: localDT(new Date()), ref: '', depositor: '', note: '', rail: '', chargeBearer: '', netFee: '', van: '', senderRef: '', channel: '', depAcct: '', depBank: '', errors: {} });
function bookView(dir, kind) {
  if (!isOp()) return { title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty"><div class="big">FORBIDDEN</div></div>' };
  if (!BK || BK.dir !== dir || BK.kind !== kind) BK = bkNew(dir, kind);
  const F = BK, e = F.errors; const word = dir === 'in' ? 'Incoming' : 'Outgoing';
  const venues = VENUES.filter(v => v.assets.some(a => mvKind(a) === kind));
  const assets = F.venueId ? (venueOf(F.venueId).assets || []).filter(a => mvKind(a) === kind) : [];
  const sec = (t, desc) => '<div class="form-sec">' + esc(t) + '</div><div class="form-sec-desc">' + esc(desc) + '</div>';
  const typeRadio = '<div class="radio-group">' + [['token', 'Token'], ['fiat', 'Fiat']].map(t => '<label><input type="radio" name="bk-type" value="' + t[0] + '"' + (kind === t[0] ? ' checked' : '') + '> ' + t[1] + '</label>').join('') + '</div>';
  const div = '<hr class="divider">';
  const chOpts = (arr, cur, ph) => '<option value="">' + ph + '</option>' + arr.map(r => '<option' + (cur === r ? ' selected' : '') + '>' + r + '</option>').join('');
  let h;
  if (dir === 'in') {
    h = '<div class="form-wrap">' + sec('Movement details', 'Basic information about the movement.') + formItem('Type', typeRadio) +
      formItem('Venue', selectHtml('bk-venue', F.venueId, venues.map(v => [v.id, v.name]), { placeholder: 'Select venue', error: e.venueId }), { required: true, error: e.venueId }) +
      formItem('Asset', selectHtml('bk-asset', F.asset, assets, { placeholder: F.venueId ? 'Select asset' : 'Select venue first', error: e.asset, disabled: !F.venueId }), { required: true, error: e.asset }) + div +
      sec(kind === 'fiat' ? 'Depositor details' : 'Source and destination address', kind === 'fiat' ? 'Who sent the money, as shown on the bank credit.' : 'Specify where the funds are coming from and going to.') +
      (kind === 'fiat'
        ? formItem('Depositor name', inputHtml('bk-dep', F.depositor, { placeholder: 'Enter depositor name', error: e.depositor }), { required: true, error: e.depositor }) +
          formItem('Depositor account number', inputHtml('bk-acct', F.depAcct, { placeholder: 'Enter depositor account number' }), { optional: true }) +
          formItem('Depositor bank (SWIFT/BIC)', inputHtml('bk-bank', F.depBank, { placeholder: 'Enter 8 or 11 characters', error: e.depBank }), { optional: true, error: e.depBank })
        : formItem('Source address', inputHtml('bk-dep', F.depositor, { placeholder: 'Enter source address', error: e.depositor }), { required: true, error: e.depositor }) +
          formItem('Destination address', inputHtml('bk-dest', '', { placeholder: 'Auto-filled from venue', disabled: true }))) + div +
      sec('Amount and timing', 'How much, when it happened, and the reference that proves it.') +
      formItem('Amount', inputHtml('bk-amount', F.amount, { placeholder: 'Enter amount', error: e.amount }), { required: true, error: e.amount }) +
      formItem('Transacted at', '<input class="input" type="datetime-local" id="bk-at" value="' + esc(F.at) + '">', { required: true, error: e.at }) +
      formItem(kind === 'fiat' ? 'Bank reference' : 'Transaction hash', inputHtml('bk-ref', F.ref, { placeholder: kind === 'fiat' ? 'Enter bank reference' : 'Enter transaction hash', error: e.ref }), { required: true, error: e.ref, tip: 'Used for reconciliation and to detect duplicates at the venue.' }) +
      (kind === 'fiat' ? formItem('Virtual account number', inputHtml('bk-van', F.van, { placeholder: 'Enter virtual account number' }), { optional: true }) + formItem('Sender reference', inputHtml('bk-sref', F.senderRef, { placeholder: 'Enter sender reference' }), { optional: true }) +
        formItem('Rail', '<select class="select" id="bk-rail">' + chOpts(['FAST', 'PayNow', 'ACT', 'TT', 'MEPS'], F.rail, 'Select rail') + '</select>', { optional: true }) +
        formItem('Channel', '<select class="select" id="bk-chan">' + chOpts(['instant', 'intraday'], F.channel, 'Select channel') + '</select>', { optional: true }) : '') + div +
      formItem('Internal note', textareaHtml('bk-note', F.note, { placeholder: 'Enter internal note' }), { optional: true }) +
      '<div class="form-actions">' + btn('Exit', 'bkExit', null, '') + btn('Submit', 'bkSubmit', null, 'btn-primary') + '</div></div>';
  } else {
    h = '<div class="form-wrap"><div class="alert info"><div>Record a movement that already happened at the venue. It is saved as <b>Unclassified</b>. After a second operator approves it, classify it from the movement list.</div></div>' +
    sec('Venue and asset', dir === 'in' ? 'Where the money arrived and what it is.' : 'Where the money left from and what it is.') +
    formItem('Type', typeRadio) +
    formItem('Venue', selectHtml('bk-venue', F.venueId, venues.filter(v => kind === 'fiat' ? v.kind === 'fiat' : v.kind !== 'fiat').map(v => [v.id, v.name + (v.kind === 'fiat' ? '' : ' (' + VKIND[v.kind] + ')')]), { placeholder: 'Select venue', error: e.venueId }), { required: true, error: e.venueId, hint: F.venueId && F.asset ? 'Current balance: ' + fmtAmt(VB(F.venueId, F.asset).total, F.asset) + ' ' + F.asset : 'Fiat venues are bank accounts. Token venues are hot and cold wallets.' }) +
    formItem('Asset', selectHtml('bk-asset', F.asset, assets, { placeholder: F.venueId ? 'Select asset' : 'Select venue first', error: e.asset, disabled: !F.venueId }), { required: true, error: e.asset }) +
    (kind === 'fiat' ? formItem('Bank account number', inputHtml('bk-bank-no', F.venueId ? (venueOf(F.venueId) || {}).account || '' : '', { disabled: true, placeholder: 'Auto-filled from venue' })) : '') + (kind === 'token' ? formItem('Blockchain', inputHtml('bk-chain', chainOf(F.asset), { disabled: true, placeholder: 'Set from the asset' })) + formItem('Source address', inputHtml('bk-src', F.venueId ? (venueOf(F.venueId) || {}).address || '' : '', { disabled: true, placeholder: 'Auto-filled from venue' })) : '') + div +
    sec('Amount and timing', 'How much, when it happened, and the reference that proves it.') +
    formItem('Amount', inputHtml('bk-amount', F.amount, { placeholder: 'Enter amount', error: e.amount }), { required: true, error: e.amount }) +
    formItem('Transacted at', '<input class="input" type="datetime-local" id="bk-at" value="' + esc(F.at) + '">', { required: true, error: e.at }) +
    formItem(kind === 'fiat' ? 'Bank reference' : 'Transaction hash', inputHtml('bk-ref', F.ref, { placeholder: kind === 'fiat' ? 'Enter bank reference' : 'Enter transaction hash', error: e.ref }), { required: true, error: e.ref, tip: 'Used for reconciliation and to detect duplicates at the venue.' }) + div +
    sec('Other details', 'Optional. Anything that helps the person who classifies it.') +
    (dir === 'in' ? formItem(kind === 'fiat' ? 'Depositor name' : 'Source address', inputHtml('bk-dep', F.depositor, { placeholder: kind === 'fiat' ? 'Name as shown on the transfer' : 'Enter source address' }), { optional: true }) : '') +
    (dir === 'out' ? formItem(kind === 'fiat' ? 'Beneficiary name' : 'Destination address', inputHtml('bk-dep', F.depositor, { placeholder: kind === 'fiat' ? 'Who the bank paid, if shown' : 'Where it was sent, if known' }), { optional: true }) : '') +
    (dir === 'out' && kind === 'fiat' ? formItem('Payment rail', selectHtml('bk-rail', F.rail, OUT_RAILS, { placeholder: 'Select rail' }), { optional: true, tip: 'The bank network the payment went over. Only a label here: nothing is sent.' }) : '') +
    (dir === 'out' && kind === 'fiat' && hasBearer(F.rail) ? formItem('Charge bearer', selectHtml('bk-bearer', F.chargeBearer, BEARERS, { placeholder: 'Select charge bearer' }), { optional: true, tip: 'Who pays the bank charges on this payment, as the bank shows it. MEPS and TT only.' }) : '') +
    (kind === 'token' ? formItem('Network fee', inputHtml('bk-netfee', F.netFee, { placeholder: 'Enter network fee' }), { optional: true, tip: 'Only when the fee was paid in the same transfer. A fee paid separately is booked on its own.' }) : '') +
    formItem('Internal note', textareaHtml('bk-note', F.note, { placeholder: 'Enter internal note' }), { optional: true }) +
    '<div class="form-actions">' + btn('Exit', 'bkExit', null, '') + btn('Submit', 'bkSubmit', null, 'btn-primary') + '</div></div>';
  }
  return {
    title: 'Book ' + word + ' Movement', crumbs: ['Dashboard', 'Movement Management', word + ' Movement', kind === 'token' ? 'Token' : 'Fiat', 'Book'], buttons: '', html: h,
    bind(root) {
      const on = (id, ev, fn) => { const el = root.querySelector('#' + id); if (el) el.addEventListener(ev, fn); };
      const set = (id, key, structural) => { const el = root.querySelector('#' + id); on(id, structural || (el && el.tagName === 'SELECT') ? 'change' : 'input', (ev) => { F[key] = ev.target.value; if (structural) rerender(); }); };
      root.querySelectorAll('input[name="bk-type"]').forEach(r => r.addEventListener('change', (ev) => { const nk = ev.target.value; if (nk === F.kind) return; BK = Object.assign(bkNew(dir, nk), { amount: F.amount, at: F.at, note: F.note }); go('#/movement-management/' + (dir === 'in' ? 'incoming' : 'outgoing') + '-movement/' + nk + '/create'); }));
      set('bk-venue', 'venueId', true); on('bk-venue', 'change', () => { if (F.asset && !(venueOf(F.venueId).assets || []).includes(F.asset)) F.asset = ''; rerender(); });
      set('bk-asset', 'asset', true); set('bk-amount', 'amount'); set('bk-at', 'at'); set('bk-ref', 'ref'); set('bk-dep', 'depositor'); set('bk-note', 'note'); set('bk-rail', 'rail', true); set('bk-bearer', 'chargeBearer'); set('bk-netfee', 'netFee'); set('bk-acct', 'depAcct'); set('bk-bank', 'depBank'); set('bk-van', 'van'); set('bk-sref', 'senderRef'); set('bk-chan', 'channel');
    }
  };
}
ACT.bkExit = () => { const b = BK; BK = null; go('#/movement-management/' + (b && b.dir === 'in' ? 'incoming' : 'outgoing') + '-movement/' + (b ? b.kind : 'token')); };
ACT.bkSubmit = () => {
  const F = BK; const form = Object.assign({}, F); delete form.errors;
  const errs = validateBooking(F.dir, form);
  F.errors = {}; errs.forEach(x => { if (!F.errors[x.field]) F.errors[x.field] = x.message; });
  if (errs.length) { rerender(); return; }
  rerender();
  const word = F.dir === 'in' ? 'incoming' : 'outgoing';
  if (F.dir === 'in') {
    const r = newRequest('book_movement', CUR, { dir: F.dir, form }, '');
    const base = '#/movement-management/incoming-movement/' + F.kind; BK = null;
    toast({ title: 'Incoming Movement Submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + r.id) } });
    go(base); return;
  }
  openModal({
    title: 'Review ' + word + ' movement', sub: 'Check what will happen before you submit.', wide: true,
    body: '<div class="rv-sum"><div class="rv-h">What this booking does</div><p style="margin:0 0 12px">' + esc(effectText(F.dir, form)) + '</p></div>' +
      dl([['Type', F.kind === 'fiat' ? 'Fiat' : 'Token'], ['Venue', esc((venueOf(F.venueId) || {}).name)], ['Amount', esc(amtTxt(+F.amount, F.asset))], ['Reference', esc(F.ref)], ['Transacted at', esc(String(F.at).replace('T', ' '))], ['Internal note', esc(F.note || '-')]]).replace('class="dl"', 'class="dl" style="grid-template-columns:1fr 1fr"') +
      '<div class="alert info" style="margin-top:12px"><div><b>What happens next.</b> Another operator must approve this booking. The movement then shows as Unclassified, and an operator classifies it in a separate step (which also needs a second operator).</div></div>' +
      '<div class="form-item" style="margin-top:16px"><label>Comment <span class="opt">(Optional)</span></label><textarea class="textarea" id="rv-comment"></textarea></div>',
    okText: 'Confirm and submit for approval',
    onOk(m) {
      const r = newRequest('book_movement', CUR, { dir: F.dir, form }, m.querySelector('#rv-comment').value);
      const base = '#/movement-management/' + word + '-movement/' + F.kind; BK = null;
      toast({ title: 'Movement submitted', desc: 'Awaiting approval by another operator. Nothing has changed yet.', button: { label: 'View Details', onClick: () => go('#/approvals/' + r.id) } });
      go(base);
    }
  });
};

function movementRoute(p) {
  const dir = p[1] === 'incoming-movement' ? 'in' : p[1] === 'outgoing-movement' ? 'out' : null;
  if (!dir) return null;
  if (p[2] === 'token' || p[2] === 'fiat') return p[3] === 'create' ? bookView(dir, p[2]) : mvListView(dir, p[2]);
  if (p[2]) return mvDetailView(p[2]);
  location.replace('#/movement-management/' + p[1] + '/token'); return null;
}

/* ---------- balances extras: statement lines, custodian ledger, ledger entries */
function balancesMore() {
  const mine = S.movs.filter(m => m.source === 'manual' && m.tied && m.accountId && m.status === 'confirmed' && (isOp() || myAccts().includes(m.accountId)));
  let h = '<h3 style="margin:24px 0 8px">Statement lines from manual bookings</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Account</th><th>Description</th><th>Amount</th></tr></thead><tbody>' +
    (mine.length ? mine.map(m => '<tr><td>' + esc(m.at || '-') + '</td><td>' + acctLabel(m.accountId) + '</td><td>' + (isOp() ? '<a href="' + mvHref(m) + '">' + esc(m.id) + '</a> · ' : '') + esc(clsText(m)) + (m.note ? '<div class="sub">' + esc(m.note) + '</div>' : '') + '</td><td class="mono ' + (m.dir === 'out' ? 'dir-d' : 'dir-r') + '">' + (m.dir === 'out' ? '-' : '+') + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</td></tr>').join('') : '<tr><td colspan="4"><div class="empty">No manual bookings affect these accounts.</div></td></tr>') +
    '</tbody></table></div><div class="note" style="margin-top:8px">These lines appear on the account\'s monthly statement. Bookings that are not tied to an account never appear on a statement.</div>';
  if (isOp()) {
    const cust = [];
    Object.keys(S.custodian.income).forEach(a => { if (S.custodian.income[a]) cust.push(['Custodian income', a, S.custodian.income[a]]); });
    Object.keys(S.custodian.expense).forEach(a => { if (S.custodian.expense[a]) cust.push(['Custodian expense', a, S.custodian.expense[a]]); });
    h += '<h3 style="margin:24px 0 8px">Custodian ledger</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ledger</th><th>Asset</th><th>Amount</th></tr></thead><tbody>' + (cust.length ? cust.map(c => '<tr><td>' + c[0] + '</td><td>' + c[1] + '</td><td class="mono">' + fmtAmt(c[2], c[1]) + '</td></tr>').join('') : '<tr><td colspan="3"><div class="empty">Empty</div></td></tr>') + '</tbody></table></div>';
    const posts = S.posts.filter(p => p.movId).slice(-12).reverse();
    h += '<h3 style="margin:24px 0 8px">Recent ledger entries from movements</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Movement</th><th>Debit</th><th>Credit</th><th>Amount</th><th>Event</th><th>Value date</th></tr></thead><tbody>' + (posts.length ? posts.map(p => { const mv = mvById(p.movId); return '<tr><td>' + (mv ? '<a href="' + mvHref(mv) + '">' + esc(p.movId) + '</a>' : esc(p.movId)) + '</td><td><span class="dir-d">DR</span> ' + esc(p.dr) + '</td><td><span class="dir-r">CR</span> ' + esc(p.cr) + '</td><td class="mono">' + esc(amtTxt(p.amount, p.asset)) + '</td><td>' + esc(p.event) + '</td><td>' + esc(p.valueDate) + '</td></tr>'; }).join('') : '<tr><td colspan="6"><div class="empty">None</div></td></tr>') + '</tbody></table></div>';
  }
  return h;
}

/* ===== bundle tail: integration with the shell ===== */
const rerender = () => Shell.render();
const forbidden = () => ({ title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty"><div class="big">FORBIDDEN</div>You do not have access to this page.</div>' });
function resolveView() {
  const p = ROUTE.parts;
  if (p[0] === 'si') {
    if (p[1] === 'create') return canCreate() ? createView() : forbidden();
    return p[1] ? detailView(ROUTE, p[1]) : listView(ROUTE);
  }
  if (p[0] === 'movement-management') return isOp() ? movementRoute(p) : forbidden();
  if (p[0] === 'exceptions') return isOp() ? exceptionsView() : forbidden();
  if (p[0] === 'balances') return balancesView();
  if (p[0] === 'demo') return isOp() ? demoView() : forbidden();
  return null;
}
/* Events */
let debounceT = null;
const app = document.getElementById('app');

app.addEventListener('click', (e) => {
  if (Shell.active !== 'si') return;
  const msBtn = e.target.closest('[data-ms]');
  if (msBtn) { const id = msBtn.dataset.ms; UI.ms = UI.ms === id ? null : id; render(); return; }
  if (!e.target.closest('[data-ms-root]') && UI.ms) { UI.ms = null; render(); }
  const act = e.target.closest('[data-act]');
  if (act && !act.disabled) { const fn = ACT[act.dataset.act]; if (fn) { fn(act, e); return; } }
  const row = e.target.closest('[data-href]');
  if (row) { go(row.dataset.href); return; }
  const g = e.target.closest('[data-href-go]');
  if (g) go(g.dataset.hrefGo);
});

app.addEventListener('change', (e) => {
  if (Shell.active !== 'si') return;
  const t = e.target;
  if (t.dataset.actChange && ACT[t.dataset.actChange]) { ACT[t.dataset.actChange](t, e); return; }
  if (t.dataset.lf && t.type !== 'text') { ACT.legFilter(t); return; }
  if (t.dataset.listSel) { setList({ [t.dataset.listSel]: t.value, page: 1 }); return; }
  if (t.dataset.msOpt) {
    const id = t.dataset.msOpt;
    const vals = [...app.querySelectorAll('[data-ms-opt="' + id + '"]')].filter(x => x.checked).map(x => x.value);
    setList({ [id]: vals, page: 1 });
  }
});

app.addEventListener('input', (e) => {
  if (Shell.active !== 'si') return;
  const t = e.target;
  if (t.dataset.lf && t.type === 'text') { ACT.legFilter(t); return; }
  if (t.dataset.listText) {
    clearTimeout(debounceT);
    debounceT = setTimeout(() => setList({ [t.dataset.listText]: t.value, page: 1 }), 500);
  }
});

app.addEventListener('contextmenu', (e) => {
  if (Shell.active !== 'si') return;
  const row = e.target.closest('[data-href]');
  if (row) { e.preventDefault(); window.open(location.href.split('#')[0] + row.dataset.href, '_blank'); }
});


function obligationsFor(cpId) {
  const out = [];
  S.sis.forEach(si => si.obs.forEach(o => {
    if (o.cpId !== cpId || o.status === 'cancelled') return;
    out.push({ id: o.id, account: acctName(o.accountId), cpId, settlement: si.id, direction: o.dir === 'deliver' ? 'Deliver' : 'Receive', amount: o.amount == null ? 'not known yet' : fmtAmt(o.amount, o.asset), asset: o.asset, due: o.date, overdue: isOverdue(o), status: o.status === 'settled' ? 'settled' : 'open' });
  }));
  return out;
}
function movementsFor(cpId) {
  return S.movs.filter(m => m.cpId === cpId).map(m => {
    const link = (m.links && m.links[0]) || null; const f = link ? findOb(link.obId) : null;
    return { id: m.id, cpId: m.cpId, dir: m.dir, amount: fmtAmt(m.amount, m.asset), asset: m.asset, status: m.status, exec: m.exec || '', classification: m.dir === 'in' ? (m.classification === 'unclassified' || !f ? 'unclassified' : 'settlement') : undefined, settlement: f ? f.si.id : '', via: m.via || '-', ref: m.ref || '-', at: m.at || '' };
  });
}
window.SIApp = {
  name: 'si',
  setUser(u) { CUR = u; }, setRoute(r) { ROUTE = r; }, resolveView, resetUi() { CR = null; BK = null; }, closeOverlays: closeAllOverlays,
  load() { loadState(); saveState(); }, reset() { resetState(); CR = null; BK = null; },
  today: () => S.today, advance(n) { advanceDay(n); },
  obligationsFor, movementsFor,
  hasRequest: (id) => S.reqs.some(r => r.id === id),
  requestRows: () => S.reqs.map(r => ({ id: r.id, title: reqTitle(r), subject: reqSubject2(r), maker: userById(r.makerId).name, createdAt: r.createdAt, status: r.status })),
  requestDetail: requestDetailView,
  pendingCount: () => S.reqs.filter(r => r.status === 'pending').length,
  exCount: () => exCount()
};

})();
