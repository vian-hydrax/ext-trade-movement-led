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


/* Form building blocks */
function formItem(label, control, o) {
  o = o || {};
  return '<div class="form-item"' + (o.id ? ' id="fi-' + o.id + '"' : '') + '><label>' +
    (o.required ? '<span class="req">*</span>' : '') + esc(label) +
    (o.optional ? '<span class="opt">(Optional)</span>' : '') +
    (o.tip ? '<span class="tip" tabindex="0" data-tip="' + esc(o.tip) + '">?</span>' : '') +
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



/* Descriptions list: items = [[label, valueHtml]] */
function dl(items) {
  return '<div class="dl">' + items.map(i => '<div class="item"><div class="k">' + esc(i[0]) + '</div><div class="v">' + i[1] + '</div></div>').join('') + '</div>';
}

/* Multi select (filters). Opened state held in UI.ms */
const UI = { ms: null };


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
  { id: 'v2', name: 'Token Venue W', kind: 'hot_wallet', assets: ['BTC'], chain: 'Bitcoin', address: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d' },
  { id: 'v3', name: 'Bank Venue X', kind: 'fiat', account: '0456-778899-002', assets: ['SGD'] },
  { id: 'v5', name: 'Token Venue Z', kind: 'hot_wallet', assets: ['UNIT', 'TOKEN'], chain: 'Ethereum', address: '0x9a7c0e1b07a11e70c5d3b8f2a64c1e9d' },
  { id: 'v4', name: 'Cold Wallet Y', kind: 'cold_wallet', assets: ['BTC'], chain: 'Bitcoin', address: 'bc1qcold0y7storage2k9m4n6p8r3t5v7x' }
];
const VKIND = { fiat: 'Fiat venue (bank account)', hot_wallet: 'Hot wallet', cold_wallet: 'Cold wallet' };



const STORE_KEY = 'mlo-si-v13';
let S = null;

const r8 = (x) => Math.round(x * 1e8) / 1e8;
const nowIso = () => new Date().toISOString();
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };


const acct = (id) => ACCOUNTS.find(a => a.id === id);
const userById = (id) => USERS.find(u => u.id === id) || { name: 'System', id };


const mvById = (id) => S.movs.find(m => m.id === id);
/* Related transaction: a typed ID counts as a real link when it is a movement ID or the withdrawal/rebalance ID of an instruction-led movement */
const resolveRel = (t) => { const q = String(t || '').trim().toUpperCase(); return q ? (S.movs.find(x => x.id.toUpperCase() === q) || S.movs.find(x => x.transactionId && String(x.transactionId).toUpperCase() === q) || S.movs.find(x => x.source === 'deposit' && x.relatedTx && String(x.relatedTx).toUpperCase() === q) || null) : null; };
/* Options for the Related transaction selector: movements, and the withdrawal, rebalance or deposit ID they carry */
const chainOfMov = (m) => m.chain || (venueOf(m.venueId) || {}).chain || chainOf(m.asset) || '';
/* Same type as the movement being classified; for token, the same blockchain too */
const relFits = (x, self) => mvKind(x.asset) === mvKind(self.asset) && (mvKind(self.asset) !== 'token' || chainOfMov(x) === chainOfMov(self));
const relOptions = (self) => { const o = []; S.movs.forEach(x => { if (x.id === self.id || !relFits(x, self)) return; const amt = amtTxt(x.amount, x.asset); const wd = x.classification === 'withdrawal' || x.classification === 'rebalance'; if (x.transactionId) o.push({ key: x.transactionId, first: 0, label: x.transactionId + ' · Withdrawal · movement ' + x.id + ' · ' + amt }); if (x.source === 'deposit' && x.relatedTx) o.push({ key: x.relatedTx, first: 1, label: x.relatedTx + ' · Deposit · movement ' + x.id + ' · ' + amt }); o.push({ key: x.id, first: wd ? 0 : 2, label: x.id + ' · ' + (x.dir === 'in' ? 'Incoming' : 'Outgoing') + ' · ' + clsText(x) + ' · ' + amt }); }); return o.sort((p, q) => p.first - q.first || p.key.localeCompare(q.key)); };
const relCell = (m) => { const t = resolveRel(m.relatedTx); return t ? '<a href="' + mvHref(t) + '">' + esc(m.relatedTx) + '</a><div class="sub">Linked to ' + esc(t.id) + (t.transactionId ? ' (' + esc(t.transactionId) + ')' : '') + '</div>' : esc(m.relatedTx) + '<div class="sub">Not found in the system: saved as text</div>'; };
const linkedMovCard = (m) => { const l = S.movs.filter(x => x !== m && x.source === 'manual' && x.relatedTx && resolveRel(x.relatedTx) === m); return l.length ? '<div class="card"><div class="card-head">Linked movements</div><div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Movement</th><th>Direction</th><th>Classification</th><th>Amount</th><th>Origin</th></tr></thead><tbody>' + l.map(x => '<tr><td><a href="' + mvHref(x) + '">' + esc(x.id) + '</a></td><td>' + (x.dir === 'in' ? 'Incoming' : 'Outgoing') + '</td><td>' + esc(clsText(x)) + '</td><td class="mono">' + esc(amtTxt(x.amount, x.asset)) + '</td><td>' + tag('Booked by hand', 'gold') + '</td></tr>').join('') + '</tbody></table></div></div></div>' : ''; };
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


/* ---------------------------------------------------------------- seed reference data */
function baseState() {
  const s = {
    today: new Date().toISOString().slice(0, 10), seq: { si: 1000, ob: 0, mv: 3000, pst: 0, req: 0, audit: 0, leg: 0 },
    bal: {}, vbal: {}, unclassifiedIn: {}, unclassifiedOut: {}, custodianCost: {}, movs: [], posts: [], reqs: [], audit: []
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
  s.vbal['v1|SGD'] = { total: 2000000, reserved: 1500 }; s.vbal['v1|USD'] = { total: 1000000, reserved: 800 };
  s.vbal['v3|SGD'] = { total: 300000, reserved: 0 }; s.vbal['v4|BTC'] = { total: 5, reserved: 0 };
  s.vbal['v2|BTC'] = { total: 10, reserved: 0.03 }; s.vbal['v5|UNIT'] = { total: 5000, reserved: 0 }; s.vbal['v5|TOKEN'] = { total: 1000, reserved: 0 };
  return attachShared(s);
}
function attachShared(s) {
  return s;
}

function addAudit(siId, event, userId, detail) {
  S.audit.unshift({ id: 'a' + nextId('audit'), siId, event, userId, time: nowIso(), detail: detail || '' });
}

/* ---------------------------------------------------------------- obligations (FR-5) */


/* ---------------------------------------------------------------- funding (FR-7, FR-19) */








/* ---------------------------------------------------------------- validation (FR-4) */


/* Preview (FR-19). Uses draft legs; returns rows per account the user can see. */


/* ---------------------------------------------------------------- instruction lifecycle */









/* ---------------------------------------------------------------- execution (FR-9) */








function advanceDay(n) {
  for (let i = 0; i < (n || 1); i++) S.today = addDays(S.today, 1);
  saveState();
}

/* ---------------------------------------------------------------- external obligations (FR-10 to FR-14) */















/* ---------------------------------------------------------------- maker-checker requests */
function newRequest(type, user, payload, comment) {
  const r = { id: 'R-' + nextId('req'), type, makerId: user.id, payload, comment: comment || '', status: 'pending', createdAt: nowIso() };
  S.reqs.unshift(r);
  if (type === 'book_movement' || type === 'classify') {
    const mv = payload.movId ? mvById(payload.movId) : null; const dir = type === 'book_movement' ? payload.dir : (mv ? mv.dir : 'in');
    addAudit(mv ? 'MV-' + mv.id : 'REQ-' + r.id, (dir === 'in' ? 'incoming' : 'outgoing') + '_movement:' + (type === 'book_movement' ? 'create' : 'classify') + '_request', user.id, r.id);
  }
  saveState(); return r;
}
function approveRequest(user, req) {
  if (req.status !== 'pending') return fail('INVALID_RECORD_STATE', 'This request is not awaiting approval.');
  if (req.makerId === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The maker cannot approve their own request.');
  if (req.type === 'classify') {
    const r2 = applyClassifyRequest(user, req); if (!r2.ok) return r2;
  } else if (req.type === 'book_movement') {
    const r2 = applyBookRequest(user, req); if (!r2.ok) return r2;
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


/* ---------------------------------------------------------------- persistence and seeding */
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
function loadState() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { S = attachShared(JSON.parse(raw)); return; } } catch (e) { /* ignore */ }
  seedDemo();
}
function resetState() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } seedDemo(); }

function seedDemo() {
  S = baseState();
  
  const alice = USERS[0], bob = USERS[1];
  const leg = (from, to, assetId, amount, date, o) => Object.assign({ from, to, assetId, amount, fixed: amount != null, date, seq: 0, extRef: '', remarks: '' }, o || {});
  const A = (id) => ({ type: 'account', id });
  

  // 6. Movements that no instruction created
  const ago = (days, hh) => { const x = new Date(Date.now() - days * 86400000); x.setHours(hh, 0, 0, 0); if (x > new Date()) x.setTime(Date.now() - 60000); return localDT(x); };
  const bookNow = (dir, d, maker) => { const r = applyBook(maker || bob, alice, dir, d); if (!r.ok) throw new Error(r.message); return r.mv; };
  const classNow = (mv, d) => { const r = applyClassification(alice, mv, d); if (!r.ok) throw new Error(r.message); };
  const seedIncoming = (d, accountId) => {
    const venue = venueOf(d.venueId); const m = { id: 'IM-' + nextId('mv'), dir: 'in', status: accountId ? 'confirmed' : 'detected', classification: accountId ? 'deposit' : 'unclassified', source: accountId ? 'deposit' : 'manual', bookedBy: accountId ? '' : 'u2', kind: mvKind(d.asset), chain: mvKind(d.asset) === 'token' ? (venue.chain || '') : '', dstAddr: mvKind(d.asset) === 'token' ? (venue.address || '') : '', amount: d.amount, asset: d.asset, venueId: d.venueId, via: d.depositor, depositor: d.depositor, ref: d.ref, at: String(d.at).slice(0, 10), atFull: d.at, links: [], created: nowIso(), tied: !!accountId, accountId: accountId || null, note: '', explanation: '', relatedTx: d.relatedTx || '', chargeType: '' };
    VB(d.venueId, d.asset).total = r8(VB(d.venueId, d.asset).total + d.amount);
    S.movs.unshift(m);
    postEffect(venue.name + ' rises; ' + (accountId ? acct(accountId).name + ' balance rises' : 'unclassified incoming rises'), d.amount, d.asset, m.id + (accountId ? ' deposit' : ' arrived, unclassified'), m.id);
    if (accountId) B(accountId, d.asset).total = r8(B(accountId, d.asset).total + d.amount);
    else S.unclassifiedIn[d.asset] = r8((S.unclassifiedIn[d.asset] || 0) + d.amount);
    return m;
  };
  seedIncoming({ venueId: 'v1', asset: 'SGD', amount: 5000, at: ago(3, 10), ref: 'BANK-REF-1001', depositor: 'Acme Capital Pte Ltd', relatedTx: 'DEP-1001' }, 'a2');
  classNow(bookNow('out', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 25, at: ago(2, 9), ref: 'DBS-FEE-0930' }), { classification: 'venue_charges', chargeType: 'bank_charge', tied: false, note: 'Monthly account maintenance fee' });
  classNow(bookNow('out', { kind: 'token', venueId: 'v2', asset: 'BTC', amount: 0.00012, at: ago(1, 10), ref: 'TX-FEE-8800', depositor: 'bc1qminer0fee0payee5addr8z', netFee: '' }), { classification: 'venue_charges', chargeType: 'network_fee', tied: false, relatedTx: 'WD-2042', note: 'Fee paid from the hot wallet, separate from the transfer' });
  bookNow('out', { kind: 'token', venueId: 'v2', asset: 'BTC', amount: 0.0002, at: ago(0, 8), ref: 'TX-OUT-5c1e9a7d03b4', netFee: '' });
  classNow(bookNow('out', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 12.5, at: ago(2, 11), ref: 'DBS-FEE-0931', rail: 'tt', chargeBearer: 'DEBT', chargeBearerAcct: 'v1' }), { classification: 'venue_charges', chargeType: 'bank_charge', tied: true, accountId: 'a1', relatedTx: 'DEP-1001', note: 'Incoming TT fee on deposit DEP-1001' });
  seedIncoming({ venueId: 'v1', asset: 'USD', amount: 200, at: ago(1, 15), ref: 'BANK-REF-2002', depositor: 'Unknown remitter' });
  bookNow('out', { kind: 'fiat', venueId: 'v1', asset: 'SGD', amount: 8, at: ago(0, 8), ref: 'DBS-FEE-0932' });
  const wd = { id: 'OM-' + nextId('mv'), dir: 'out', status: 'confirmed', exec: 'settled', execMethod: 'automated', classification: 'withdrawal', source: 'instruction', rail: 'meps', chargeBearer: 'DEBT', chargeBearerAcct: 'v1', kind: 'fiat', accountId: 'a2', tied: true, amount: 2000, asset: 'SGD', venueId: 'v1', via: 'Acme DBS SGD', ref: 'DBS-WD-4410', at: S.today, atFull: ago(0, 9), links: [], relatedTx: '', transactionId: 'WD-2041', payRef: 'PAY-2041', chargeBearerAcct: 'v1', bank: { id: 'WBA-7781', number: '0123456789', beneficiary: 'Acme Treasury Pte Ltd', swift: 'DBSSSGSG', country: 'Singapore' }, created: nowIso() };
  VB('v1', 'SGD').total = r8(VB('v1', 'SGD').total - 2000); B('a2', 'SGD').total = r8(B('a2', 'SGD').total - 2000); S.movs.unshift(wd);
  postEffect('Acme Treasury balance falls; Bank Venue V falls', 2000, 'SGD', wd.id + ' withdrawal', wd.id);
  const twd = { id: 'OM-' + nextId('mv'), dir: 'out', status: 'confirmed', exec: 'settled', execMethod: 'automated', classification: 'withdrawal', source: 'instruction', kind: 'token', accountId: 'a1', tied: true, amount: 0.05, asset: 'BTC', venueId: 'v2', via: 'bc1q9whitelisted0client7addr3x', ref: '9f2c41a7e0b35d8c64f1a2907be3d5c8', at: S.today, atFull: ago(0, 10), links: [], relatedTx: '', transactionId: 'WD-2042', chain: 'Bitcoin', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: 'bc1q9whitelisted0client7addr3x', netFee: '0.00004', totalReceived: '0.04996', wlAddr: 'WA-3320', kyt: 'Passed', kytRemarks: 'No risk found', created: nowIso() };
  VB('v2', 'BTC').total = r8(VB('v2', 'BTC').total - 0.05); B('a1', 'BTC').total = r8(B('a1', 'BTC').total - 0.05); S.movs.unshift(twd);
  postEffect('Acme Main Account balance falls; Token Venue W falls', 0.05, 'BTC', twd.id + ' withdrawal', twd.id);
  const inflight = (o) => { const m = Object.assign({ id: 'OM-' + nextId('mv'), dir: 'out', classification: 'withdrawal', source: 'instruction', tied: true, links: [], relatedTx: '', at: S.today, created: nowIso() }, o); m.atFull = m.atFull || ago(0, 11); S.movs.unshift(m); return m; };
  const bk = { id: 'WBA-7781', number: '0123456789', beneficiary: 'Acme Treasury Pte Ltd', swift: 'DBSSSGSG', country: 'Singapore' };
  inflight({ kind: 'fiat', status: 'pending', exec: '', execMethod: 'manual', fallback: 'No rail accepts this amount', rail: 'meps', chargeBearer: 'DEBT', chargeBearerAcct: 'v1', accountId: 'a2', amount: 1500, asset: 'SGD', venueId: 'v1', via: 'Acme DBS SGD', ref: '', transactionId: 'WD-2043', bank: bk });
  inflight({ kind: 'fiat', status: 'submitted', exec: 'processing', execMethod: 'automated', rail: 'tt', chargeBearer: 'DEBT', chargeBearerAcct: 'v1', accountId: 'a1', amount: 800, asset: 'USD', venueId: 'v1', via: 'Acme DBS USD', ref: 'DBS-WD-4412', payRef: 'PAY-2044', transactionId: 'WD-2044', bank: Object.assign({}, bk, { id: 'WBA-7790', number: '0987654321', beneficiary: 'Acme Capital Pte Ltd' }) });
  inflight({ kind: 'fiat', status: 'failed', exec: 'rejected', execMethod: 'automated', rail: 'fast_paynow', accountId: 'a2', amount: 600, asset: 'SGD', venueId: 'v1', via: 'Acme DBS SGD', ref: 'DBS-WD-4398', payRef: 'PAY-2039', failure: 'Beneficiary account is closed', transactionId: 'WD-2039', bank: bk });
  const wl = 'bc1q9whitelisted0client7addr3x';
  inflight({ kind: 'token', status: 'pending', exec: '', execMethod: 'automated', accountId: 'a1', amount: 0.02, asset: 'BTC', venueId: 'v2', via: wl, ref: '', transactionId: 'WD-2045', chain: 'Bitcoin', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: wl, wlAddr: 'WA-3320', kyt: 'Pending', kytRemarks: 'Wallet analysis in progress' });
  inflight({ kind: 'token', status: 'submitted', exec: 'processing', execMethod: 'automated', accountId: 'a1', amount: 0.01, asset: 'BTC', venueId: 'v2', via: wl, ref: '4be71c09a2d85f3e6170b9c4d2a8e5f1', transactionId: 'WD-2046', chain: 'Bitcoin', srcAddr: 'bc1qw8venue0hot7wallet4h3t9x2m5k6d', dstAddr: wl, netFee: '0.00003', wlAddr: 'WA-3320', kyt: 'Passed', kytRemarks: 'No risk found' });
  inflight({ kind: 'token', status: 'failed', exec: 'rejected', execMethod: 'automated', accountId: 'a3', amount: 100, asset: 'TOKEN', venueId: 'v5', via: '0x71c0ffee0badaddr5risk9hi', ref: '', transactionId: 'WD-2040', chain: 'Ethereum', srcAddr: '0x9a7c0e1b07a11e70c5d3b8f2a64c1e9d', dstAddr: '0x71c0ffee0badaddr5risk9hi', wlAddr: 'WA-3411', kyt: 'Failed', kytRemarks: 'High risk address', failure: 'Failed the KYT check' });
  seedIncoming({ venueId: 'v2', asset: 'BTC', amount: 0.01, at: ago(1, 12), ref: 'TX-IN-7731c0a9e4b2', depositor: 'bc1qunknown0sender8addr5x2m' });
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






Object.assign(BADGE, { rejected: 'error', failed: 'error', pending: 'default', confirmed: 'success', approved: 'success', submitted: 'processing', detected: 'processing', refunded: 'default' });

const acctLabel = (id) => { const a = acct(id); return a ? esc(a.name) + '<div class="sub">' + esc(a.number) + '</div>' : '-'; };
const acctName = (id) => (acct(id) || { name: id }).name;
const amtTxt = (n, asset) => fmtAmt(n, asset) + ' ' + asset;













/* ======================================================= LIST */
function listDefaults() { return { id: '', account: '', cp: '', statuses: [], from: '', to: '', ext: '', overdue: false, page: 1, size: 10 }; }
const listQuery = (route) => Object.assign(listDefaults(), b64d(route.query.q || '') || {});
const setList = (patch) => go('#' + ROUTE.path + '?q=' + b64e(Object.assign(listQuery(ROUTE), patch)));



function btn(label, act, arg, cls, o) {
  o = o || {};
  return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + (o.disabled ? ' disabled' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + esc(label) + '</button>';
}







/* ======================================================= CREATE */
let CR = null;






/* Funding preview (FR-19): plain-language status per account, schedule behind a link */
const PVOPEN = new Set();
document.addEventListener('toggle', (e) => { const k = e.target && e.target.dataset && e.target.dataset.pv; if (k) { if (e.target.open) PVOPEN.add(k); else PVOPEN.delete(k); } }, true);





/* Legs table: grouped by date, collapsible groups, filters when there are many legs */

const lf = () => { CR.lf = CR.lf || { q: '', date: '', ext: false, problems: false }; CR.open = CR.open || {}; return CR.lf; };
ACT.legFilter = (el) => { lf()[el.dataset.lf] = el.type === 'checkbox' ? el.checked : el.value; rerender(); };















/* Views part 2: detail, actions, exceptions, maker-checker, balances, demo controls */











function reasonModal(o) {
  return openModal({
    title: o.title, sub: o.sub, okText: o.okText, okDanger: o.danger, body: (o.info || '') + '<div class="form-item"><label><span class="req">*</span>' + esc(o.label) + '</label><textarea class="textarea" id="rs-text"></textarea></div>',
    onMount(m) { const ok = m.querySelector('[data-m="ok"]'); ok.disabled = true; m.querySelector('#rs-text').addEventListener('input', (e) => { ok.disabled = !e.target.value.trim(); }); },
    onOk(m) { return o.onOk(m.querySelector('#rs-text').value.trim()); }
  });
}
const done = (res, okTitle, okDesc) => { if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; } toast({ title: okTitle, desc: okDesc }); rerender(); return true; };

/* ======================================================= DETAIL (FR-17) */










/* ======================================================= ACTIONS */












ACT.classify = (el) => { const mv = mvById(el.dataset.arg); const pend = pendReqFor(mv); if (pend) { go('#/approvals/' + pend.id); return; } openClassifyModal(mv); };

/* ======================================================= EXCEPTIONS (FR-18) */




/* ======================================================= MAKER-CHECKER */


function reqTitle(r) {
  const mv = r.payload && r.payload.movId ? mvById(r.payload.movId) : null;
  const dirIn = r.type === 'book_movement' ? r.payload.dir === 'in' : !!(mv && mv.dir === 'in');
  return (r.type === 'book_movement' ? 'Book ' : 'Classify ') + (dirIn ? 'incoming' : 'outgoing') + ' movement';
}

function requestDetailView(id) {
  const r = S.reqs.find(x => x.id === id);
  if (!r) return { title: 'Not found', crumbs: ['Dashboard', 'Approval', 'Maker Checker'], buttons: '', html: '<div class="empty">Request not found. <a href="#/approvals">Back</a></div>' };
  const mine = r.makerId === CUR.id; const canDecide = r.status === 'pending' && !mine;
  let html = '';
  if (r.status === 'pending' && mine) html += '<div class="alert info">You submitted this request. A different operator must decide it.</div>';
  if (r.status === 'approved') html += '<div class="alert success">Approved by ' + esc(userById(r.decidedBy).name) + '.' + (r.movId && mvById(r.movId) ? ' <a href="' + mvHref(mvById(r.movId)) + '">Open ' + esc(r.movId) + '</a>' : '') + '</div>';
  if (r.status === 'rejected') html += '<div class="alert error">Rejected by ' + esc(userById(r.decidedBy).name) + '. Reason: ' + esc(r.reason || '') + '</div>';
  html += '<div class="card"><div class="card-head">Request</div><div class="card-body">' + dl([['Request ID', esc(r.id)], ['Status', badge(r.status, { pending: 'Awaiting Approval' })], ['Type', esc(reqTitle(r))], ['Maker', esc(userById(r.makerId).name)], ['Submitted', dateCell(r.createdAt)], ['Maker comment', esc(r.comment || '-')]]) + '</div></div>';
  html += requestExtraHtml(r);
  return { title: reqTitle(r), sub: badge(r.status, { pending: 'Awaiting Approval' }), crumbs: ['Dashboard', 'Approval', 'Maker Checker', r.id], buttons: canDecide ? btn('Reject', 'rejectReq', r.id, 'btn-danger') + btn('Approve', 'approveReq', r.id, 'btn-primary') : '', html };
}
ACT.approveReq = (el) => { const r = S.reqs.find(x => x.id === el.dataset.arg); const res = approveRequest(CUR, r); if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return; } toast({ title: 'Request approved', desc: r.type === 'book_movement' ? 'The movement was booked as Unclassified. Open it to classify it.' : 'The classification was applied.', button: r.type === 'book_movement' && r.movId ? { label: 'Open movement', onClick: () => go(mvHref(mvById(r.movId))) } : undefined }); rerender(); };
ACT.rejectReq = (el) => { const r = S.reqs.find(x => x.id === el.dataset.arg); reasonModal({ title: 'Reject request', label: 'Reason', okText: 'Reject', danger: true, onOk: (reason) => done(rejectRequest(CUR, r, reason), 'Request rejected') }); };

/* ======================================================= BALANCES */
function balancesView() {
  const accs = ACCOUNTS.filter(a => myAccts().includes(a.id));
  const rows = accs.flatMap(a => Object.keys(S.bal[a.id] || {}).map(asset => ({ a, asset, b: S.bal[a.id][asset] })));
  const body = rows.map(({ a, asset, b }) => {
    const av = r8(b.total - b.reserved);
    return '<tr><td>' + acctLabel(a.id) + (a.mayOverCommit && av < 0 ? ' <span class="tag red">Over-committed</span>' : '') + '</td><td>' + asset + '</td><td class="mono">' + fmtAmt(b.total, asset) + '</td><td class="mono ' + (av < 0 ? 'dir-d' : '') + '">' + fmtAmt(av, asset) + '</td></tr>';
  }).join('');
  const sec = (title, desc, inner) => '<div class="bal-sec"><h3>' + title + '</h3><div class="bal-desc">' + desc + '</div>' + inner + '</div>';
  const accountsTable = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Asset</th><th>Total</th><th>Available</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  if (!isOp()) return { title: 'Account Balances', crumbs: ['Dashboard', 'Balances'], buttons: '', html: accountsTable + balancesMore() };
  const venues = sec('Venues', 'What each bank account or wallet holds. A booked movement lowers it straight away, so it matches the bank or chain.', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Venue</th><th>Type</th><th>Asset</th><th>Total</th><th>Available</th></tr></thead><tbody>' + Object.keys(S.vbal).map(k => { const [v, as] = k.split('|'); const b = S.vbal[k]; return '<tr><td>' + esc(VENUES.find(x => x.id === v).name) + '</td><td>' + esc(VKIND[VENUES.find(x => x.id === v).kind] || '') + '</td><td>' + as + '</td><td class="mono">' + fmtAmt(b.total, as) + '</td><td class="mono">' + fmtAmt(r8(b.total - b.reserved), as) + '</td></tr>'; }).join('') + '</tbody></table></div>');
  const unclassifiedSec = sec('Unclassified outgoing', 'Money that has left a venue but is not classified yet. Classify each booking to assign it. An entry older than 7 days is flagged.', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Not yet classified</th><th>Oldest unclassified</th></tr></thead><tbody>' + (Object.keys(S.unclassifiedOut || {}).filter(k => S.unclassifiedOut[k]).map(k => { const old = S.movs.filter(x => x.dir === 'out' && x.classification === 'unclassified' && x.asset === k && x.source === 'manual').map(x => x.at).sort()[0]; const days = old ? Math.max(0, Math.round((new Date(S.today) - new Date(old)) / 864e5)) : 0; return '<tr><td>' + k + '</td><td class="mono">' + fmtAmt(S.unclassifiedOut[k], k) + '</td><td>' + (old ? days + ' day' + (days === 1 ? '' : 's') + (days > 7 ? ' <span class="tag red">Over 7 days</span>' : '') : '-') + '</td></tr>'; }).join('') || '<tr><td colspan="3"><div class="empty">Nothing waiting to be classified</div></td></tr>') + '</tbody></table></div>');
  const dep = sec('Unclassified incoming', 'Money that arrived at a venue and is not classified yet, including unknown funds waiting to be sent back. A Refund (on the outgoing movement) or Others (on the incoming movement) clears it.', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Not yet classified</th></tr></thead><tbody>' + (Object.keys(S.unclassifiedIn).filter(k => S.unclassifiedIn[k]).map(k => '<tr><td>' + k + '</td><td class="mono">' + fmtAmt(S.unclassifiedIn[k], k) + '</td></tr>').join('') || '<tr><td colspan="2"><div class="empty">Empty</div></td></tr>') + '</tbody></table></div>');
  const accounts = sec('Account balances', 'Customer and house accounts. A movement charged to an account lowers its total.', accountsTable);
  return { title: 'Balances', crumbs: ['Dashboard', 'Balances'], buttons: '', html: unclassifiedSec + dep + venues + balancesMore() + accounts };
}

/* ======================================================= DEMO CONTROLS */
ACT.adv = (el) => { advanceDay(+el.dataset.arg); toast({ title: 'Date advanced', desc: 'Simulated date is now ' + S.today + '.' }); rerender(); };
function demoView() {
  return {
    title: 'Demo Controls', crumbs: ['Dashboard', 'Demo controls'], buttons: '',
    html: '<div class="card"><div class="card-head">Simulated date</div><div class="card-body"><p>Today in the demo is <b>' + S.today + '</b>. Use it to see the age of unclassified outgoing money on Balances (flagged after 7 days).</p>' + btn('Advance 1 day', 'adv', 1, 'btn-primary') + ' ' + btn('Advance 3 days', 'adv', 3, '') + ' ' + btn('Advance 8 days', 'adv', 8, '') + '</div></div>' +
      '<div class="card"><div class="card-head">What to try</div><div class="card-body"><ol style="margin:0;padding-left:18px;line-height:1.9">' +
      '<li><b>Book a bank charge (two steps):</b> as Alice open Movement Management > Outgoing Movement > Fiat > Book Outgoing Movement and enter the venue, amount and bank reference. As Bob approve it under Approvals. It now shows as Unclassified and the amount is listed under Unclassified outgoing on Balances.</li>' +
      '<li><b>Classify it:</b> as Alice press Classify, choose Venue charges and a charge type, then We pay it (company cost) or A customer account. As Bob approve it. The amount leaves Unclassified outgoing and is recorded as a company cost or lowers the client account (with a statement line).</li>' +
      '<li><b>Others:</b> classify as Others and see that Submit needs an explanation of at least 10 characters.</li>' +
      '<li><b>Refund:</b> book an outgoing movement of 200 USD at Bank Venue V, classify it as Refund and pick the unclassified incoming entry IM-3005 (BANK-REF-2002). It is cleared and shows as Refunded.</li>' +
      '<li><b>Correct a wrong booking:</b> book an incoming movement of the same amount at the same venue (Movement Management > Incoming Movement > Book Incoming Movement), approve it, then classify it as Others with an explanation that names the original movement. Charge it back to the account that was wrongly charged, or keep it as company income.</li>' +
      '<li><b>Venue goes negative:</b> book an amount larger than the venue balance. It is allowed, with a warning for the maker and the checker.</li>' +
      '<li><b>Separate network fee:</b> approve the pending BTC fee booking (R-1) as Bob, then classify it as Venue charges, Network fee.</li>' +
      '<li><b>Aging:</b> leave a booking unclassified, advance 8 days and look at Unclassified outgoing on Balances.</li>' +
      '<li><b>Two people:</b> as Alice try to approve your own request. It is refused.</li></ol></div></div>'
  };
}

/* Add New settlement instruction: template start step, then a read-only legs table with an Add / Edit Transfer Leg modal (as in the repo). */




























/* ======================================================= MOVEMENT MANAGEMENT (PRD - Manual Outgoing Movement Booking and Classification) */
const MV_CLASS = {
  out: [
    { code: 'withdrawal', label: 'Withdrawal', link: 'required', instructionLed: true },
    { code: 'rebalance', label: 'Rebalance', link: 'none', instructionLed: true },
    { code: 'settlement', label: 'Settlement', link: 'required', auto: true },
    { code: 'venue_charges', label: 'Venue charges', link: 'optional', charge: true },
    { code: 'refund', label: 'Refund', link: 'none', needsMov: true },
    { code: 'others', label: 'Others', link: 'optional', needsNote: true }
  ],
  in: [
    { code: 'deposit', label: 'Deposit', link: 'required', existing: true },
    { code: 'others', label: 'Others', link: 'optional', needsNote: true }
  ]
};
const CLS_LABEL = { unclassified: 'Unclassified', deposit: 'Deposit', settlement: 'Settlement', airdrop: 'Airdrop', interest: 'Interest', withdrawal_reversal: 'Withdrawal reversal', unknown_funds: 'Unknown funds', others: 'Others', withdrawal: 'Withdrawal', rebalance: 'Rebalance', venue_charges: 'Venue charges', refund: 'Refund' };
const OUT_RAILS = [['act', 'ACT'], ['fast_paynow', 'FAST'], ['meps', 'MEPS'], ['tt', 'TT']];
const BEARERS = [['CRED', 'Beneficiary Pays (CRED)'], ['DEBT', 'Sender Pays (DEBT)'], ['SHAR', 'Split (SHAR)']];
const railText = (r) => (OUT_RAILS.find(x => x[0] === r) || [0, r])[1];
const bearerText = (b) => (BEARERS.find(x => x[0] === b) || [0, b])[1];
const hasBearer = (r) => r === 'meps' || r === 'tt';
const hasBearerAcct = (r, b) => hasBearer(r) && (b === 'DEBT' || b === 'SHAR');
const RAIL_OPTS = [['act', 'ACT: Instant transfer between DBS accounts. No fee.'], ['fast_paynow', 'FAST: Fast transfer to local banks. Small fixed fee.'], ['meps', 'MEPS: For larger SGD transfers to local banks.'], ['tt', 'TT: Telegraphic transfer for overseas or other-currency payments.']];
const BEARER_OPTS = [['CRED', 'Beneficiary Pays (CRED): Beneficiary pays all charges.'], ['DEBT', 'Sender Pays (DEBT): Sender pays all charges from the selected charge bearer account.'], ['SHAR', "Split (SHAR): Sender pays DBS's own charges from the selected charge bearer account and beneficiary pays the agent bank's charges."]];
const CHARGE_DEFAULTS = { meps: { bearer: 'DEBT', acct: 'v1' }, tt: { bearer: 'DEBT', acct: 'v1' } };
const optDesc = (opts, v) => { const o = opts.find(x => x[0] === v); return o ? o[1].split(': ').slice(1).join(': ') : ''; };
const dbsVenues = () => VENUES.filter(v => v.kind === 'fiat');
const CHAIN = { BTC: 'Bitcoin', UNIT: 'Ethereum', TOKEN: 'Ethereum' };
const chainOf = (asset) => CHAIN[asset] || '';
const CHARGE_BY_KIND = { fiat: ['bank_charge', 'other_venue_fee'], token: ['network_fee', 'other_venue_fee'] };
const CHARGE_LABEL = { bank_charge: 'Bank charge', network_fee: 'Network fee', other_venue_fee: 'Other venue fee' };
const mvKind = (asset) => (ASSETS[asset] && ASSETS[asset].fiat ? 'fiat' : 'token');
const mvBase = (dir) => '#/movement-management/' + (dir === 'in' ? 'incoming' : 'outgoing') + '-movement';
const mvHref = (m) => mvBase(m.dir) + '/' + m.id;
const DIRWORD = (dir) => (dir === 'in' ? 'Incoming' : 'Outgoing');
const clsInfo = (dir, code) => MV_CLASS[dir].find(c => c.code === code);
const venueOf = (id) => VENUES.find(v => v.id === id);
const tiedOf = (dir, d) => { const c = clsInfo(dir, d.classification); return !c ? false : c.link === 'required' ? true : c.link === 'none' ? false : d.tied === true || d.tied === 'true'; };
const clsText = (m) => (CLS_LABEL[m.classification || 'unclassified'] || m.classification) + (m.chargeType ? ' · ' + CHARGE_LABEL[m.chargeType] : '');
function localDT(x) { const p = (n) => String(n).padStart(2, '0'); return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()) + 'T' + p(x.getHours()) + ':' + p(x.getMinutes()); }
function postEffect(effect, amount, asset, event, movId) { const mv = movId ? mvById(movId) : null; S.posts.push({ id: 'P-' + nextId('pst'), effect, amount, asset, event, at: nowIso(), valueDate: (mv && mv.at) || S.today, movId }); }

function refundProblem(mv, d, exceptReqPending) {
  const o = mvById(d.relatedMov);
  if (!o || o.dir !== 'in' || o.classification !== 'unclassified' || o.status !== 'detected' || o.refundedBy) return 'The unknown funds entry is no longer available to refund.';
  if (o.asset !== mv.asset) return 'The refund must be in the same asset as the unknown funds entry.';
  if (o.venueId !== mv.venueId) return 'The refund must be booked at the venue that received the funds (' + ((venueOf(o.venueId) || {}).name || '-') + ').';
  if (pendReqFor(o)) return 'Another request is already classifying this entry.';
  if (r8(o.amount) !== r8(mv.amount)) return 'The refund must equal the unknown funds entry amount (' + amtTxt(o.amount, o.asset) + ').';
  if (!exceptReqPending && S.reqs.some(r => r.status === 'pending' && r.type === 'classify' && r.payload && r.payload.relatedMov === d.relatedMov && r.payload.movId !== mv.id)) return 'Another request is already refunding this entry.';
  return '';
}
function validateClass(dir, d, mv) {
  const e = []; const cls = clsInfo(dir, d.classification);
  if (!cls) return [{ field: 'classification', code: 'MISSING_REQUIRED_FIELD', message: 'Choose a classification.' }];
  const tied = tiedOf(dir, d);
  if (cls.link === 'optional' && (d.tied === null || d.tied === undefined || d.tied === '')) e.push({ field: 'tied', code: 'MISSING_REQUIRED_FIELD', message: ('Choose who bears it.') });
  if (tied && !d.accountId) e.push({ field: 'accountId', code: 'MISSING_REQUIRED_FIELD', message: 'An account is required.' });
  if (cls.needsNote && String(d.note || '').trim().length < 10) e.push({ field: 'note', code: 'MISSING_REQUIRED_FIELD', message: 'An explanation of at least 10 characters is required.' });
  if (cls.charge && !d.chargeType) e.push({ field: 'chargeType', code: 'MISSING_REQUIRED_FIELD', message: 'Choose a charge type.' });
  { const rt = mv ? resolveRel(d.relatedTx) : null; if (rt && !relFits(rt, mv)) e.push({ field: 'relatedTx', code: 'INVALID_RELATED_TRANSACTION', message: mvKind(mv.asset) === 'token' ? 'The related transaction must be a token record on the same blockchain.' : 'The related transaction must be a fiat record.' }); }
  if (cls.charge && d.chargeType && mv && !CHARGE_BY_KIND[mvKind(mv.asset)].includes(d.chargeType)) e.push({ field: 'chargeType', code: 'INVALID_CHARGE_TYPE', message: 'This charge type does not apply to a ' + mvKind(mv.asset) + ' movement.' });
  if (d.chargeType === 'network_fee' && !String(d.relatedTx || '').trim()) e.push({ field: 'relatedTx', code: 'MISSING_REQUIRED_FIELD', message: 'Choose the withdrawal this network fee belongs to.' });
  if (cls.needsRelated && !String(d.relatedTx || '').trim()) e.push({ field: 'relatedTx', code: 'MISSING_REQUIRED_FIELD', message: 'Enter the related withdrawal ID.' });
  if (cls.needsMov && !d.relatedMov) e.push({ field: 'relatedMov', code: 'MISSING_REQUIRED_FIELD', message: 'Choose the unknown funds entry to refund.' });
  return e;
}
function validateBooking(dir, d) {
  const e = [];
  const need = (k, msg) => { if (d[k] === '' || d[k] == null) e.push({ field: k, code: 'MISSING_REQUIRED_FIELD', message: msg }); };
  if (d.kind === 'token' && dir === 'out' && !d.venueId) need('chain', 'Choose a blockchain.');
  need('venueId', 'Choose a venue.'); need('asset', 'Choose an asset.'); need('at', 'Choose when it happened.'); need('ref', d.kind === 'fiat' ? 'Bank reference is required.' : 'Transaction hash is required.');
  if (d.amount === '' || d.amount == null) e.push({ field: 'amount', code: 'MISSING_REQUIRED_FIELD', message: 'Enter an amount.' });
  else if (!(+d.amount > 0)) e.push({ field: 'amount', code: 'INVALID_AMOUNT', message: 'Amount must be greater than zero.' });
  const v = venueOf(d.venueId);
  if (d.venueId && d.asset && (!v || !v.assets.includes(d.asset))) e.push({ field: 'venueId', code: 'INVALID_SOURCE_VENUE', message: 'The selected venue cannot be used for this asset.' });
  if (d.at && new Date(d.at) > new Date()) e.push({ field: 'at', code: 'INVALID_DATE', message: 'The date cannot be in the future.' });
  if (d.ref && d.venueId && S.movs.some(m => m.dir === dir && m.venueId === d.venueId && m.ref && m.ref === d.ref)) e.push({ field: 'ref', code: 'ALREADY_EXISTS', message: 'A movement with this reference already exists at this venue.' });
  return e;
}
function bookingExtraRows(f, dir) {
  const r = [];
  if (dir === 'in') { r.push([f.kind === 'fiat' ? 'Sender name' : 'Source address', esc(f.depositor || '-')]); if (f.kind === 'token') r.unshift(['Blockchain', esc((venueOf(f.venueId) || {}).chain || '-')]); return r; }
  if (f.kind === 'fiat') { r.push(['Payment rail', f.rail ? esc(railText(f.rail)) : '-']); if (hasBearer(f.rail)) r.push(['Charge bearer', f.chargeBearer ? esc(bearerText(f.chargeBearer)) : '-']); if (hasBearerAcct(f.rail, f.chargeBearer)) r.push(['Charge bearer account', f.chargeBearerAcct ? esc((venueOf(f.chargeBearerAcct) || {}).name || '-') : '-']); r.push(['Beneficiary name', esc(f.depositor || '-')]); }
  else { r.push(['Blockchain', esc((venueOf(f.venueId) || {}).chain || '-')], ['Destination address', esc(f.depositor || '-')]); r.push(['Network fee', f.netFee ? esc(f.netFee + ' ' + f.asset) : '-']); }
  return r;
}
function effectText(dir, d, noWarn) {
  const amt = amtTxt(+d.amount || 0, d.asset || ''); const v = (venueOf(d.venueId) || {}).name || 'the venue';
  if (dir === 'in') return amt + ' has arrived at ' + v + '. It is recorded as unclassified until an operator classifies it. The venue balance rises by ' + amt + '.';
  const vbb = d.venueId && d.asset ? VB(d.venueId, d.asset) : null; const low = !noWarn && vbb && +d.amount > 0 && r8(vbb.total - +d.amount) < 0;
  return amt + ' has left ' + v + '. It is recorded as unclassified until an operator classifies it. The venue balance drops by ' + amt + '.' + (low ? ' Warning: the venue balance will go below zero. The money has already left, so the booking is allowed; check the reference and the venue balance.' : '');
}
function effectClassify(dir, mv, d) {
  const amt = amtTxt(mv.amount, mv.asset); const accn = d.accountId ? acctName(d.accountId) : '';
  const cls = clsInfo(dir, d.classification); if (!cls) return '';
  const tied = tiedOf(dir, d); const what = (CLS_LABEL[d.classification] || '').toLowerCase() + (d.chargeType ? ' (' + CHARGE_LABEL[d.chargeType].toLowerCase() + ')' : '');
  if (dir === 'in') return amt + ' is classified as ' + what + ', ' + (tied ? 'credited to ' + accn + '. That account balance rises and the line appears on its monthly statement.' : 'kept by us. It is recorded as company income that offsets company costs. No account balance changes.');
  if (d.classification === 'refund') return amt + ' is recorded as a refund. It clears the unknown funds entry that is waiting to be returned.';
  return amt + ' is classified as ' + what + ', ' + (tied ? 'charged to ' + accn + '. That account balance falls and the line appears on its monthly statement.' : 'paid by us. It is recorded as a company cost. No account balance changes.');
}

function applyClassification(user, mv, d) {
  const dir = mv.dir; const errs = validateClass(dir, d, mv); if (errs.length) return fail(errs[0].code, errs[0].message);
  if (mv.classification !== 'unclassified' || (dir === 'in' && mv.status !== 'detected')) return fail('INVALID_RECORD_STATE', 'The movement is no longer unclassified.');
  const tied = tiedOf(dir, d); const amt = mv.amount, asset = mv.asset;
  const label = (CLS_LABEL[d.classification] || '').toLowerCase();
  const ev = mv.id + ' ' + label + (d.chargeType ? ' · ' + CHARGE_LABEL[d.chargeType].toLowerCase() : '');
  if (dir === 'in') {
    if (S.reqs.some(r => r.status === 'pending' && r.type === 'classify' && r.payload && r.payload.relatedMov === mv.id)) return fail('INVALID_RECORD_STATE', 'A refund request is already pending for this entry.');
    if (tied) { B(d.accountId, asset).total = r8(B(d.accountId, asset).total + amt); postEffect(acct(d.accountId).name + ' balance rises; unclassified incoming falls', amt, asset, ev, mv.id); }
    else { S.custodianCost[asset] = r8((S.custodianCost[asset] || 0) - amt); postEffect('Recorded as company income; unclassified incoming falls', amt, asset, ev, mv.id); }
    S.unclassifiedIn[asset] = r8((S.unclassifiedIn[asset] || 0) - amt);
    Object.assign(mv, { status: 'confirmed', classification: d.classification, accountId: tied ? d.accountId : null, tied, explanation: d.note || '', relatedTx: d.relatedTx || '', classifiedAt: nowIso() });
    addAudit('MV-' + mv.id, 'incoming_movement:classify', user.id, mv.id + ' as ' + d.classification);
    saveState();
    return { ok: true };
  }
  if (d.classification === 'refund') {
    const o = mvById(d.relatedMov);
    const rp = refundProblem(mv, d, true); if (rp) return fail(/^The refund must equal/.test(rp) ? 'INVALID_AMOUNT' : /^The refund must be booked at/.test(rp) ? 'INVALID_SOURCE_VENUE' : 'INVALID_RECORD_STATE', rp);
    S.unclassifiedIn[asset] = r8((S.unclassifiedIn[asset] || 0) - amt);
    postEffect('Unknown funds entry cleared; unclassified outgoing falls', amt, asset, mv.id + ' refund', mv.id);
    if (o) { o.refundedBy = mv.id; o.status = 'refunded'; mv.relatedTx = o.id; }
  } else if (tied) {
    const b = B(d.accountId, asset); if (r8(b.total - b.reserved) < amt) return fail('INSUFFICIENT_BALANCE', 'The account does not have enough balance.');
    b.total = r8(b.total - amt);
    postEffect(acct(d.accountId).name + ' balance falls; unclassified outgoing falls', amt, asset, ev, mv.id);
  } else {
    S.custodianCost[asset] = r8((S.custodianCost[asset] || 0) + amt);
    postEffect('Recorded as a company cost; unclassified outgoing falls', amt, asset, ev, mv.id);
  }
  S.unclassifiedOut[asset] = r8((S.unclassifiedOut[asset] || 0) - amt);
  Object.assign(mv, { classification: d.classification, accountId: tied ? d.accountId : null, tied, chargeType: d.chargeType || '', explanation: d.note || '', relatedTx: d.relatedTx || mv.relatedTx || '', classifiedAt: nowIso() });
  addAudit('MV-' + mv.id, 'outgoing_movement:classify', user.id, mv.id + ' as ' + d.classification + (d.relatedMov ? ' (refunds ' + d.relatedMov + ')' : ''));
  saveState();
  return { ok: true };
}
function applyBook(maker, checker, dir, d) {
  const errs = validateBooking(dir, d); if (errs.length) return fail(errs[0].code, errs[0].message);
  const venue = venueOf(d.venueId); const amt = r8(+d.amount); const asset = d.asset; const vb = VB(d.venueId, asset); const tok = mvKind(asset) === 'token';
  const base = { amount: amt, asset, venueId: d.venueId, via: d.depositor || '', ref: d.ref, at: String(d.at).slice(0, 10), atFull: d.at, links: [], source: 'manual', kind: mvKind(asset), created: nowIso(), bookedBy: maker.id, depositor: d.depositor || '', note: d.note || '', relatedTx: '', chargeType: '', chain: tok ? (venue.chain || chainOf(asset)) : '', srcAddr: tok ? (venue.address || '') : '', classification: 'unclassified', accountId: null, tied: false };
  if (dir === 'in') {
    const m = Object.assign(base, { id: 'IM-' + nextId('mv'), dir: 'in', status: 'detected' });
    vb.total = r8(vb.total + amt); S.unclassifiedIn[asset] = r8((S.unclassifiedIn[asset] || 0) + amt);
    S.movs.unshift(m);
    postEffect(venue.name + ' rises; unclassified incoming rises', amt, asset, m.id + ' booked, unclassified', m.id);
    addAudit('MV-' + m.id, 'incoming_movement:create', (checker || maker).id, m.id + ' ' + fmtAmt(amt, asset) + ' ' + asset);
    saveState();
    return { ok: true, mv: m };
  }
  const m = Object.assign(base, { id: 'OM-' + nextId('mv'), dir: 'out', status: 'confirmed', exec: 'settled', execMethod: '', netFee: tok ? (d.netFee || '') : '', rail: d.rail || '', chargeBearer: hasBearer(d.rail) ? (d.chargeBearer || '') : '', chargeBearerAcct: hasBearerAcct(d.rail, d.chargeBearer) ? (d.chargeBearerAcct || '') : '' });
  vb.total = r8(vb.total - amt); S.unclassifiedOut[asset] = r8((S.unclassifiedOut[asset] || 0) + amt);
  S.movs.unshift(m);
  postEffect(venue.name + ' falls; unclassified outgoing rises', amt, asset, m.id + ' booked, unclassified', m.id);
  addAudit('MV-' + m.id, 'outgoing_movement:create', (checker || maker).id, m.id + ' ' + fmtAmt(amt, asset) + ' ' + asset);
  saveState();
  return { ok: true, mv: m };
}
function applyClassifyRequest(user, req) {
  const p = req.payload; const mv = mvById(p.movId); if (!mv) return fail('RECORD_NOT_FOUND', 'The movement could not be found.');
  return applyClassification(user, mv, p);
}
function applyBookRequest(user, req) {
  const r = applyBook(userById(req.makerId), user, req.payload.dir, req.payload.form);
  if (r.ok) { req.movId = r.mv.id; S.audit.forEach(a => { if (a.siId === 'REQ-' + req.id) a.siId = 'MV-' + r.mv.id; }); }
  return r.ok ? r : fail(r.code, r.message + ' The request stays awaiting approval.');
}
function reqSubject2(r) {
  if (r.type === 'book_movement') return esc(amtTxt(+r.payload.form.amount, r.payload.form.asset) + ' · ' + r.payload.form.ref);
  return esc(r.payload.movId);
}
function requestExtraHtml(r) {
  if (r.type === 'classify') {
    const p = r.payload; const mv = mvById(p.movId); const dir = mv ? mv.dir : 'in';
    return '<div class="card"><div class="card-head">Proposed classification</div><div class="card-body">' + dl([['Movement', mv ? '<a href="' + mvHref(mv) + '">' + esc(mv.id) + '</a>' : '-'], ['Amount', mv ? esc(amtTxt(mv.amount, mv.asset)) : '-'], ['Classification', esc((CLS_LABEL[p.classification] || p.classification) + (p.chargeType ? ' · ' + CHARGE_LABEL[p.chargeType] : ''))], [(dir === 'in' ? 'Credited to' : 'Charged to'), p.accountId ? acctLabel(p.accountId) : (p.classification === 'refund' ? 'Not applicable (clears the unknown funds entry)' : (dir === 'in' ? 'We keep it (company income)' : 'We pay it (company cost)'))], ['Related transaction', esc(p.relatedTx || '-')], ['Explanation', esc(p.note || '-')]].concat(p.relatedMov ? [['Unknown funds entry', '<a href="' + mvHref(mvById(p.relatedMov) || { id: p.relatedMov, dir: 'in' }) + '">' + esc(p.relatedMov) + '</a>']] : [])) + '<div class="note" style="margin-top:8px">' + esc(mv ? effectClassify(dir, mv, p) : '') + '</div></div></div>';
  }
  const f = r.payload.form; const dir = r.payload.dir;
  return '<div class="card"><div class="card-head">Proposed booking</div><div class="card-body">' + dl([['Direction', DIRWORD(dir)], ['Type', esc(f.kind === 'fiat' ? 'Fiat' : 'Token')], ['Venue', esc((venueOf(f.venueId) || {}).name || '-')], ['Amount', esc(amtTxt(+f.amount, f.asset))], ['Transacted at', esc(String(f.at).replace('T', ' '))], ['Reference', esc(f.ref)]].concat((bookingExtraRows(f, dir))).concat([['Internal note', esc(f.note || '-')]])) + '<div class="note" style="margin-top:8px">' + esc(effectText(dir, f, r.status !== 'pending')) + '</div></div></div>';
}

/* ---------- lists */
let MVQ_DEFAULT = { cls: '', status: '', asset: '', venue: '', rail: '', origin: '', kyt: '', q: '', page: 1, size: 10 };
const mvQuery = (route) => Object.assign({}, MVQ_DEFAULT, b64d(route.query.q || '') || {});
const setMv = (patch) => go('#' + ROUTE.path + '?q=' + b64e(Object.assign(mvQuery(ROUTE), patch)));
ACT.mvFilter = (el) => setMv({ [el.dataset.key]: el.value, page: 1 });
ACT.mvReset = () => go('#' + ROUTE.path);
ACT.mvPage = (el) => setMv({ page: +el.dataset.arg });
ACT.mvSize = (el) => setMv({ size: +el.value, page: 1 });
const mvAccountCell = (m) => {
  if (m.accountId) return acctLabel(m.accountId);
  if (m.status === 'refunded') return '<span class="sub">Refunded (' + esc(m.refundedBy) + ')</span>';
  if (m.classification === 'unclassified') return '<span class="sub">-</span>';
  if (m.classification === 'refund') return '<span class="sub">Cleared (refunded)</span>';
  if (m.source === 'instruction' || m.source === 'deposit') return '-';
  return '<span class="sub">' + (m.dir === 'in' ? 'We keep it (company income)' : 'We pay it (company cost)') + '</span>';
};
const pendReqFor = (m) => S.reqs.find(r => r.status === 'pending' && r.payload && r.payload.movId === m.id);
function mvFiltered(dir, kind, f) {
  const q = (f.q || '').trim().toLowerCase();
  return S.movs.filter(m => m.dir === dir && mvKind(m.asset) === kind &&
    (!f.cls || (m.classification || 'unclassified') === f.cls) && (!f.status || m.status === f.status) && (!f.asset || m.asset === f.asset) && (!f.venue || m.venueId === f.venue) && (!f.rail || m.rail === f.rail) && (!f.origin || (m.source === 'manual' ? 'manual' : 'instruction') === f.origin) && (!f.kyt || String(m.kyt || '').toLowerCase() === f.kyt) &&
    (!q || (m.id + ' ' + (m.ref || '') + ' ' + (m.via || '') + ' ' + (m.depositor || '')).toLowerCase().includes(q)));
}
function mvListView(dir, kind) {
  const f = mvQuery(ROUTE); const inc = dir === 'in';
  const rows = mvFiltered(dir, kind, f);
  const total = rows.length, pages = Math.max(1, Math.ceil(total / f.size)), page = Math.min(f.page, pages);
  const slice = rows.slice((page - 1) * f.size, page * f.size);
  const base = mvBase(dir);
  const tabs = '<div class="tabs"><button class="tab' + (kind === 'token' ? ' active' : '') + '" data-href="' + base + '/token">Token</button><button class="tab' + (kind === 'fiat' ? ' active' : '') + '" data-href="' + base + '/fiat">Fiat</button><button class="tab" disabled>Securities</button></div>';
  const sel = (key, opts, ph) => '<div class="f"><select class="select" data-act-change="mvFilter" data-key="' + key + '"><option value="">' + ph + '</option>' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (f[key] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
  const clsOpts = MV_CLASS[dir].map(c => [c.code, c.label]).concat([['unclassified', 'Unclassified']]);
  const stOpts = inc ? [['detected', 'Detected'], ['confirmed', 'Confirmed'], ['refunded', 'Refunded']] : [['pending', 'Pending'], ['submitted', 'Submitted'], ['confirmed', 'Confirmed'], ['failed', 'Failed']];
  const showRail = (kind === 'fiat') && !inc;
  const showKyt = (kind === 'token') && !inc;
  const any = f.cls || f.status || f.asset || f.venue || f.rail || f.origin || f.kyt || f.q;
  const filters = '<div class="filters"><div class="f input-wrap"><input class="input" data-act-change="mvFilter" data-key="q" placeholder="Search ID or reference" title="Matches part of the movement ID, reference or sender" value="' + esc(f.q) + '"><span class="search-ico">⌕</span></div>' +
    sel('cls', clsOpts, 'Classification') + sel('status', stOpts, 'Status') + sel('asset', Object.keys(ASSETS).filter(a => mvKind(a) === kind).map(a => [a, a]), 'Asset') + sel('venue', VENUES.map(v => [v.id, v.name]), 'Venue') + (showRail ? sel('rail', OUT_RAILS, 'Payment rail') : '') + (inc ? '' : sel('origin', [['instruction', 'From a withdrawal or rebalance'], ['manual', 'Booked by hand']], 'Origin')) + (showKyt ? sel('kyt', [['pending', 'Pending'], ['passed', 'Passed'], ['failed', 'Failed']], 'KYT status') : '') +
    (any ? '<button class="btn btn-link danger" data-act="mvReset">Reset all</button>' : '') + '</div>';
  const head = '<th>ID</th><th>Classification</th><th>Amount | Asset</th><th>Venue</th><th>Account</th>' + (showRail ? '<th>Payment rail</th>' : '') + '<th>Reference</th>' + (showKyt ? '<th>KYT status</th>' : '') + '<th>Transacted at</th><th>' + (inc ? 'Status' : 'Status | Execution') + '</th><th></th>';
  const canClassify = (m) => isOp() && m.classification === 'unclassified' && (inc ? m.status === 'detected' : m.source === 'manual');
  const body = slice.length ? slice.map(m => '<tr class="click' + (m.classification === 'unclassified' && m.status !== 'refunded' ? ' overdue' : '') + '" data-href="' + mvHref(m) + '"><td>' + esc(m.id) + '</td><td>' + (m.classification === 'unclassified' ? tag('Unclassified', m.status === 'refunded' ? '' : 'red') : esc(CLS_LABEL[m.classification] || m.classification) + (m.chargeType ? '<div class="sub">' + esc(CHARGE_LABEL[m.chargeType]) + '</div>' : '')) + '</td><td class="mono">' + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</td><td>' + esc((venueOf(m.venueId) || {}).name || '-') + '</td><td>' + mvAccountCell(m) + '</td>' + (showRail ? '<td>' + esc(m.rail ? railText(m.rail) : '-') + '</td>' : '') + '<td class="mono ref" title="' + esc(m.ref || '') + '">' + esc(m.ref || '-') + '</td>' + (showKyt ? '<td>' + (m.kyt ? esc(m.kyt) : '<span class="sub">-</span>') + '</td>' : '') + '<td>' + esc(m.at || '-') + '</td><td>' + badge(m.status) + (m.source === 'manual' ? '<div>' + tag('Booked by hand', 'gold') + '</div>' : m.exec ? '<div class="sub">' + esc(m.exec) + '</div>' : '') + '</td><td>' + (canClassify(m) ? (pendReqFor(m) ? btn('View request', 'viewMvReq', pendReqFor(m).id, 'btn-sm') : btn('Classify', 'classify', m.id, 'btn-primary btn-sm')) : '') + '</td></tr>').join('')
    : '<tr><td colspan="' + (showRail || showKyt ? 10 : 9) + '"><div class="empty"><div class="big">No movements found</div>' + (any ? '<button class="btn" data-act="mvReset">Reset all</button>' : '') + '</div></td></tr>';
  const pageBtns = []; for (let i = 1; i <= pages; i++) pageBtns.push('<button class="page-btn' + (i === page ? ' active' : '') + '" data-act="mvPage" data-arg="' + i + '">' + i + '</button>');
  const html = tabs + filters + '<div class="tbl-wrap"><table class="tbl mv-tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table><div class="pager"><span>' + (total ? (page - 1) * f.size + 1 : 0) + '-' + Math.min(page * f.size, total) + ' of ' + total + ' items</span>' + pageBtns.join('') + '<select class="select" data-act-change="mvSize">' + [10, 20, 50].map(n => '<option' + (n === f.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>';
  return { title: DIRWORD(dir) + ' Movement', crumbs: ['Dashboard', 'Movement Management', DIRWORD(dir) + ' Movement', kind === 'token' ? 'Token' : 'Fiat'], buttons: btn('Export CSV', 'mvExport', dir + '|' + kind, '') + (isOp() ? btn('Book ' + DIRWORD(dir) + ' Movement', 'mvBook', dir + '|' + kind, 'btn-primary') : ''), html };
}
ACT.mvExport = (el) => {
  const [dir, kind] = el.dataset.arg.split('|'); const rows = mvFiltered(dir, kind, mvQuery(ROUTE));
  csvDownload('movements-' + dir + '-' + kind + '.csv', [['ID', 'Classification', 'Charge type', 'Amount', 'Asset', 'Venue', 'Account', 'Payment rail', 'Charge bearer', 'Reference', 'Transacted at', 'Status']].concat(rows.map(m => [m.id, CLS_LABEL[m.classification || 'unclassified'], CHARGE_LABEL[m.chargeType] || '', m.amount, m.asset, (venueOf(m.venueId) || {}).name || '', m.accountId ? acct(m.accountId).number : '', m.rail ? railText(m.rail) : '', m.chargeBearer || '', m.ref || '', m.at || '', m.status])));
  toast({ title: 'Export started', desc: rows.length + ' rows exported using the current filters.' });
};
ACT.mvBook = (el) => { BK = null; const [dir, kind] = el.dataset.arg.split('|'); go(mvBase(dir) + '/' + kind + '/create'); };

/* ---------- detail */
function mvDetailView(id) {
  const m = mvById(id);
  const back = ['Dashboard', 'Movement Management'];
  if (!m || m.dir !== 'out') return { title: 'Not found', crumbs: back, buttons: '', html: '<div class="empty"><div class="big">Movement not found</div><a href="#/movement-management/outgoing-movement/fiat">Back to movements</a></div>' };
  if (!isOp()) return { title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty"><div class="big">FORBIDDEN</div>You do not have access to this page.</div>' };
  const pend = S.reqs.find(r => r.status === 'pending' && r.payload && r.payload.movId === m.id);
  let buttons = '';
  if (pend) buttons = btn('View request', 'viewMvReq', pend.id, '');
  else if (m.classification === 'unclassified' && m.source === 'manual') buttons = btn('Classify', 'classify', m.id, 'btn-primary');
  let banner = '';
  if (pend) banner = '<div class="alert warning">This entry has an ongoing maker checker request. Please resolve the maker checker request.</div>';
  else if (m.classification === 'unclassified') banner = '<div class="alert warning">This movement is unclassified and requires operator review. ' + 'The money has already left the venue and is waiting to be classified.' + '</div>';
  else if (m.status === 'confirmed') banner = '<div class="alert success">' + 'This movement is confirmed.' + '</div>';
  else if (m.status === 'pending' || m.status === 'submitted') banner = '<div class="alert info">This movement is ' + (m.status === 'pending' ? 'pending submission' : 'submitted and being processed') + '. Its actions run from the linked withdrawal and are not simulated in this prototype.</div>';
  else if (m.status === 'failed') banner = '<div class="alert error">This movement failed. ' + esc(m.failure || '') + '</div>';
  const manual = m.source === 'manual', isTok = mvKind(m.asset) === 'token';
  const NA = '<span class="sub">Not applicable (booked by hand)</span>';
  const fw = (t) => { t = String(t || '').replace(/_/g, ' ').trim(); return t ? esc(t.charAt(0).toUpperCase() + t.slice(1)) : '-'; };
  const v = venueOf(m.venueId) || {};
  const typed = isTok ? (m.dstAddr || m.depositor) : m.depositor;
  const refundSender = (m.classification === 'refund' && mvById(m.relatedTx) && mvById(m.relatedTx).depositor) ? mvById(m.relatedTx).depositor : '';
  const monoIf = (t) => isTok ? '<span class="mono">' + esc(t) + '</span>' : esc(t);
  const tf = m.atFull ? String(m.atFull).replace('T', ' ') : '';
  const transactedAt = tf ? esc(tf.slice(0, 10)) + '<div class="sub">' + esc(tf.slice(11, 19) || '') + '</div>' : esc(m.at || '-');
  const who = m.bookedBy ? esc(userById(m.bookedBy).name) : '-';
  const updatedAt = dateCell(m.classifiedAt || m.created);
  const linkedTx = m.transactionId ? esc(m.transactionId) + '<div class="sub">' + esc(CLS_LABEL[m.classification] || '') + '</div>' : '-';
  const clsV = m.classification === 'unclassified' ? tag('Unclassified', 'red') : esc(CLS_LABEL[m.classification] || m.classification);
  const venueV = '<a href="#/balances">' + esc(v.name || '-') + '</a><div class="sub">' + esc(VKIND[v.kind] || '') + (v.kind === 'fiat' && v.account ? ' · ' + esc(v.account) : '') + '</div>';
  const execM = manual ? NA : fw(m.execMethod || 'automated');
  const execS = fw(m.exec);
  const card = (title, left, right, note) => '<div class="card"><div class="card-head">' + title + '</div><div class="card-body">' + '<div class="dl2"><div class="col">' + left.map(i => '<div class="item"><div class="k">' + esc(i[0]) + '</div><div class="v">' + i[1] + '</div></div>').join('') + '</div><div class="col">' + right.map(i => '<div class="item"><div class="k">' + esc(i[0]) + '</div><div class="v">' + i[1] + '</div></div>').join('') + '</div></div>' + (note ? '<div class="note" style="margin-top:8px">' + note + '</div>' : '') + '</div></div>';
  let html = banner, extra = '';
  if (isTok) {
    const destV = (!manual && m.dstAddr) ? '<span class="mono">' + esc(m.dstAddr) + '</span> ' + tag('Whitelist Address', 'blue') : typed ? '<span class="mono">' + esc(typed) + '</span> ' + tag('Entered by hand', 'gold') : refundSender ? '<span class="mono">' + esc(refundSender) + '</span> ' + tag('From the refunded entry ' + m.relatedTx, 'gold') : (m.classification === 'venue_charges' ? '<span class="sub">Not applicable (the bank or chain itself)</span>' : '-');
    const feeV = (m.netFee ? '<span class="mono">' + esc(m.netFee) + ' ' + esc(m.asset) + '</span>' : '-');
    html += card('Details',
      [['Movement ID', esc(m.id)], ['Movement Type', 'Token'], ['Execution Status', execS], ['Direction', 'Outgoing'], ['Linked Transaction', linkedTx], ['Source Address', m.srcAddr ? '<span class="mono">' + esc(m.srcAddr) + '</span>' : '-'], ['Amount', '<span class="mono">' + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</span>'], ['Amount Type', manual ? NA : '-'], ['Transacted At', transactedAt], ['Created By', who], ['Updated By', who]],
      [['Movement Status', badge(m.status)], ['Execution Method', execM], ['Classification', clsV], ['Asset', esc(m.asset)], ['Venue', venueV], ['Destination Address', destV], ['Total Received', manual ? NA : (m.totalReceived ? '<span class="mono">' + esc(m.totalReceived) + ' ' + esc(m.asset) + '</span>' : '-')], ['Network Fee', feeV], ['Created At', dateCell(m.created)], ['Updated At', updatedAt]]);
    html += card('Additional Details',
      [['Blockchain', esc(m.chain || v.chain || chainOf(m.asset) || '-')], ['Transaction Hash', '<span class="mono">' + esc(m.ref || '-') + '</span>']],
      manual ? [] : [['Destination ID', m.wlAddr ? esc(m.wlAddr) : '-'], ['External ID', '-']]);
    html += card('Know Your Transactions',
      [['Status', manual ? NA : esc(m.kyt || '-')], ['Last Update', manual ? NA : '-']],
      [['Elliptic Score (0-10)', manual ? NA : '-'], ['Elliptic Response', manual ? NA : '-'], ['Update by Elliptic', manual ? NA : '-']],
      manual ? 'KYT does not apply: the money had already left when this movement was booked by hand.' : (m.kytRemarks ? esc(m.kytRemarks) : ''));
  } else {
    const toV = (!manual && m.bank) ? esc(m.bank.beneficiary + ' · ' + m.bank.number) + ' ' + tag('Whitelist Bank', 'blue') + '<div class="sub">' + esc(m.bank.id) + '</div>' : typed ? esc(typed) + ' ' + tag('Entered by hand', 'gold') : refundSender ? esc(refundSender) + ' ' + tag('From the refunded entry ' + m.relatedTx, 'gold') : (m.classification === 'venue_charges' ? '<span class="sub">Not applicable (the bank or chain itself)</span>' : '-');
    html += card('Details',
      [['Movement ID', esc(m.id)], ['Movement Type', 'Fiat'], ['Direction', 'Outgoing'], ['Asset', esc(m.asset)], ['From', venueV], ['Withdrawal Amount', '<span class="mono">' + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</span>'], ['Created By', who], ['Updated By', who]],
      [['Movement Status', badge(m.status)], ['Execution Method', execM], ['Execution Status', execS], ['Classification', clsV], ['Linked Transaction', linkedTx], ['To', toV], ['Total Received', '<span class="mono">' + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</span>'], ['Created At', dateCell(m.created)], ['Updated At', updatedAt]]);
    const payL = [['Payment Rail', m.rail ? esc(railText(m.rail)) + '<div class="sub">' + esc(optDesc(RAIL_OPTS, m.rail)) + '</div>' : '-'], ['Charge Bearer Account', m.chargeBearerAcct ? '<a href="#/balances">' + esc((venueOf(m.chargeBearerAcct) || {}).name || '-') + '</a><div class="sub">' + esc((venueOf(m.chargeBearerAcct) || {}).account || '') + '</div>' : '-'], ['Bank Reference', esc(m.ref || '-')]];
    if (m.fallback) payL.unshift(['Fallback Reason', esc(m.fallback)]);
    const payR = [['Charge Bearer', m.chargeBearer ? esc(bearerText(m.chargeBearer)) + '<div class="sub">' + esc(optDesc(BEARER_OPTS, m.chargeBearer)) + '</div>' : '-'], ['Payment Reference', m.payRef ? esc(m.payRef) : (manual ? NA : '-')], ['Transacted At', tf ? esc(tf.slice(0, 10)) : esc(m.at || '-')]];
    if (m.failure) payR.push(['Failure/Rejection Reason', esc(m.failure)]);
    html += card('Payment Details', payL, payR);
    const bk = m.bank || null;
    html += card('Whitelist Bank Account Details',
      [['Bank Account ID', bk ? esc(bk.id) : NA], ['Bank Account Number', bk ? esc(bk.number) : NA], ['Beneficiary Name', bk ? esc(bk.beneficiary) : (typed ? esc(typed) : '-')], ['SWIFT/BIC Code', bk ? esc(bk.swift) : NA], ['Country', bk ? esc(bk.country) : NA], ['Street Name', bk ? '-' : NA], ['Building Name', bk ? '-' : NA], ['Floor Number', bk ? '-' : NA]],
      [['Bank Country', bk ? '-' : NA], ['Intermediary Bank Swift', bk ? '-' : NA], ['Routing Code', bk ? '-' : NA], ['Town/City', bk ? '-' : NA], ['Postal Code', bk ? '-' : NA], ['Building Number', bk ? '-' : NA], ['Room Number', bk ? '-' : NA]],
      manual ? 'Bank account details are not recorded for a movement booked by hand. Only the beneficiary name is kept, if it was entered.' : '');
  }
  /* Our additions (not in the repo page): origin and the classification fields, in their own block so the repo layout above stays exact */
  const cl = [['Origin', manual ? 'Booked by hand' : 'Withdrawal or rebalance']];
  if (m.chargeType) cl.push(['Charge type', esc(CHARGE_LABEL[m.chargeType])]);
  if (m.classification && m.classification !== 'unclassified') cl.push(['Charged to', m.accountId ? acctLabel(m.accountId) : esc(m.classification === 'unknown_funds' ? 'Awaiting refund' : m.classification === 'refund' ? 'Not applicable (clears the unknown funds entry)' : 'We pay it (company cost)')]);
  const clR = [];
  if (m.relatedTx) clR.push(['Related transaction', relCell(m)]);
  if (m.explanation) clR.push(['Explanation', esc(m.explanation)]);
  if (m.note) clR.push(['Internal note', esc(m.note)]);
  html += card('Booking and Classification', cl, clR);
  html += linkedMovCard(m);
  if (m.tied && m.accountId && m.status === 'confirmed' && m.source === 'manual') html += '<div class="alert info"><div><b>Appears on the monthly statement.</b> This movement changed the balance of ' + esc(acctName(m.accountId)) + ', so it is shown on that account\'s monthly statement.</div></div>';
  const au = S.audit.filter(a => a.siId === 'MV-' + m.id);
  html += '<div class="card"><div class="card-head">Audit log</div><div class="card-body">' + (au.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>User</th><th>Detail</th><th>Time</th></tr></thead><tbody>' + au.map(a => '<tr><td class="mono">' + esc(a.event) + '</td><td>' + esc(userById(a.userId).name) + '</td><td>' + esc(a.detail) + '</td><td>' + dateCell(a.time) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">No audit events.</div>') + '</div></div>';
  return { title: m.id, sub: badge(m.status) + (m.source === 'manual' ? ' ' + tag('Booked by hand', 'gold') : '') + ' ' + (m.classification === 'unclassified' ? tag('Unclassified', 'red') : tag(clsText(m))), crumbs: back.concat([('Outgoing Movement'), m.id]), buttons, html };
}
function incDetailView(m) {
  const back = ['Dashboard', 'Movement Management', 'Incoming Movement'];
  const pend = pendReqFor(m);
  const refPend = S.reqs.find(r => r.status === 'pending' && r.type === 'classify' && r.payload && r.payload.relatedMov === m.id);
  const open = m.classification === 'unclassified' && m.status === 'detected';
  let buttons = '';
  if (pend) buttons = btn('View request', 'viewMvReq', pend.id, '');
  else if (refPend) buttons = btn('View request', 'viewMvReq', refPend.id, '');
  else if (open) buttons = btn('Classify', 'classify', m.id, 'btn-primary');
  let banner = '';
  if (pend || refPend) banner = '<div class="alert warning">This entry has an ongoing maker checker request. Please resolve the maker checker request.</div>';
  else if (m.status === 'refunded') banner = '<div class="alert success">This entry was refunded. It was cleared by outgoing movement <a href="' + mvHref(mvById(m.refundedBy) || { id: m.refundedBy, dir: 'out' }) + '">' + esc(m.refundedBy) + '</a>.</div>';
  else if (open) banner = '<div class="alert warning">This movement is unclassified and requires operator review. The money has already arrived at the venue and is waiting to be classified, or to be sent back with a Refund.</div>';
  else if (m.classification === 'deposit') banner = '<div class="alert success">This movement is confirmed and credited to the client account.</div>';
  else banner = '<div class="alert success">This movement is confirmed.</div>';
  const isTok = mvKind(m.asset) === 'token', manual = m.source === 'manual';
  const v = venueOf(m.venueId) || {};
  const rows = [['Movement ID', esc(m.id)], ['Movement type', isTok ? 'Token' : 'Fiat'], ['Direction', 'Incoming'], ['Origin', manual ? 'Booked by hand' : 'Deposit'],
    ['Venue', '<a href="#/balances">' + esc(v.name || '-') + '</a><div class="sub">' + esc(VKIND[v.kind] || '') + (v.kind === 'fiat' && v.account ? ' · ' + esc(v.account) : '') + '</div>'], ['Asset', esc(m.asset)], ['Amount', '<span class="mono">' + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</span>'], ['Movement status', badge(m.status)],
    ['Classification', m.classification === 'unclassified' ? tag('Unclassified', m.status === 'refunded' ? '' : 'red') : esc(CLS_LABEL[m.classification] || m.classification)]];
  if (m.classification !== 'unclassified') rows.push(['Credited to', m.accountId ? acctLabel(m.accountId) : (m.classification === 'others' ? 'We keep it (company income)' : '-')]);
  if (m.status === 'refunded') rows.push(['Refunded by', '<a href="' + mvHref(mvById(m.refundedBy) || { id: m.refundedBy, dir: 'out' }) + '">' + esc(m.refundedBy) + '</a>']);
  rows.push([isTok ? 'Source address' : 'Sender name', m.depositor ? (isTok ? '<span class="mono">' + esc(m.depositor) + '</span>' : esc(m.depositor)) : '-'], [isTok ? 'Transaction hash' : 'Bank reference', '<span class="mono">' + esc(m.ref || '-') + '</span>']);
  if (m.relatedTx) rows.push(['Related transaction', relCell(m)]);
  if (m.explanation) rows.push(['Explanation', esc(m.explanation)]);
  if (m.note) rows.push(['Internal note', esc(m.note)]);
  rows.push(['Transacted at', esc(m.atFull ? String(m.atFull).replace('T', ' ') : m.at || '-')], ['Created at', dateCell(m.created)]);
  if (m.bookedBy) rows.push(['Booked by', esc(userById(m.bookedBy).name)]);
  let html = banner + '<div class="card"><div class="card-head">Details</div><div class="card-body">' + dl(rows) + '</div></div>';
  html += linkedMovCard(m);
  if (m.tied && m.accountId && m.status === 'confirmed' && m.classification === 'others') html += '<div class="alert info"><div><b>Appears on the monthly statement.</b> This movement changed the balance of ' + esc(acctName(m.accountId)) + ', so it is shown on that account\'s monthly statement.</div></div>';
  const au = S.audit.filter(a => a.siId === 'MV-' + m.id);
  html += '<div class="card"><div class="card-head">Audit log</div><div class="card-body">' + (au.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>User</th><th>Detail</th><th>Time</th></tr></thead><tbody>' + au.map(a => '<tr><td class="mono">' + esc(a.event) + '</td><td>' + esc(userById(a.userId).name) + '</td><td>' + esc(a.detail) + '</td><td>' + dateCell(a.time) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">No audit events.</div>') + '</div></div>';
  return { title: m.id, sub: badge(m.status) + (manual ? ' ' + tag('Booked by hand', 'gold') : '') + ' ' + (m.classification === 'unclassified' ? tag('Unclassified', m.status === 'refunded' ? '' : 'red') : tag(clsText(m))), crumbs: back.concat([m.id]), buttons: isOp() ? buttons : '', html };
}
ACT.viewMvReq = (el) => go('#/approvals/' + el.dataset.arg);

/* ---------- classify */
function openClassifyModal(mv) {
  const dir = mv.dir;
  const d = { classification: '', tied: null, accountId: '', note: '', relatedTx: '', chargeType: '', relatedMov: '' };
  const inc = dir === 'in'; const options = MV_CLASS[dir].filter(c => inc ? !c.existing : (!c.instructionLed && !c.auto));
  const sec = (t, desc) => '<div class="form-sec">' + esc(t) + '</div>' + (desc ? '<div class="form-sec-desc">' + esc(desc) + '</div>' : '');
  const paint = (m) => {
    const body = m.querySelector('.modal-body'); const cls = clsInfo(dir, d.classification); const tied = cls ? tiedOf(dir, d) : false;
    let h = dl([['Amount', esc(amtTxt(mv.amount, mv.asset))], ['Venue', esc((venueOf(mv.venueId) || {}).name || '-')]].concat((mv.source === 'manual') ? [] : [[('Sent to'), esc(mv.depositor || mv.via || '-')]]).concat([['Reference', esc(mv.ref || '-')]])).replace('class="dl"', 'class="dl" style="grid-template-columns:' + ((mv.source === 'manual') ? 'repeat(3,1fr)' : '1fr 1fr') + '"');
    h += sec('Classification Details', inc ? 'Choose what this arrival is.' : 'Choose what this payment is for.');
    h += formItem('Classification', '<select class="select" id="cl-cls"><option value="">Select classification</option>' + options.map(c => '<option value="' + c.code + '"' + (d.classification === c.code ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('') + '</select>', { required: true });
    if (cls && cls.charge) h += formItem('Charge type', selectHtml('cl-charge', d.chargeType, CHARGE_BY_KIND[mvKind(mv.asset)].map(k => [k, CHARGE_LABEL[k]]), { placeholder: 'Select charge type' }), { required: true, tip: 'A network fee paid inside the same transfer stays on that movement. Classify it here only when it is paid separately.' });
    if (cls) {
      if (cls.needsMov) {
        const unk = S.movs.filter(x => x.dir === 'in' && x.classification === 'unclassified' && x.status === 'detected' && !x.refundedBy && x.asset === mv.asset && x.venueId === mv.venueId && !pendReqFor(x));
        h += sec('Refund Details', 'The unknown funds this refund returns.') + formItem('Unknown funds entry to refund', unk.length ? selectHtml('cl-rmov', d.relatedMov, unk.map(x => [x.id, x.id + ' · ' + amtTxt(x.amount, x.asset) + ' · ' + (x.ref || '') + (x.depositor ? ' · ' + x.depositor : '')]), { placeholder: 'Select entry' }) : '<div class="note">No unclassified incoming entry in ' + esc(mv.asset) + ' at ' + esc((venueOf(mv.venueId) || {}).name || 'this venue') + '.</div>', { required: true });
        const ro = d.relatedMov ? mvById(d.relatedMov) : null;
        if (ro) {
          const waited = Math.max(0, Math.round((new Date(S.today + 'T00:00:00Z') - new Date(String(ro.at).slice(0, 10) + 'T00:00:00Z')) / 86400000));
          const fits = r8(ro.amount) === r8(mv.amount);
          h += '<div class="card" style="margin-top:8px"><div class="card-head">Unknown funds to refund</div><div class="card-body">' + dl([['Entry', '<a href="' + mvHref(ro) + '">' + esc(ro.id) + '</a>'], ['Amount to refund', '<span class="mono">' + esc(amtTxt(ro.amount, ro.asset)) + '</span>'], ['This movement', '<span class="mono">' + esc(amtTxt(mv.amount, mv.asset)) + '</span> ' + (fits ? tag('Matches', 'blue') : tag('Does not match', 'red'))], ['Received at', esc((venueOf(ro.venueId) || {}).name || '-')], ['Received on', esc(ro.at || '-') + ' (' + waited + (waited === 1 ? ' day' : ' days') + ' ago)'], [mvKind(ro.asset) === 'fiat' ? 'Original sender' : 'Original source address', esc(ro.depositor || '-')], [mvKind(ro.asset) === 'fiat' ? 'Bank reference' : 'Transaction hash', '<span class="mono">' + esc(ro.ref || '-') + '</span>']]) + (fits ? '' : '<div class="note" style="margin-top:8px">A refund must equal the amount received. Book a movement of ' + esc(amtTxt(ro.amount, ro.asset)) + ' to refund this entry.</div>') + '</div></div>';
          const snd = (ro.depositor || '').trim(), typed = (mv.depositor || '').trim(); const lbl = mvKind(mv.asset) === 'fiat' ? 'sender name' : 'source address';
          const same = snd.toLowerCase() === typed.toLowerCase();
          if (snd && typed && !same) h += '<div class="alert warning"><b>Check the destination.</b> Entered at booking: <b>' + esc(typed) + '</b>. Original ' + lbl + ' of ' + esc(ro.id) + ': <b>' + esc(snd) + '</b>. A refund should go back to the original sender. You can still submit.</div>';
          else if (snd && !typed) h += '<div class="note">No destination was entered at booking. The refund will show the original ' + lbl + ' of ' + esc(ro.id) + ' as its destination: <b>' + esc(snd) + '</b>.</div>';
          else if (!snd) h += '<div class="note">' + esc(ro.id) + ' has no recorded sender, so the destination cannot be checked.</div>';
        }
      }
      if (cls.link !== 'none') {
        h += sec('Allocation Details', inc ? 'Who should get this money?' : 'Who should pay for this?');
        if (cls.link === 'optional') h += '<div class="form-item"><label><span class="req">*</span>' + (inc ? 'Credited to' : 'Charged to') + '</label><div><label style="margin-right:24px"><input type="radio" name="cl-tied" value="true"' + (d.tied === true ? ' checked' : '') + '> A customer account</label><label><input type="radio" name="cl-tied" value="false"' + (d.tied === false ? ' checked' : '') + '> ' + (inc ? 'We keep it (company income)' : 'We pay it (company cost)') + '</label></div></div>';
        if (tied) h += formItem(('Account'), selectHtml('cl-acc', d.accountId, ACCOUNTS.map(a => [a.id, a.name + ' | ' + a.number]), { placeholder: 'Select account' }), { required: true });
        
      }
      h += sec('Additional Details', 'Anything that helps explain this classification.');
      if (d.classification !== 'refund') {
        const rOpts = relOptions(mv); const rSel = d.relatedTx ? (rOpts.find(o => o.key === d.relatedTx) || { key: d.relatedTx, label: d.relatedTx }) : null;
        h += formItem('Related transaction', rSel ? '<div class="input rel-sel"><span>' + esc(rSel.label) + '</span><a class="link" id="cl-rel-clear" href="javascript:void(0)">Clear</a></div>' : '<input class="input" id="cl-relq" autocomplete="off" placeholder="Search by ID, for example ' + (mvKind(mv.asset) === 'token' ? 'WD-2042 or OM-3008' : 'WD-2041 or OM-3007') + '"><div class="rel-list" id="cl-rellist" style="display:none"></div>', { required: d.chargeType === 'network_fee', optional: d.chargeType !== 'network_fee', tip: d.chargeType === 'network_fee' ? 'Required for a network fee: the withdrawal this fee belongs to. A fee is always linked to its withdrawal.' : inc ? 'For a correcting entry, the movement it corrects, for example OM-3006.' : (mvKind(mv.asset) === 'token' ? 'For example the token withdrawal a network fee belongs to.' : 'For example the withdrawal a bank charge belongs to.') });
        const rt = d.relatedTx ? resolveRel(d.relatedTx) : null;
        if (rt) {
          const dest = rt.bank ? rt.bank.beneficiary + ' · ' + rt.bank.number : (rt.dstAddr || rt.depositor || '');
          h += '<div class="card" style="margin-top:8px"><div class="card-head">Linked transaction details</div><div class="card-body">' + dl([[rt.transactionId ? 'Withdrawal' : 'Movement', esc(rt.transactionId || rt.id)], ['Movement', '<a href="' + mvHref(rt) + '">' + esc(rt.id) + '</a> ' + badge(rt.status)], ['Type', esc((rt.dir === 'in' ? 'Incoming' : 'Outgoing') + ' · ' + clsText(rt))], ['Amount', '<span class="mono">' + esc(amtTxt(rt.amount, rt.asset)) + '</span>'], ['Venue', esc((venueOf(rt.venueId) || {}).name || '-')], ['Account', rt.accountId ? acctLabel(rt.accountId) : '-'], [mvKind(rt.asset) === 'fiat' ? 'Paid to' : 'Destination', dest ? '<span class="mono">' + esc(dest) + '</span>' : '-'], ['Transacted on', esc(rt.at || '-')]]) + (rt.venueId !== mv.venueId ? '<div class="alert warning" style="margin-top:8px"><b>Check the venue.</b> This movement is at ' + esc((venueOf(mv.venueId) || {}).name || '-') + ' but ' + esc(rt.id) + ' is at ' + esc((venueOf(rt.venueId) || {}).name || '-') + '. A fee is normally paid from the same venue. You can still submit.</div>' : '') + '</div></div>';
        }
      }
      h += formItem('Explanation', textareaHtml('cl-note', d.note, { placeholder: cls.needsNote ? (inc ? 'Explain what this arrival is, for example which booking it corrects (at least 10 characters)' : 'Explain what this movement is (at least 10 characters)') : 'Optional' }), cls.needsNote ? { required: true } : { optional: true });
      if (cls.link === 'none' ? (d.classification !== 'refund' || d.relatedMov) : (d.tied === false || (tied && d.accountId) || cls.link === 'required' && d.accountId)) h += '<div class="note">' + esc(effectClassify(dir, mv, d)) + '</div>';
    }
    h += '<div class="help" id="cl-err"></div>';
    body.innerHTML = h;
    const read = () => { const g = (id) => { const e = body.querySelector('#' + id); return e ? e.value : null; }; if (g('cl-note') !== null) d.note = g('cl-note'); if (g('cl-rel') !== null) d.relatedTx = g('cl-rel'); };
    body.querySelector('#cl-cls').addEventListener('change', (e) => { read(); d.classification = e.target.value; d.tied = null; d.accountId = ''; d.chargeType = ''; d.relatedMov = ''; if (d.classification === 'refund') d.relatedTx = ''; paint(m); });
    const rq = body.querySelector('#cl-relq'), rlist = body.querySelector('#cl-rellist');
    if (rq) { const ro2 = relOptions(mv); const showList = () => { const q = rq.value.trim().toLowerCase(); const hits = ro2.filter(o => !q || o.label.toLowerCase().includes(q)).slice(0, 8); rlist.innerHTML = hits.length ? hits.map(o => '<div class="rel-opt" data-k="' + esc(o.key) + '">' + esc(o.label) + '</div>').join('') : '<div class="rel-none">No transaction found for this ID.</div>'; rlist.style.display = 'block'; };
      rq.addEventListener('input', showList); rq.addEventListener('focus', showList);
      rlist.addEventListener('mousedown', (ev) => { const t = ev.target.closest('.rel-opt'); if (t) { ev.preventDefault(); read(); d.relatedTx = t.dataset.k; paint(m); } });
      rq.addEventListener('blur', () => { rlist.style.display = 'none'; }); }
    const rc = body.querySelector('#cl-rel-clear'); if (rc) rc.addEventListener('click', () => { read(); d.relatedTx = ''; paint(m); });
    const ch = body.querySelector('#cl-charge'); if (ch) ch.addEventListener('change', () => { read(); d.chargeType = ch.value; paint(m); });
    const rm = body.querySelector('#cl-rmov'); if (rm) rm.addEventListener('change', () => { read(); d.relatedMov = rm.value; paint(m); });
    const ac = body.querySelector('#cl-acc'); if (ac) ac.addEventListener('change', () => { read(); d.accountId = ac.value; paint(m); });
    body.querySelectorAll('input[name="cl-tied"]').forEach(r => r.addEventListener('change', () => { read(); d.tied = r.value === 'true'; if (!d.tied) d.accountId = ''; paint(m); }));
  };
  openModal({
    title: 'Classify ' + mv.id, sub: 'Needs a second operator (maker-checker). Say what this movement is for and, where needed, ' + (inc ? 'who receives it.' : 'who bears it.'), wide: true, body: '', okText: 'Submit for approval',
    onMount: paint,
    onOk(m) {
      const body = m.querySelector('.modal-body'); const err = (t) => { body.querySelector('#cl-err').textContent = t; return false; };
      const gv = (id) => { const e = body.querySelector('#' + id); return e ? e.value : ''; };
      if (!d.classification) return err('Choose a classification.');
      d.note = gv('cl-note') || d.note; d.relatedTx = gv('cl-rel') || d.relatedTx; d.chargeType = gv('cl-charge') || d.chargeType; d.relatedMov = gv('cl-rmov') || d.relatedMov;
      if (d.classification === 'refund') d.relatedTx = '';
      const errs = validateClass(dir, d, mv); if (errs.length) return err(errs[0].message);
      if ((d.classification === 'refund')) { const rp = refundProblem(mv, d, false); if (rp) return err(rp); }
      if (inc && S.reqs.some(r => r.status === 'pending' && r.type === 'classify' && r.payload && r.payload.relatedMov === mv.id)) return err('A refund request is already pending for this entry.');
      if (!inc && (tiedOf(dir, d)) && d.accountId) { const b = B(d.accountId, mv.asset); if (r8(b.total - b.reserved) < mv.amount) return err('The account does not have enough balance.'); }
      const r = newRequest('classify', CUR, { movId: mv.id, classification: d.classification, tied: tiedOf(dir, d), accountId: tiedOf(dir, d) ? d.accountId : '', chargeType: d.chargeType, relatedMov: d.relatedMov, note: d.note, relatedTx: d.relatedTx }, '');
      toast({ title: 'Classification submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + r.id) } }); rerender();
    }
  });
}

/* ---------- book a movement (facts only; classification is a separate step) */
let BK = null;
const bkNew = (dir, kind) => ({ dir, kind, chain: '', venueId: '', asset: '', amount: '', at: localDT(new Date()), ref: '', depositor: '', note: '', rail: '', chargeBearer: '', chargeBearerAcct: '', netFee: '', errors: {} });
function bookView(dir, kind) {
  if (!isOp()) return { title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty"><div class="big">FORBIDDEN</div></div>' };
  if (!BK || BK.dir !== dir || BK.kind !== kind) BK = bkNew(dir, kind);
  const F = BK, e = F.errors; const inc = dir === 'in'; const word = DIRWORD(dir);
  const venues = VENUES.filter(v => v.assets.some(a => mvKind(a) === kind));
  const assets = F.venueId ? (venueOf(F.venueId).assets || []).filter(a => mvKind(a) === kind) : [];
  const sec = (t, desc) => '<div class="form-sec">' + esc(t) + '</div><div class="form-sec-desc">' + esc(desc) + '</div>';
  const typeRadio = '<div class="radio-group">' + [['token', 'Token'], ['fiat', 'Fiat']].map(t => '<label><input type="radio" name="bk-type" value="' + t[0] + '"' + (kind === t[0] ? ' checked' : '') + '> ' + t[1] + '</label>').join('') + '</div>';
  const div = '<hr class="divider">';
  
  let h;
  const hOld = '<div class="form-wrap"><div class="alert info"><div>' + (inc ? 'Record money that already arrived at the venue and that no deposit explains, for example a correcting entry for a wrong outgoing booking. It is saved as <b>Unclassified</b>. After a second operator approves it, classify it from the movement list.' : 'Record a movement that already happened at the venue. It is saved as <b>Unclassified</b>. After a second operator approves it, classify it from the movement list.') + '</div></div>' +
  sec('Venue and asset', inc ? 'Where the money arrived and what it is.' : 'Where the money left from and what it is.') +
  formItem('Type', typeRadio, { required: true }) +
  formItem('Venue', selectHtml('bk-venue', F.venueId, venues.filter(v => kind === 'fiat' ? v.kind === 'fiat' : v.kind !== 'fiat').map(v => [v.id, v.name + (v.kind === 'fiat' ? '' : ' (' + VKIND[v.kind] + ')')]), { placeholder: 'Select venue', error: e.venueId }), { required: true, error: e.venueId, hint: F.venueId ? 'Current balance, for information only. ' + ((venueOf(F.venueId) || {}).assets || []).filter(a => mvKind(a) === kind).map(a => { const b = VB(F.venueId, a); return a + ': Total ' + fmtAmt(b.total, a) + ' · Available ' + fmtAmt(r8(b.total - b.reserved), a); }).join('  |  ') : 'Fiat venues are bank accounts. Token venues are hot and cold wallets.' }) +
  (kind === 'fiat' ? formItem('Bank account number', inputHtml('bk-bank-no', F.venueId ? (venueOf(F.venueId) || {}).account || '' : '', { disabled: true, placeholder: 'Auto-filled from venue' })) : '') + (kind === 'token' ? formItem('Blockchain', inputHtml('bk-chain', F.venueId ? (venueOf(F.venueId) || {}).chain || '' : '', { disabled: true, placeholder: 'Auto-filled from venue' })) + formItem('Source address', inputHtml('bk-src', F.venueId ? (venueOf(F.venueId) || {}).address || '' : '', { disabled: true, placeholder: 'Auto-filled from venue' })) : '') +
  formItem('Asset', selectHtml('bk-asset', F.asset, assets, { placeholder: F.venueId ? 'Select asset' : 'Select venue first', error: e.asset, disabled: !F.venueId }), { required: true, error: e.asset, hint: F.venueId ? 'Only assets this venue holds.' : '' }) + div +
  sec(kind === 'fiat' ? 'Amount and timing' : 'Transaction Details', 'How much, when it happened, and the reference that proves it.') +
  formItem('Amount', inputHtml('bk-amount', F.amount, { placeholder: 'Enter amount', error: e.amount }), { required: true, error: e.amount }) +
  formItem('Transacted at', '<input class="input" type="datetime-local" id="bk-at" value="' + esc(F.at) + '">', { required: true, error: e.at }) +
  formItem(kind === 'fiat' ? 'Bank reference' : 'Transaction hash', inputHtml('bk-ref', F.ref, { placeholder: kind === 'fiat' ? 'Enter bank reference' : 'Enter transaction hash', error: e.ref }), { required: true, error: e.ref, tip: 'Used for reconciliation and to detect duplicates at the venue.' }) +
(kind === 'token' && !inc && F.venueId ? (formItem('Network fee', inputHtml('bk-netfee', F.netFee, { placeholder: 'Enter network fee' }), { optional: true, tip: 'Only when the fee was paid in the same transfer. A fee paid separately is booked on its own. Leave empty if a fee sponsor paid it (for example on Ethereum or Solana).' })) : '') + div +
  sec('Other details', 'Optional. Anything that helps the person who classifies it.') +
  (('')) +
  ((formItem(inc ? (kind === 'fiat' ? 'Sender name' : 'Source address') : (kind === 'fiat' ? 'Beneficiary name' : 'Destination address'), inputHtml('bk-dep', F.depositor, { placeholder: inc ? (kind === 'fiat' ? 'Who sent it, if shown' : 'Where it came from, if known') : (kind === 'fiat' ? 'Who the bank paid, if shown' : 'Where it was sent, if known') }), inc ? { optional: true } : { optional: true, tip: 'Fill in if the statement or chain shows it. When this is classified as a Refund, it is checked against the original sender.' }))) +
  ((kind === 'fiat' && !inc) ? formItem('Payment rail', selectHtml('bk-rail', F.rail, RAIL_OPTS, { placeholder: 'Select rail' }), { optional: true, tip: 'The bank network the payment went over. Only a label here: nothing is sent.' }) : '') +
  ((kind === 'fiat') && !inc && hasBearer(F.rail) ? formItem('Charge bearer', selectHtml('bk-bearer', F.chargeBearer, BEARER_OPTS, { placeholder: 'Select charge bearer' }), { optional: true, tip: 'Who pays the bank charges on this payment, as the bank shows it. MEPS and TT only. Filled from the default in System > Charge Instructions: change it if the bank statement shows something else.' }) : '') +
  ((kind === 'fiat') && !inc && hasBearerAcct(F.rail, F.chargeBearer) ? formItem('Charge bearer account', selectHtml('bk-bacct', F.chargeBearerAcct, dbsVenues().map(v => [v.id, v.name + ' | ' + v.account]), { placeholder: 'Select charge bearer account' }), { optional: true, tip: 'The DBS bank account the charges are taken from. Only DBS venues are listed.' }) : '') +
  formItem('Internal note', textareaHtml('bk-note', F.note, { placeholder: 'Enter internal note' }), { optional: true }) +
  '<div class="form-actions">' + btn('Exit', 'bkExit', null, '') + btn('Submit', 'bkSubmit', null, 'btn-primary') + '</div></div>';

  /* Token outgoing: same layout as the Operator UI create page (blockchain, then venue) */
  const tokOut = kind === 'token' && !inc;
  const chains = Array.from(new Set(VENUES.filter(v => v.kind !== 'fiat' && v.chain).map(v => v.chain)));
  const tvenues = VENUES.filter(v => v.kind !== 'fiat' && v.chain === F.chain);
  const vSel = venueOf(F.venueId);
  const balB = (F.venueId && F.asset) ? VB(F.venueId, F.asset) : null;
  const balRow = balB ? '<div class="dl" style="grid-template-columns:1fr;margin-bottom:16px"><div class="item"><div class="k">Balance</div><div class="v">Total ' + esc(fmtAmt(balB.total, F.asset)) + ' ' + esc(F.asset) + ' · Available ' + esc(fmtAmt(r8(balB.total - balB.reserved), F.asset)) + ' ' + esc(F.asset) + '</div></div></div>' : '';
  const hTok = '<div class="form-wrap"><div class="alert info"><div>Record a movement that already happened at the venue. It is saved as <b>Unclassified</b>. After a second operator approves it, classify it from the movement list.</div></div>' +
    sec('Movement Details', 'Basic information about the movement.') +
    formItem('Type', typeRadio) +
    '<div class="form-sec-desc">Select a blockchain and a venue.</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
    formItem('Blockchain', selectHtml('bk-chainsel', F.chain, chains.map(c => [c, c]), { placeholder: 'Select blockchain', error: e.chain }), { required: true, error: e.chain }) +
    formItem('Venue', selectHtml('bk-venue', F.venueId, tvenues.map(v => [v.id, v.name + ' (' + VKIND[v.kind] + ')']), { placeholder: F.chain ? 'Select venue' : 'Select blockchain first', error: e.venueId, disabled: !F.chain }), { required: true, error: e.venueId, hint: F.chain ? 'Only hot and cold wallets are offered.' : '' }) + '</div>' + div +
    sec('Source and Destination Address', 'Specify where the funds are coming from and going to.') +
    formItem('Source Address', inputHtml('bk-src', vSel ? vSel.address || '' : '', { disabled: true, placeholder: 'Auto-filled from venue' }), { required: true }) +
    formItem('Destination Address', inputHtml('bk-dep', F.depositor, { placeholder: 'Enter destination address' }), { optional: true, tip: 'Fill in if the chain shows it. When this is classified as a Refund, it is checked against the original sender.' }) + div +
    sec('Transaction Details', 'Enter the transaction details including transaction hash, asset type, amount and timestamp.') +
    formItem('Asset', selectHtml('bk-asset', F.asset, assets, { placeholder: F.venueId ? 'Select asset' : 'Select venue first', error: e.asset, disabled: !F.venueId }), { required: true, error: e.asset }) + balRow +
    formItem('Amount', inputHtml('bk-amount', F.amount, { placeholder: 'Enter amount', error: e.amount }) , { required: true, error: e.amount, hint: F.asset ? 'In ' + F.asset + '. The whole amount that left the venue, network fee included.' : '' }) +
    formItem('Transaction Hash', inputHtml('bk-ref', F.ref, { placeholder: 'Enter transaction hash', error: e.ref }), { required: true, error: e.ref, tip: 'Used for reconciliation and to detect duplicates at the venue.' }) +
    formItem('Transacted At', '<div style="display:flex;gap:8px"><input class="input" style="width:90px" value="UTC" disabled><input class="input" type="datetime-local" id="bk-at" value="' + esc(F.at) + '"></div>', { required: true, error: e.at }) +
    (F.venueId ? (formItem('Network Fee', inputHtml('bk-netfee', F.netFee, { placeholder: 'Enter network fee' }), { optional: true, tip: 'Only when the fee was paid in the same transfer. A fee paid separately is booked on its own. Leave empty if a fee sponsor paid it (for example on Ethereum or Solana).' })) : '') + div +
    formItem('Internal Note', textareaHtml('bk-note', F.note, { placeholder: 'Enter internal note' }), { optional: true }) +
    '<div class="form-actions">' + btn('Exit', 'bkExit', null, '') + btn('Submit', 'bkSubmit', null, 'btn-primary') + '</div></div>';
  h = tokOut ? hTok : hOld;
  return {
    title: 'Book ' + word + ' Movement', crumbs: ['Dashboard', 'Movement Management', word + ' Movement', kind === 'token' ? 'Token' : 'Fiat', 'Book'], buttons: '', html: h,
    bind(root) {
      const on = (id, ev, fn) => { const el = root.querySelector('#' + id); if (el) el.addEventListener(ev, fn); };
      const set = (id, key, structural) => { const el = root.querySelector('#' + id); on(id, structural || (el && el.tagName === 'SELECT') ? 'change' : 'input', (ev) => { F[key] = ev.target.value; if (structural) rerender(); }); };
      root.querySelectorAll('input[name="bk-type"]').forEach(r => r.addEventListener('change', (ev) => { const nk = ev.target.value; if (nk === F.kind) return; BK = Object.assign(bkNew(dir, nk), { amount: F.amount, at: F.at, note: F.note }); go(mvBase(dir) + '/' + nk + '/create'); }));
      on('bk-chainsel', 'change', (ev) => { F.chain = ev.target.value; F.venueId = ''; F.asset = ''; F.netFee = ''; rerender(); });
      set('bk-venue', 'venueId', true); on('bk-venue', 'change', () => { if (F.asset && !(venueOf(F.venueId).assets || []).includes(F.asset)) F.asset = ''; rerender(); });
      set('bk-asset', 'asset', true); set('bk-amount', 'amount'); set('bk-at', 'at'); set('bk-ref', 'ref'); set('bk-dep', 'depositor'); set('bk-note', 'note'); on('bk-rail', 'change', (ev) => { F.rail = ev.target.value; const def = CHARGE_DEFAULTS[F.rail]; if (def) { F.chargeBearer = def.bearer; F.chargeBearerAcct = def.bearer === 'CRED' ? '' : def.acct; } else { F.chargeBearer = ''; F.chargeBearerAcct = ''; } rerender(); });
      on('bk-bearer', 'change', (ev) => { F.chargeBearer = ev.target.value; const def = CHARGE_DEFAULTS[F.rail]; F.chargeBearerAcct = F.chargeBearer === 'CRED' ? '' : (F.chargeBearerAcct || (def ? def.acct : '')); rerender(); }); set('bk-bacct', 'chargeBearerAcct'); set('bk-netfee', 'netFee');
    }
  };
}
ACT.bkExit = () => { const b = BK; BK = null; go(mvBase(b ? b.dir : 'out') + '/' + (b ? b.kind : 'token')); };
ACT.bkSubmit = () => {
  const F = BK; const form = Object.assign({}, F); delete form.errors;
  const errs = validateBooking(F.dir, form);
  F.errors = {}; errs.forEach(x => { if (!F.errors[x.field]) F.errors[x.field] = x.message; });
  if (errs.length) { rerender(); return; }
  rerender();
  const word = F.dir === 'in' ? 'incoming' : 'outgoing';
  openModal({
    title: 'Review ' + word + ' movement', sub: 'Check what will happen before you submit.', wide: true,
    body: '<div class="rv-sum"><div class="rv-h">What this booking does</div><p style="margin:0 0 12px">' + esc(effectText(F.dir, form)) + '</p></div>' +
      dl([['Type', F.kind === 'fiat' ? 'Fiat' : 'Token'], ['Venue', esc((venueOf(F.venueId) || {}).name)], ['Amount', esc(amtTxt(+F.amount, F.asset))], ['Reference', esc(F.ref)], ['Transacted at', esc(String(F.at).replace('T', ' '))]].concat(bookingExtraRows(form, F.dir)).concat([['Internal note', esc(F.note || '-')]])).replace('class="dl"', 'class="dl" style="grid-template-columns:1fr 1fr"') +
      '<div class="alert info" style="margin-top:12px"><div><b>What happens next.</b> Another operator must approve this booking. The movement then shows as Unclassified, and an operator classifies it in a separate step (which also needs a second operator).</div></div>' +
      '<div class="form-item" style="margin-top:16px"><label>Comment <span class="opt">(Optional)</span></label><textarea class="textarea" id="rv-comment"></textarea></div>',
    okText: 'Confirm and submit for approval',
    onOk(m) {
      const r = newRequest('book_movement', CUR, { dir: F.dir, form }, m.querySelector('#rv-comment').value);
      const base = mvBase(F.dir) + '/' + F.kind; BK = null;
      toast({ title: 'Movement submitted', desc: 'Awaiting approval by another operator. Nothing has changed yet.', button: { label: 'View Details', onClick: () => go('#/approvals/' + r.id) } });
      go(base);
    }
  });
};

function movementRoute(p) {
  const dir = p[1] === 'incoming-movement' ? 'in' : p[1] === 'outgoing-movement' ? 'out' : null;
  if (!dir) { location.replace('#/movement-management/outgoing-movement/fiat'); return null; }
  if (p[2] === 'token' || p[2] === 'fiat') return p[3] === 'create' ? bookView(dir, p[2]) : mvListView(dir, p[2]);
  if (p[2]) { const m = mvById(p[2]); if (m && m.dir === 'in') return incDetailView(m); return mvDetailView(p[2]); }
  location.replace(mvBase(dir) + '/token'); return null;
}

/* ---------- balances extras: statement lines, company costs, balance effects */
function balancesMore() {
  const mine = S.movs.filter(m => m.source === 'manual' && m.tied && m.accountId && m.status === 'confirmed' && (isOp() || myAccts().includes(m.accountId))).sort((x, y) => String(y.at).localeCompare(String(x.at)));
  let h = '<h3 class="bal-h">Statement lines from manual bookings</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Account</th><th>Description</th><th>Reference</th><th>Amount</th></tr></thead><tbody>' +
    (mine.length ? mine.map(m => '<tr><td>' + esc(m.at || '-') + '</td><td>' + acctLabel(m.accountId) + '</td><td>' + (isOp() ? '<a href="' + mvHref(m) + '">' + esc(m.id) + '</a> · ' : '') + esc(clsText(m)) + (m.explanation ? '<div class="sub wrap">' + esc(m.explanation) + '</div>' : '') + '</td><td class="mono">' + esc(m.ref || '-') + '</td><td class="mono ' + (m.dir === 'out' ? 'dir-d' : 'dir-r') + '">' + (m.dir === 'out' ? '-' : '+') + esc(fmtAmt(m.amount, m.asset)) + ' ' + esc(m.asset) + '</td></tr>').join('') : '<tr><td colspan="5"><div class="empty">No manual bookings affect these accounts.</div></td></tr>') +
    '</tbody></table></div><div class="note" style="margin-top:8px">These lines appear on the account\'s monthly statement. Bookings that are not tied to an account never appear on a statement.</div>';
  if (isOp()) {
    const cust = Object.keys(S.custodianCost).filter(a => S.custodianCost[a]).map(a => [a, S.custodianCost[a]]);
    h += '<h3 class="bal-h">Company costs (net of credits)</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Asset</th><th>Amount</th></tr></thead><tbody>' + (cust.length ? cust.map(c => '<tr><td>' + c[0] + '</td><td class="mono">' + fmtAmt(c[1], c[0]) + '</td></tr>').join('') : '<tr><td colspan="2"><div class="empty">None</div></td></tr>') + '</tbody></table></div>';
    const posts = S.posts.filter(p => p.movId).slice(-12).reverse();
    h += '<h3 class="bal-h">Recent balance effects from movements</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Movement</th><th>What changed</th><th>Amount</th><th>Event</th><th>Value date</th></tr></thead><tbody>' + (posts.length ? posts.map(p => { const mv = mvById(p.movId); return '<tr><td>' + (mv ? '<a href="' + mvHref(mv) + '">' + esc(p.movId) + '</a>' : esc(p.movId)) + '</td><td>' + esc(p.effect) + '</td><td class="mono">' + esc(amtTxt(p.amount, p.asset)) + '</td><td>' + esc(p.event) + '</td><td>' + esc(p.valueDate) + '</td></tr>'; }).join('') : '<tr><td colspan="5"><div class="empty">None</div></td></tr>') + '</tbody></table></div>';
  }
  return h;
}

/* ===== bundle tail: integration with the shell ===== */
const rerender = () => Shell.render();
const forbidden = () => ({ title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty"><div class="big">FORBIDDEN</div>You do not have access to this page.</div>' });
function resolveView() {
  const p = ROUTE.parts;
  if (p[0] === 'movement-management') return isOp() ? movementRoute(p) : forbidden();
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




window.SIApp = {
  name: 'si', toast,
  setUser(u) { CUR = u; }, setRoute(r) { ROUTE = r; }, resolveView, resetUi() { CR = null; BK = null; }, closeOverlays: closeAllOverlays,
  load() { loadState(); saveState(); }, reset() { resetState(); CR = null; BK = null; },
  today: () => S.today, advance(n) { advanceDay(n); },
  hasRequest: (id) => S.reqs.some(r => r.id === id),
  requestRows: () => S.reqs.map(r => ({ id: r.id, title: reqTitle(r), subject: reqSubject2(r), maker: userById(r.makerId).name, createdAt: r.createdAt, status: r.status })),
  requestDetail: requestDetailView,
  pendingCount: () => S.reqs.filter(r => r.status === 'pending').length,
  };

})();
