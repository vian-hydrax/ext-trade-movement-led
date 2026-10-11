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

/* Constants, state, seed data and domain rules (PRD - Counterparties) */

const COUNTRIES = [
  ['SG', 'Singapore'], ['US', 'United States'], ['GB', 'United Kingdom'], ['HK', 'Hong Kong'],
  ['CH', 'Switzerland'], ['DE', 'Germany'], ['FR', 'France'], ['JP', 'Japan'], ['AU', 'Australia'],
  ['AE', 'United Arab Emirates'], ['KY', 'Cayman Islands'], ['BM', 'Bermuda'], ['LU', 'Luxembourg'],
  ['IE', 'Ireland'], ['CA', 'Canada'], ['ID', 'Indonesia'], ['MY', 'Malaysia'], ['TH', 'Thailand'],
  ['IN', 'India'], ['CN', 'China']
];
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim());
const newUuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const TYPES = { broker: 'Broker', exchange: 'Exchange', issuer: 'Issuer', fund: 'Fund', other: 'Other' };
const CP_STATUS = { active: 'Active', suspended: 'Suspended', closed: 'Closed' };
const SSI_STATUS = { under_review: 'Under review', approved: 'Approved', rejected: 'Rejected', retired: 'Retired' };
const FIAT = ['SGD', 'USD', 'EUR', 'HKD', 'JPY', 'GBP'];
const CHAINS = {
  ethereum: { name: 'Ethereum', re: /^0x[a-fA-F0-9]{40}$/ },
  polygon: { name: 'Polygon', re: /^0x[a-fA-F0-9]{40}$/ },
  bitcoin: { name: 'Bitcoin', re: /^(bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/ },
  solana: { name: 'Solana', re: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/ }
};
const USERS = Shared.USERS;
const CP_REJECT_REASONS = {
  DUPLICATE: 'Duplicate', INCOMPLETE_INFORMATION: 'Incomplete information', ENTITY_NOT_VERIFIED: 'Entity not verified',
  HIGH_RISK_JURISDICTION: 'High risk jurisdiction', OTHER: 'Other'
};
const SSI_REJECT_REASONS = {
  INVALID_BANK_DETAILS: 'Invalid bank details', NAME_MISMATCH: 'Name mismatch', OWNERSHIP_NOT_VERIFIED: 'Ownership not verified',
  DUPLICATE: 'Duplicate', OTHER: 'Other'
};
const REQ_TITLES = {
  create_counterparty: 'Create counterparty', reactivate_counterparty: 'Reactivate counterparty',
  ssi_create: 'Add whitelist', ssi_replace: 'Replace whitelist'
};

const WL_ADDR_REJECT_REASONS = {
  INVALID_ADDRESS: 'Invalid address', OWNERSHIP_NOT_VERIFIED: 'Ownership not verified', DUPLICATE: 'Duplicate', OTHER: 'Other'
};
const reasonLabel = (k) => CP_REJECT_REASONS[k] || SSI_REJECT_REASONS[k] || WL_ADDR_REJECT_REASONS[k] || (k === 'COUNTERPARTY_CLOSED' ? 'Counterparty closed' : k);
const wlEvt = (s, verb) => (s.assetType === 'bank' ? 'whitelisted_bank_account.' : 'whitelisted_address.') + verb;
function reqTitle(r) {
  if (r.type === 'create_counterparty') return 'Create counterparty';
  if (r.type === 'reactivate_counterparty') return 'Reactivate counterparty';
  const rec = S.ssis.find(x => x.id === r.ssiId);
  const what = rec && rec.assetType === 'wallet' ? 'wallet address' : 'bank account';
  return (r.type === 'ssi_replace' ? 'Replace ' : 'Add ') + what;
}
function rejectReasonsFor(r) {
  if (r.type === 'create_counterparty' || r.type === 'reactivate_counterparty') return CP_REJECT_REASONS;
  const rec = S.ssis.find(x => x.id === r.ssiId);
  return rec && rec.assetType === 'wallet' ? WL_ADDR_REJECT_REASONS : SSI_REJECT_REASONS;
}

const STORE_KEY = 'ets-cp-v3';
let S = null;

function seed() {
  const t = (d) => new Date(Date.now() - d * 86400000).toISOString();
  return {
    seq: { cp: 6, ssi: 13, req: 2, ob: 6, audit: 0 },
    counterparties: [
      { id: 'cp1', uuid: '8f3c2a71-5d4e-4b90-a6c1-2e7d9b0f4a11', name: 'Meridian Capital Markets Pte Ltd', type: 'broker', countryCode: 'SG', regulated: true, regulator: 'MAS', licence: 'CMS100123', docName: 'MAS-licence.pdf', note: 'Primary SGD and BTC broker.', status: 'active', statusReason: '', mchRequestId: null, createdBy: 'u2', createdAt: t(60), updatedBy: 'u2', updatedAt: t(20) },
      { id: 'cp2', uuid: 'b41e6d08-93a2-4c57-8f1d-6a3c5e9d7b22', name: 'Crestline Opportunities Fund SPC', type: 'fund', countryCode: 'KY', regulated: false, regulator: '', licence: '', docName: '', certName: 'certificate-of-incorporation.pdf', ownerDocName: 'ownership-structure-chart.pdf', note: '', status: 'active', statusReason: '', mchRequestId: null, createdBy: 'u1', createdAt: t(45), updatedBy: 'u1', updatedAt: t(45) },
      { id: 'cp3', uuid: 'c7a95e14-0b68-4d32-9e47-1f8a2d6c3b33', name: 'Sterling Digital Securities Ltd', type: 'issuer', countryCode: 'GB', regulated: true, regulator: 'FCA', licence: '612345', docName: 'FCA-register.pdf', note: '', status: 'suspended', statusReason: 'Sanctions alert under review', suspendedBy: 'u2', suspendedAt: t(3), mchRequestId: null, createdBy: 'u1', createdAt: t(40), updatedBy: 'u2', updatedAt: t(3) },
      { id: 'cp4', uuid: 'd2085b6f-7e13-4a89-b5c0-4e9f1a7d8c44', name: 'Ridgeway Liquidity Partners LLC', type: 'broker', countryCode: 'US', regulated: false, regulator: '', licence: '', docName: '', certName: 'certificate-of-incorporation.pdf', ownerDocName: 'share-register.pdf', note: 'Relationship ended.', status: 'closed', statusReason: 'Relationship ended', mchRequestId: null, createdBy: 'u1', createdAt: t(120), updatedBy: 'u1', updatedAt: t(30) },
      { id: 'cp5', uuid: 'e96b4c3a-1f27-4580-a3d9-7b2e6c0f5a55', name: 'Aurelia Digital Asset Fund Pte Ltd', type: 'fund', countryCode: 'SG', regulated: false, regulator: '', licence: '', docName: '', certName: 'certificate-of-incorporation.pdf', ownerDocName: 'ownership-structure-chart.pdf', note: '', status: 'active', statusReason: '', mchRequestId: null, createdBy: 'u2', createdAt: t(10), updatedBy: 'u2', updatedAt: t(10) },
      { id: 'cp6', uuid: 'f1d7a835-4c92-4e06-8b6a-3d5f9e1c2a66', name: 'Orbit Exchange Ltd', type: 'exchange', countryCode: 'SG', regulated: true, regulator: 'MAS', licence: 'CMS100456', docName: 'MAS-licence.pdf', certName: 'certificate-of-incorporation.pdf', ownerDocName: 'share-register.pdf', note: 'Trading venue for the Atlas Capital and Beacon Trading exchange trades. Receives trading fees.', status: 'active', statusReason: '', mchRequestId: null, createdBy: 'u1', createdAt: t(20), updatedBy: 'u1', updatedAt: t(20) }
    ],
    ssis: [
      { scope: 'counterparty', id: 's1', cpId: 'cp1', label: 'LP SGD bank (DBS)', assetType: 'bank', version: 1, replacesId: null, status: 'approved', currency: 'SGD', bankCountry: 'SG', swift: 'DBSSSGSG', account: '0123456789', intermediary: '', routing: '', beneName: 'Meridian Capital Markets Pte Ltd', beneCountry: 'SG', beneCity: 'Singapore', benePostal: '018982', beneStreet: 'Marina Boulevard', beneBuildingName: '', beneBuildingNo: '12', beneFloor: '', beneRoom: '', note: 'Confirmed by email from known contact.', createdBy: 'u2', createdAt: t(58), approvedBy: 'u1', approvedAt: t(58), replacementPending: false, requestId: 'r0a' },
      { scope: 'counterparty', id: 's2', cpId: 'cp1', label: 'LP BTC wallet', assetType: 'wallet', version: 1, replacesId: null, status: 'approved', chain: 'bitcoin', asset: 'BTC', origin: 'Exchange', originDetail: 'Meridian Capital Markets custody', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', note: '', createdBy: 'u2', createdAt: t(50), approvedBy: 'u1', approvedAt: t(50), replacementPending: false, requestId: 'r0b' },
      { scope: 'counterparty', id: 's3', cpId: 'cp2', label: 'Crestline Fund USD', assetType: 'bank', version: 1, replacesId: null, status: 'retired', currency: 'USD', bankCountry: 'US', swift: 'CHASUS33', account: '9988776655', intermediary: '', routing: '021000021', beneName: 'Crestline Opportunities Fund SPC', beneCountry: 'KY', beneCity: 'George Town', benePostal: '', beneStreet: '', beneBuildingName: '', beneBuildingNo: '', beneFloor: '', beneRoom: '', note: '', createdBy: 'u1', createdAt: t(44), approvedBy: 'u2', approvedAt: t(44), replacementPending: false, requestId: 'r0c' },
      { scope: 'counterparty', id: 's4', cpId: 'cp2', label: 'Crestline Fund USD', assetType: 'bank', version: 2, replacesId: 's3', status: 'approved', currency: 'USD', bankCountry: 'US', swift: 'CHASUS33', account: '9988776677', intermediary: '', routing: '021000021', beneName: 'Crestline Opportunities Fund SPC', beneCountry: 'KY', beneCity: 'George Town', benePostal: '', beneStreet: '', beneBuildingName: '', beneBuildingNo: '', beneFloor: '', beneRoom: '', note: 'New account after bank change.', createdBy: 'u1', createdAt: t(25), approvedBy: 'u2', approvedAt: t(25), replacementPending: false, requestId: 'r0d' },
      { scope: 'counterparty', id: 's5', cpId: 'cp3', label: 'Sterling Digital ETH wallet', assetType: 'wallet', version: 1, replacesId: null, status: 'approved', chain: 'ethereum', asset: 'ETH', origin: 'Non-custodial Wallet', originDetail: '', address: '0x52908400098527886E0F7030069857D2E4169EE7', note: '', createdBy: 'u1', createdAt: t(38), approvedBy: 'u2', approvedAt: t(38), replacementPending: false, requestId: 'r0e' },
      { scope: 'counterparty', id: 's6', cpId: 'cp5', label: 'Nova EUR bank', assetType: 'bank', version: 1, replacesId: null, status: 'under_review', currency: 'EUR', bankCountry: 'DE', swift: 'DEUTDEFF', account: 'DE89370400440532013000', intermediary: '', routing: '', beneName: 'Aurelia Digital Asset Fund Pte Ltd', beneCountry: 'SG', beneCity: 'Singapore', benePostal: '', beneStreet: '', beneBuildingName: '', beneBuildingNo: '', beneFloor: '', beneRoom: '', note: '', createdBy: 'u2', createdAt: t(1), replacementPending: false, requestId: 'r2' },
      { scope: 'account', id: 's7', clientName: 'Acme Capital Pte Ltd', ownerName: 'Acme Main Account', ownerCode: 'A-2345-6789-0123-9', label: 'Acme DBS SGD', assetType: 'bank', version: 1, replacesId: null, status: 'approved', currency: 'SGD', bankCountry: 'SG', swift: 'DBSSSGSG', account: '5550001111', intermediary: '', routing: '', beneName: 'Acme Capital Pte Ltd', beneCountry: 'SG', beneCity: 'Singapore', benePostal: '', beneStreet: '', beneBuildingName: '', beneBuildingNo: '', beneFloor: '', beneRoom: '', note: '', createdBy: 'u3', createdAt: t(70), approvedBy: 'u1', approvedAt: t(69), replacementPending: false, requestId: 'r0f' },
      { scope: 'account', id: 's8', clientName: 'Acme Capital Pte Ltd', ownerName: 'Acme Main Account', ownerCode: 'A-2345-6789-0123-9', label: 'Acme cold wallet', assetType: 'wallet', version: 1, replacesId: null, status: 'approved', chain: 'ethereum', asset: 'ETH', origin: 'Non-custodial Wallet', originDetail: '', address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', note: '', createdBy: 'u3', createdAt: t(65), approvedBy: 'u1', approvedAt: t(64), replacementPending: false, requestId: 'r0g' },
      { scope: 'counterparty', id: 's9', cpId: 'cp1', label: 'LP SGD bank (OCBC)', assetType: 'bank', version: 1, replacesId: null, status: 'approved', currency: 'SGD', bankCountry: 'SG', swift: 'OCBCSGSG', account: '5550012345', intermediary: '', routing: '', beneName: 'Meridian Capital Markets Pte Ltd', beneCountry: 'SG', beneCity: 'Singapore', benePostal: '018982', beneStreet: 'Marina Boulevard', beneBuildingName: '', beneBuildingNo: '12', beneFloor: '', beneRoom: '', note: '', createdBy: 'u2', createdAt: t(40), approvedBy: 'u1', approvedAt: t(40), replacementPending: false, requestId: 'r0h' },
      { scope: 'counterparty', id: 's10', cpId: 'cp2', label: 'Crestline Fund UNIT wallet', assetType: 'wallet', version: 1, replacesId: null, status: 'approved', chain: 'ethereum', asset: 'UNIT', origin: 'Non-custodial Wallet', originDetail: '', address: '0x7a25d2c8f4e1b09a3c6d58f0e2b71a94c0d5a3f1', note: '', createdBy: 'u2', createdAt: t(44), approvedBy: 'u1', approvedAt: t(44), replacementPending: false, requestId: 'r0i' },
      { scope: 'counterparty', id: 's11', cpId: 'cp3', label: 'Sterling Digital token wallet', assetType: 'wallet', version: 1, replacesId: null, status: 'approved', chain: 'ethereum', asset: 'TOKEN', origin: 'Non-custodial Wallet', originDetail: '', address: '0x5290c3b7e8a1d4f60b92c5e7a3d18f40b1c69ee7', note: '', createdBy: 'u1', createdAt: t(39), approvedBy: 'u2', approvedAt: t(39), replacementPending: false, requestId: 'r0j' },
      { scope: 'counterparty', id: 's12', cpId: 'cp6', label: 'Orbit fees SGD bank (UOB)', assetType: 'bank', version: 1, replacesId: null, status: 'approved', currency: 'SGD', bankCountry: 'SG', swift: 'UOVBSGSG', account: '3013345678', intermediary: '', routing: '', beneName: 'Orbit Exchange Ltd', beneCountry: 'SG', beneCity: 'Singapore', benePostal: '048583', beneStreet: 'Raffles Place', beneBuildingName: '', beneBuildingNo: '80', beneFloor: '', beneRoom: '', note: 'Trading fees. Confirmed with the exchange finance team.', createdBy: 'u2', createdAt: t(19), approvedBy: 'u1', approvedAt: t(19), replacementPending: false, requestId: 'r0c' },
      { scope: 'counterparty', id: 's13', cpId: 'cp6', label: 'Orbit BTC deposit wallet', assetType: 'wallet', version: 1, replacesId: null, status: 'approved', chain: 'bitcoin', asset: 'BTC', origin: 'Exchange', originDetail: 'Orbit Exchange deposit address', address: 'bc1q9h5yjfnx0d5c7ggr3t0qk6ps2y8w4m7ufz3e2a', note: '', createdBy: 'u2', createdAt: t(19), approvedBy: 'u1', approvedAt: t(19), replacementPending: false, requestId: 'r0d' }
    ],
    requests: [
      { id: 'r1', type: 'create_counterparty', targetId: null, payload: { name: 'Kestrel Capital Partners Ltd', type: 'broker', countryCode: 'HK', regulated: true, regulator: 'SFC', licence: 'AAB123', docName: 'SFC-licence.pdf', note: 'Intro via Meridian Capital Markets.' }, makerId: 'u2', comment: 'Requested by trading desk.', status: 'pending', createdAt: t(0.5) },
      { id: 'r2', type: 'ssi_create', targetId: 'cp5', ssiId: 's6', payload: null, makerId: 'u2', comment: 'EUR settlement for Nova.', status: 'pending', createdAt: t(1) }
    ],
    audit: []
  };
}

function dateOffset(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { S = JSON.parse(raw); return; }
  } catch (e) { /* ignore */ }
  S = seed();
  seedAudit();
}
function seedAudit() {
  addAudit('cp1', 'counterparty:create', 'u2', 'Counterparty created and approved.');
  addAudit('cp3', 'counterparty:suspend', 'u2', 'Reason: Sanctions alert under review');
  addAudit('cp4', 'counterparty:close', 'u1', 'Reason: Relationship ended');
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}
function resetState() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  S = seed();
  seedAudit();
  saveState();
}

/* Lookups */
const userById = (id) => USERS.find(u => u.id === id) || { name: 'System', id };
const cpById = (id) => S.counterparties.find(c => c.id === id);
const ssiById = (id) => S.ssis.find(s => s.id === id);
const reqById = (id) => S.requests.find(r => r.id === id);
const countryName = (code) => (COUNTRIES.find(c => c[0] === code) || [code, code || '-'])[1];
const normName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const openObligations = (cpId) => SIApp.obligationsFor(cpId).filter(o => o.status !== 'settled');
const linkedFor = (cpId) => [...new Set(SIApp.obligationsFor(cpId).map(o => o.account))];
const activeSsiCount = (cpId) => S.ssis.filter(s => s.scope === 'counterparty' && s.cpId === cpId && s.status === 'approved').length;
const nextId = (k) => { S.seq[k] += 1; return S.seq[k]; };

function addAudit(entityId, event, userId, detail, cpId) {
  if (!S.audit) S.audit = [];
  S.audit.unshift({ id: 'a' + nextId('audit'), entityId, cpId: cpId || entityId, event, userId, time: new Date().toISOString(), detail: detail || '' });
}

/* Validation */
const SWIFT_RE = /^[A-Za-z0-9]{8}$|^[A-Za-z0-9]{11}$/;

function nameTaken(name, exceptId) {
  const n = normName(name);
  return S.counterparties.some(c => c.id !== exceptId && normName(c.name) === n)
    || S.requests.some(r => r.status === 'pending' && r.type === 'create_counterparty' && normName(r.payload.name) === n);
}

function validateCounterparty(f) {
  const e = {};
  if (!String(f.name || '').trim()) e.name = 'Name is required';
  else if (f.name.trim().length > 140) e.name = 'Name must be 140 characters or fewer';
  else if (nameTaken(f.name)) e.name = 'A counterparty with this name already exists.';
  if (!f.type) e.type = 'Type is required';
  if (!f.countryCode) e.countryCode = 'Country of registration is required';
  if (f.regulated) {
    if (!String(f.regulator || '').trim()) e.regulator = 'Regulator is required';
    if (!String(f.licence || '').trim()) e.licence = 'Licence number is required';
    if (!f.docName) e.doc = 'Supporting document is required';
  } else {
    if (!f.certName) e.cert = 'Certificate of incorporation is required';
    if (!f.ownerDocName) e.ownerDoc = 'Ownership document is required';
  }
  return e;
}

function validateSsi(f, cpId, exceptId) {
  const e = {};
  const cp = cpById(cpId);
  if (!cpId) e.cpId = 'Counterparty is required';
  else if (!cp) e.cpId = 'The counterparty could not be found.';
  else if (cp.status !== 'active') e.cpId = 'The counterparty is not active.';
  const live = (s) => s.scope === 'counterparty' && s.id !== exceptId && s.id !== f.replacesId && s.status !== 'rejected' && s.status !== 'retired';
  const mine = S.ssis.filter(s => live(s) && s.cpId === cpId);
  if (!String(f.label || '').trim()) e.label = 'Label is required';
  else if (mine.some(s => normName(s.label) === normName(f.label))) e.label = 'A record with this label already exists for this counterparty.';
  if (f.assetType === 'bank') {
    if (!f.currency) e.currency = 'Currency is required';
    if (!f.bankCountry) e.bankCountry = 'Bank country is required';
    if (!f.swift) e.swift = 'SWIFT/BIC is required';
    else if (!SWIFT_RE.test(f.swift)) e.swift = 'SWIFT code must be exactly 8 or 11 characters.';
    if (f.intermediary && !SWIFT_RE.test(f.intermediary)) e.intermediary = 'SWIFT code must be exactly 8 or 11 characters.';
    if (!f.account) e.account = 'Bank account number is required';
    else if (!/^[A-Za-z0-9]{1,34}$/.test(f.account)) e.account = 'Use up to 34 letters and digits.';
    else if (f.currency && mine.some(s => s.assetType === 'bank' && s.account === f.account && s.swift === f.swift && s.currency === f.currency)) e.account = 'These bank details already exist for this counterparty and currency.';
    if (f.routing && !/^[A-Za-z0-9]{1,31}$/.test(f.routing)) e.routing = 'Use up to 31 letters and digits.';
    if (!String(f.beneName || '').trim()) e.beneName = 'Beneficiary name is required';
    else if (f.beneName.length > 140) e.beneName = 'Maximum 140 characters';
    if (!f.beneCountry) e.beneCountry = 'Country is required';
    if (!String(f.beneCity || '').trim()) e.beneCity = 'Town/City is required';
    else if (f.beneCity.length > 35) e.beneCity = 'Maximum 35 characters';
  } else {
    if (!f.chain) e.chain = 'Blockchain is required';
    if (!f.asset) e.asset = 'Asset is required';
    if (!f.address) e.address = 'Wallet address is required';
    else if (f.chain && !CHAINS[f.chain].re.test(f.address)) e.address = 'The wallet address is not valid for the selected blockchain.';
    else if (S.ssis.some(s => live(s) && s.assetType === 'wallet' && s.chain === f.chain && s.asset === f.asset && String(s.address).toLowerCase() === f.address.toLowerCase())) e.address = 'These wallet details already exist.';
    if (!f.origin) e.origin = 'Address origin is required';
  }
  if (f.note && f.note.length > 500) e.note = 'Maximum 500 characters';
  return e;
}

/* Domain actions. Each returns { ok:true } or { ok:false, code, message } */
const fail = (code, message) => ({ ok: false, code, message });

function submitCreateRequest(user, payload, comment) {
  const r = { id: 'r' + nextId('req'), type: 'create_counterparty', targetId: null, payload, makerId: user.id, comment: comment || '', status: 'pending', createdAt: new Date().toISOString() };
  S.requests.unshift(r);
  addAudit(r.id, 'mch_request:create', user.id, 'Create counterparty "' + payload.name + '"');
  saveState();
  return { ok: true, request: r };
}

function submitSsi(user, cpId, form, comment, replaceOf) {
  const cp = cpById(cpId);
  if (!cp || cp.status !== 'active') return fail('INVALID_RECORD_STATE', 'The counterparty is not active.');
  const now = new Date().toISOString();
  const ssi = Object.assign({}, form, {
    scope: 'counterparty', id: 's' + nextId('ssi'), cpId, version: replaceOf ? replaceOf.version + 1 : 1, replacesId: replaceOf ? replaceOf.id : null,
    status: 'under_review', createdBy: user.id, createdAt: now, replacementPending: false
  });
  ['errors', 'warn', '_key', 'kind', 'copyFrom'].forEach(k => delete ssi[k]);
  const r = { id: 'r' + nextId('req'), type: replaceOf ? 'ssi_replace' : 'ssi_create', targetId: cpId, ssiId: ssi.id, payload: null, makerId: user.id, comment: comment || '', status: 'pending', createdAt: now };
  ssi.requestId = r.id;
  S.ssis.push(ssi);
  if (replaceOf) replaceOf.replacementPending = true;
  S.requests.unshift(r);
  addAudit(ssi.id, wlEvt(ssi, replaceOf ? 'replace' : 'create'), user.id, (replaceOf ? 'Replace version ' + replaceOf.version + ' with version ' + ssi.version : 'Add') + ': ' + ssi.label, cpId);
  saveState();
  return { ok: true, request: r, record: ssi };
}

function submitReactivate(user, cpId, comment) {
  const cp = cpById(cpId);
  if (!cp || cp.status !== 'suspended') return fail('INVALID_RECORD_STATE', 'The counterparty is not suspended.');
  if (cp.mchRequestId) return fail('MCH_REVIEW_IN_PROGRESS', 'A maker-checker request is already pending.');
  const r = { id: 'r' + nextId('req'), type: 'reactivate_counterparty', targetId: cpId, payload: null, makerId: user.id, comment, status: 'pending', createdAt: new Date().toISOString() };
  S.requests.unshift(r);
  cp.mchRequestId = r.id;
  addAudit(cpId, 'mch_request:create', user.id, 'Reactivate request: ' + comment, cpId);
  saveState();
  return { ok: true, request: r };
}

function suspendCp(user, cpId, reason) {
  const cp = cpById(cpId);
  if (!cp || cp.status !== 'active') return fail('INVALID_RECORD_STATE', 'This counterparty cannot be suspended from its current status.');
  cp.status = 'suspended'; cp.statusReason = reason; cp.suspendedBy = user.id; cp.suspendedAt = new Date().toISOString();
  cp.updatedBy = user.id; cp.updatedAt = cp.suspendedAt;
  addAudit(cpId, 'counterparty:suspend', user.id, 'Reason: ' + reason, cpId);
  saveState();
  return { ok: true };
}

function closeCp(user, cpId, reason) {
  const cp = cpById(cpId);
  if (!cp || !(cp.status === 'active' || cp.status === 'suspended')) return fail('INVALID_RECORD_STATE', 'This counterparty cannot be closed from its current status.');
  if (openObligations(cpId).length) return fail('INVALID_RECORD_STATE', 'This counterparty has open settlements and cannot be closed.');
  if (cp.mchRequestId) return fail('MCH_REVIEW_IN_PROGRESS', 'A maker-checker request is pending.');
  const now = new Date().toISOString();
  cp.status = 'closed'; cp.statusReason = reason; cp.updatedBy = user.id; cp.updatedAt = now;
  S.ssis.filter(s => s.scope === 'counterparty' && s.cpId === cpId).forEach(s => {
    if (s.status === 'approved') {
      s.status = 'retired'; s.replacementPending = false;
      addAudit(s.id, wlEvt(s, 'retire'), user.id, 'Retired because counterparty closed: ' + s.label, cpId);
    } else if (s.status === 'under_review') {
      s.status = 'rejected'; s.rejectReason = 'COUNTERPARTY_CLOSED';
      const rq = reqById(s.requestId);
      if (rq && rq.status === 'pending') { rq.status = 'rejected'; rq.decidedBy = user.id; rq.decidedAt = now; rq.reason = 'COUNTERPARTY_CLOSED'; }
      if (s.replacesId) { const old = ssiById(s.replacesId); if (old) old.replacementPending = false; }
      addAudit(s.id, wlEvt(s, 'reject'), user.id, 'Rejected because counterparty closed: ' + s.label, cpId);
    }
  });
  addAudit(cpId, 'counterparty:close', user.id, 'Reason: ' + reason, cpId);
  saveState();
  return { ok: true };
}

function editCp(user, cpId, name, note) {
  const cp = cpById(cpId);
  if (!cp || cp.status === 'closed') return fail('INVALID_RECORD_STATE', 'A closed counterparty cannot be edited.');
  if (!String(name).trim()) return fail('MISSING_REQUIRED_FIELD', 'Name is required');
  if (nameTaken(name, cpId)) return fail('ALREADY_EXISTS', 'A counterparty with this name already exists.');
  const before = 'name="' + cp.name + '", note="' + (cp.note || '') + '"';
  cp.name = name.trim(); cp.note = note || ''; cp.updatedBy = user.id; cp.updatedAt = new Date().toISOString();
  addAudit(cpId, 'counterparty:update', user.id, 'Before: ' + before + ' After: name="' + cp.name + '", note="' + cp.note + '"', cpId);
  saveState();
  return { ok: true };
}

function approveRequest(user, reqId, remarks) {
  const r = reqById(reqId);
  if (!r || r.status !== 'pending') return fail('INVALID_RECORD_STATE', 'This request is not awaiting approval.');
  if (r.makerId === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The maker cannot approve their own request.');
  const now = new Date().toISOString();
  if (r.type === 'create_counterparty') {
    const p = r.payload;
    if (S.counterparties.some(c => normName(c.name) === normName(p.name))) return fail('ALREADY_EXISTS', 'A counterparty with this name already exists.');
    const n = nextId('cp');
    const cp = Object.assign({}, p, { id: 'cp' + n, uuid: newUuid(), status: 'active', statusReason: '', mchRequestId: null, createdBy: r.makerId, createdAt: now, updatedBy: user.id, updatedAt: now });
    S.counterparties.unshift(cp);
    r.targetId = cp.id;
    addAudit(cp.id, 'counterparty:approve', user.id, 'Approved ' + cp.name, cp.id);
    addAudit(cp.id, 'counterparty:create', r.makerId, 'Counterparty created: ' + cp.name, cp.id);
  } else if (r.type === 'reactivate_counterparty') {
    const cp = cpById(r.targetId);
    if (!cp || cp.status !== 'suspended') return fail('INVALID_RECORD_STATE', 'The counterparty is not suspended.');
    cp.status = 'active'; cp.statusReason = ''; cp.mchRequestId = null; cp.updatedBy = user.id; cp.updatedAt = now;
    addAudit(cp.id, 'counterparty:reactivate', user.id, 'Approved. Maker: ' + userById(r.makerId).name + '. ' + (r.comment || ''), cp.id);
  } else {
    const cp = cpById(r.targetId);
    const s = ssiById(r.ssiId);
    if (!cp || cp.status !== 'active') return fail('INVALID_RECORD_STATE', 'The counterparty is not active.');
    const errs = validateSsi(s, cp.id, s.id);
    if (errs.label || errs.account || errs.address) return fail('ALREADY_EXISTS', errs.label || errs.account || errs.address);
    s.status = 'approved'; s.approvedBy = user.id; s.approvedAt = now;
    if (s.replacesId) {
      const old = ssiById(s.replacesId);
      old.status = 'retired'; old.replacementPending = false;
      addAudit(old.id, wlEvt(old, 'retire'), user.id, 'Replaced by version ' + s.version, cp.id);
    }
    addAudit(s.id, wlEvt(s, 'approve'), user.id, 'Approved version ' + s.version + ': ' + s.label, cp.id);
  }
  r.status = 'approved'; r.decidedBy = user.id; r.decidedAt = now; r.remarks = remarks || '';
  saveState();
  return { ok: true };
}

function rejectRequest(user, reqId, reason, remarks) {
  const r = reqById(reqId);
  if (!r || r.status !== 'pending') return fail('INVALID_RECORD_STATE', 'This request is not awaiting approval.');
  if (r.makerId === user.id) return fail('SELF_APPROVAL_NOT_PERMITTED', 'The maker cannot reject their own request.');
  if (!reason) return fail('MISSING_REQUIRED_FIELD', 'Reason is required');
  const now = new Date().toISOString();
  r.status = 'rejected'; r.decidedBy = user.id; r.decidedAt = now; r.reason = reason; r.remarks = remarks || '';
  if (r.type === 'reactivate_counterparty') {
    const cp = cpById(r.targetId); if (cp) cp.mchRequestId = null;
    addAudit(r.targetId, 'mch_request:reject', user.id, 'Reactivation rejected: ' + reason, r.targetId);
  } else if (r.type === 'ssi_create' || r.type === 'ssi_replace') {
    const s = ssiById(r.ssiId);
    s.status = 'rejected'; s.rejectReason = reason;
    if (s.replacesId) ssiById(s.replacesId).replacementPending = false;
    addAudit(s.id, wlEvt(s, 'reject'), user.id, 'Rejected: ' + reason, r.targetId);
  } else {
    addAudit(r.id, 'counterparty:reject', user.id, 'Rejected "' + r.payload.name + '": ' + reason);
  }
  saveState();
  return { ok: true };
}

function maskTail(v) {
  if (!v) return '-';
  return v.length <= 4 ? v : '••••' + v.slice(-4);
}
function ssiKey(s) {
  return s.assetType === 'bank' ? s.currency : (CHAINS[s.chain] || {}).name;
}

/* Views: each returns { title, crumbs, sub, buttons, html, bind(root) } */

const go = (hash) => { location.hash = hash; };
const isOperator = () => CUR.role === 'operator';
const ACT = {};

function btn(label, act, arg, cls, o) {
  o = o || {};
  return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') +
    (o.disabled ? ' disabled' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + esc(label) + '</button>';
}
function bindForm(root, st, cb) {
  root.querySelectorAll('[data-f]').forEach(el => {
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { st[el.dataset.f] = el.value; if (cb) cb(el.dataset.f, el); });
  });
  root.querySelectorAll('[data-switch]').forEach(b => b.addEventListener('click', () => { st[b.dataset.switch] = !st[b.dataset.switch]; if (cb) cb(b.dataset.switch, b); }));
}
function setHelp(root, id, text, warn) {
  const h = root.querySelector('[data-help="' + id + '"]');
  if (h) { h.textContent = text || ''; h.className = 'help' + (warn ? ' warn' : ''); }
}
const countryOpts = () => COUNTRIES.map(c => [c[0], c[1]]);
const typeOpts = () => Object.keys(TYPES).map(k => [k, TYPES[k]]);

/* ======================================================= FR-1 LIST */
function listDefaults(route) {
  if (route.parts && route.parts[0] === 'whitelists') return { label: '', who: [], scopes: [], cps: [], statuses: [], page: 1, size: 10 };
  return { name: '', uuid: '', types: [], countries: [], statuses: [], hasOpen: false, page: 1, size: 10 };
}
function listQuery(route) {
  return Object.assign(listDefaults(route), b64d(route.query.q || '') || {});
}
function setList(patch) {
  const q = Object.assign(listQuery(ROUTE), patch);
  go('#' + ROUTE.path + '?q=' + b64e(q));
}
function filterCps(f) {
  return S.counterparties.filter(c => {
    if (f.name && !normName(c.name).includes(normName(f.name))) return false;
    if (f.uuid && (!isUuid(f.uuid) || c.uuid.toLowerCase() !== f.uuid.trim().toLowerCase())) return false;
    if (f.types.length && !f.types.includes(c.type)) return false;
    if (f.countries.length && !f.countries.includes(c.countryCode)) return false;
    if (f.statuses.length && !f.statuses.includes(c.status)) return false;
    if (f.hasOpen && !openObligations(c.id).length) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listView(route) {
  const f = listQuery(route);
  const rows = filterCps(f);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / f.size));
  const page = Math.min(f.page, pages);
  const slice = rows.slice((page - 1) * f.size, page * f.size);
  const any = f.name || f.uuid || f.types.length || f.countries.length || f.statuses.length || f.hasOpen;

  const filters = '<div class="filters">' +
    '<div class="f input-wrap"><input class="input" id="flt-name" data-list-text="name" placeholder="Name" title="Matches part of the counterparty name" value="' + esc(f.name) + '"><span class="search-ico">⌕</span></div>' +
    '<div class="f input-wrap"><input class="input" id="flt-uuid" data-list-text="uuid" placeholder="Counterparty ID" title="' + (f.uuid && !isUuid(f.uuid) ? 'Enter a full, valid Counterparty ID. Partial IDs are not matched.' : 'Enter the full Counterparty ID. Partial IDs are not matched.') + '" style="' + (f.uuid && !isUuid(f.uuid) ? 'border-color:var(--error)' : '') + '" value="' + esc(f.uuid) + '"><span class="search-ico">⌕</span>' + (f.uuid && !isUuid(f.uuid) ? '<div class="help" style="color:var(--error-text)">Enter a full, valid Counterparty ID. Partial IDs are not matched.</div>' : '') + '</div>' +
    multiSelect('types', 'Type', typeOpts(), f.types) +
    multiSelect('countries', 'Country', countryOpts(), f.countries) +
    multiSelect('statuses', 'Status', Object.keys(CP_STATUS).map(k => [k, CP_STATUS[k]]), f.statuses) +
    '<label class="f-check"><button type="button" class="switch' + (f.hasOpen ? ' on' : '') + '" data-act="toggleHasOpen"></button> Has open settlements</label>' +
    (any ? '<button class="btn btn-link danger" data-act="resetList">Reset all</button>' : '') + '</div>';

  let body;
  if (!slice.length) {
    body = '<tr><td colspan="7"><div class="empty"><div class="big">No counterparties found</div>' + (any ? '<button class="btn" data-act="resetList">Reset all</button>' : '') + '</div></td></tr>';
  } else {
    body = slice.map(c => '<tr class="click" data-href="#/counterparties/' + c.id + '">' +
      '<td>' + esc(c.name) + '</td>' +
      '<td>' + esc(TYPES[c.type]) + '</td><td>' + esc(countryName(c.countryCode)) + '</td>' +
      '<td>' + badge(c.status, CP_STATUS) + '</td>' +
      '<td>' + activeSsiCount(c.id) + '</td><td>' + openObligations(c.id).length + '</td>' +
      '<td>' + dateCell(c.createdAt) + '</td></tr>').join('');
  }
  const pageBtns = [];
  for (let i = 1; i <= pages; i++) pageBtns.push('<button class="page-btn' + (i === page ? ' active' : '') + '" data-act="goPage" data-arg="' + i + '">' + i + '</button>');
  const from = total ? (page - 1) * f.size + 1 : 0;
  const to = Math.min(page * f.size, total);

  const html = filters + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Type</th><th>Country</th><th>Status</th><th>Whitelists</th><th>Open settlements</th><th>Created at</th></tr></thead><tbody>' + body + '</tbody></table>' +
    '<div class="pager"><span>' + from + '-' + to + ' of ' + total + ' items</span>' + pageBtns.join('') +
    '<select class="select" data-act-change="setSize">' + [10, 20, 50].map(n => '<option' + (n === f.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>';

  return {
    title: 'Counterparties', crumbs: ['Dashboard', 'Counterparty Management', 'Counterparties'],
    buttons: btn('Export CSV', 'exportCsv', null, '') + (isOperator() ? btn('Add Counterparty', 'addCp', null, 'btn-primary') : ''),
    html
  };
}
ACT.resetList = () => go('#' + ROUTE.path);
ACT.toggleHasOpen = () => setList({ hasOpen: !listQuery(ROUTE).hasOpen, page: 1 });
ACT.goPage = (el) => setList({ page: +el.dataset.arg });
ACT.setSize = (el) => setList({ size: +el.value, page: 1 });
ACT.exportCsv = () => {
  const rows = filterCps(listQuery(ROUTE));
  csvDownload('counterparties.csv', [['Counterparty ID', 'Name', 'Type', 'Country', 'Status', 'Whitelists', 'Open settlements', 'Created at']]
    .concat(rows.map(c => [c.uuid, c.name, TYPES[c.type], countryName(c.countryCode), CP_STATUS[c.status], activeSsiCount(c.id), openObligations(c.id).length, c.createdAt])));
  toast({ title: 'Export started', desc: rows.length + ' rows exported using the current filters.' });
};
ACT.addCp = () => { CF = null; go('#/counterparties/create'); };

/* ======================================================= FR-2 CREATE */
let CF = null;
const newCF = () => ({ name: '', type: '', countryCode: '', regulated: false, regulator: '', licence: '', docName: '', certName: '', ownerDocName: '', note: '', errors: {}, dupWarn: '' });
function fileItem(id, label, field, errKey, hint) {
  const e = CF.errors;
  return formItem(label, '<input type="file" id="' + id + '" accept=".pdf,.jpg,.jpeg">' + (CF[field] ? '<div class="note" style="margin-top:6px">Attached: ' + esc(CF[field]) + '</div>' : ''), { id: errKey, required: true, hint: hint || 'PDF or JPEG, up to 10 MB.', error: e[errKey] });
}

function createFormHtml() {
  const e = CF.errors;
  return '<div class="form-wrap">' +
    sectionTitle('Counterparty Details', 'Basic information about the counterparty.') +
    formItem('Name', inputHtml('name', CF.name, { placeholder: 'Enter counterparty name', error: e.name, maxlength: 140 }), { id: 'name', required: true, error: e.name || CF.dupWarn }) +
    '<div class="row2">' +
    formItem('Type', selectHtml('type', CF.type, typeOpts(), { placeholder: 'Select type', error: e.type }), { id: 'type', required: true, error: e.type }) +
    formItem('Country of registration', selectHtml('countryCode', CF.countryCode, countryOpts(), { placeholder: 'Select country', error: e.countryCode }), { id: 'countryCode', required: true, error: e.countryCode }) +
    '</div>' +
    formItem('Internal note', textareaHtml('note', CF.note, { placeholder: 'Enter internal note' }), { id: 'note', optional: true }) +
    '<hr class="divider">' + sectionTitle('Compliance', 'Regulated entities provide licence proof. Others provide a certificate of incorporation and an ownership document. Approval is always required.') +
    formItem('Is this counterparty regulated?', switchHtml('regulated', CF.regulated) + ' <span class="note">' + (CF.regulated ? 'Yes' : 'No') + '</span>', { id: 'regulated', required: true, hint: 'Turn on if it is licensed or authorized by a regulator.', tip: 'If regulated, provide the licence proof. If not, provide a certificate of incorporation and an ownership document. Approval is always required.' }) +
    (CF.regulated ?
      '<div class="row2">' + formItem('Regulator', inputHtml('regulator', CF.regulator, { placeholder: 'e.g. MAS', error: e.regulator, maxlength: 140 }), { id: 'regulator', required: true, error: e.regulator }) +
      formItem('Licence number', inputHtml('licence', CF.licence, { placeholder: 'Enter licence number', error: e.licence, maxlength: 70 }), { id: 'licence', required: true, error: e.licence }) + '</div>' +
      fileItem('docFile', 'Supporting document (licence or regulator register entry)', 'docName', 'doc') :
      fileItem('certFile', 'Certificate of incorporation', 'certName', 'cert') +
      fileItem('ownerFile', 'Ownership document', 'ownerDocName', 'ownerDoc', 'e.g. share register or ownership structure chart. PDF or JPEG, up to 10 MB.')) +
    '<div class="form-actions">' + btn('Exit', 'exitCreate', null, '') + btn('Submit', 'submitCreate', null, 'btn-primary') + '</div></div>';
}

function createView() {
  if (!CF) CF = newCF();
  return {
    title: 'Add New Counterparty', crumbs: ['Dashboard', 'Counterparty Management', 'Counterparties', 'Add'], buttons: '',
    html: createFormHtml(),
    bind(root) {
      bindForm(root, CF, (field) => { if (field === 'regulated') rerender(); });
      const name = root.querySelector('#name');
      if (name) name.addEventListener('blur', () => {
        CF.dupWarn = CF.name.trim() && nameTaken(CF.name) ? 'A counterparty with this name already exists.' : '';
        setHelp(root, 'name', CF.dupWarn, true);
      });
      [['docFile', 'docName', 'doc'], ['certFile', 'certName', 'cert'], ['ownerFile', 'ownerDocName', 'ownerDoc']].forEach(([id, field, key]) => {
        const file = root.querySelector('#' + id);
        if (file) file.addEventListener('change', () => {
          const f = file.files[0];
          if (!f) return;
          const okType = ['application/pdf', 'image/jpeg'].includes(f.type);
          if (!okType || f.size > 10 * 1024 * 1024) { CF[field] = ''; CF.errors[key] = 'The document must be a PDF or JPEG up to 10 MB.'; }
          else { CF[field] = f.name; delete CF.errors[key]; }
          rerender();
        });
      });
    }
  };
}
ACT.exitCreate = () => { CF = null; go('#/counterparties'); };
ACT.submitCreate = () => {
  CF.errors = validateCounterparty(CF);
  CF.dupWarn = '';
  if (Object.keys(CF.errors).length) { rerender(); return; }
  rerender();
  const rows = [['Name', esc(CF.name)], ['Type', esc(TYPES[CF.type])], ['Country of registration', esc(countryName(CF.countryCode))], ['Regulated', CF.regulated ? 'Yes' : 'No']];
  if (CF.regulated) rows.push(['Regulator', esc(CF.regulator)], ['Licence number', esc(CF.licence)], ['Supporting document', esc(CF.docName)]);
  else rows.push(['Certificate of incorporation', esc(CF.certName)], ['Ownership document', esc(CF.ownerDocName)]);
  rows.push(['Internal note', esc(CF.note || '-')]);
  openModal({
    title: 'Review counterparty', sub: 'Check the details before submitting for approval.', wide: true,
    body: dl(rows) + '<div class="form-item" style="margin-top:16px"><label>Comment <span class="opt">(Optional)</span></label><textarea class="textarea" id="rv-comment" placeholder="Add a comment for the approver"></textarea></div>',
    okText: 'Confirm and submit',
    onOk(o) {
      const p = { name: CF.name.trim(), type: CF.type, countryCode: CF.countryCode, regulated: CF.regulated, regulator: CF.regulated ? CF.regulator : '', licence: CF.regulated ? CF.licence : '', docName: CF.regulated ? CF.docName : '', certName: CF.regulated ? '' : CF.certName, ownerDocName: CF.regulated ? '' : CF.ownerDocName, note: CF.note };
      const res = submitCreateRequest(CUR, p, o.querySelector('#rv-comment').value);
      CF = null;
      toast({ title: 'Counterparty submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + res.request.id) } });
      go('#/counterparties');
    }
  });
};

/* ======================================================= FR-3 DETAIL */
let SSIF = { sub: 'bank', showRetired: false };
let TXF = { tab: 'settlements', status: 'open', dir: '', mstatus: '', asset: '', account: '', from: '', to: '', cls: '' };
Object.assign(BADGE, { detected: 'processing', confirmed: 'success', pending: 'default', submitted: 'processing', failed: 'error', open: 'processing', overdue: 'error', settled: 'success' });

const CP_TABS = ['ssi', 'tx', 'other', 'audit'];
const curTab = () => (CP_TABS.includes(ROUTE.query.tab) ? ROUTE.query.tab : 'ssi');
const setTab = (id, tab) => { go('#/counterparties/' + id + '?tab=' + tab); rerender(); };
ACT.setTab = (el) => setTab(ROUTE.parts[1], el.dataset.arg);
ACT.openSec = (el) => setTab(ROUTE.parts[1], el.dataset.arg);
function tabsHtml(defs, active) {
  return '<div class="tabs">' + defs.map(d => '<button class="tab' + (d.key === active ? ' active' : '') + '" data-act="setTab" data-arg="' + d.key + '">' + esc(d.label) + (d.flag ? '<span class="dot"></span>' : '') + '</button>').join('') + '</div>';
}
function overviewHtml(facts, attn) {
  return '<div class="overview"><h3>Overview</h3><div class="ov-grid">' + facts.map(f => '<div><div class="ov-k">' + esc(f[0]) + '</div><div class="ov-v">' + f[1] + '</div></div>').join('') + '</div>' +
    '<div class="ov-attn"><div class="ov-k">Needs attention</div>' + (attn.length ? attn.map(a => '<div class="attn ' + a.level + '"><div class="grow">' + a.html + '</div></div>').join('') : '<div class="attn-ok"><b>✓</b>Nothing needs attention.</div>') + '</div></div>';
}

function statusAlertHtml(cp) {
  const ico = '<span class="alert-ico">&#10005;</span>';
  if (cp.status === 'suspended') return '<div class="alert error alert-status">' + ico + '<div>This counterparty has been suspended. It cannot be used for new settlements.</div></div>';
  if (cp.status === 'closed') return '<div class="alert error alert-status">' + ico + '<div>This counterparty has been closed. It cannot be used for any transactions.</div></div>';
  return '';
}
function detailView(route, id) {
  const cp = cpById(id);
  if (!cp) return { title: 'Not found', crumbs: ['Dashboard', 'Counterparty Management', 'Counterparties'], buttons: '', html: '<div class="empty"><div class="big">Counterparty not found</div><a href="#/counterparties">Back to list</a></div>' };
  const opens = openObligations(cp.id);
  const overdue = opens.filter(o => o.overdue).length;
  const pending = !!cp.mchRequestId;
  const live = S.ssis.filter(s => s.scope === 'counterparty' && s.cpId === cp.id && (s.status === 'approved' || s.status === 'under_review'));
  const approved = S.ssis.filter(s => s.scope === 'counterparty' && s.cpId === cp.id && s.status === 'approved');
  const nBank = approved.filter(s => s.assetType === 'bank').length;
  const nWallet = approved.length - nBank;
  const linked = linkedFor(cp.id);

  let buttons = '';
  if (isOperator()) {
    const closeBtn = btn('Close', 'closeCp', cp.id, '', { disabled: opens.length > 0, title: opens.length ? 'Cannot close: ' + opens.length + ' open settlement(s).' : '' });
    if (pending) buttons = btn('View request', 'viewReq', cp.mchRequestId, '');
    else if (cp.status === 'active') buttons = btn('Edit', 'editCp', cp.id) + btn('Suspend', 'suspendCp', cp.id, 'btn-danger') + closeBtn;
    else if (cp.status === 'suspended') buttons = btn('Edit', 'editCp', cp.id) + btn('Reactivate', 'reactivateCp', cp.id) + closeBtn;
  }

  const mvIn = SIApp.movementsFor(cp.id).filter(m => m.dir === 'in');
  const unclassified = mvIn.filter(m => m.classification === 'unclassified').length;
  const attn = [];
  if (cp.status === 'suspended') attn.push({ level: 'grey', html: '<b>Suspended</b> on ' + esc(fmtDate(cp.suspendedAt || cp.updatedAt)) + ' by ' + esc(userById(cp.suspendedBy || cp.updatedBy).name) + '. Reason: ' + esc(cp.statusReason) + '. New settlements are blocked.' });
  if (cp.status === 'closed') attn.push({ level: 'grey', html: '<b>Closed.</b> This counterparty can no longer be used.' });
  if (overdue && cp.status !== 'closed') attn.push({ level: 'red', html: '<b>' + overdue + ' settlement' + (overdue > 1 ? 's are' : ' is') + ' overdue.</b> <a data-act="openTx" data-arg="tx">View open settlements</a>' });
  if (unclassified && cp.status !== 'closed') attn.push({ level: 'amber', html: '<b>' + unclassified + ' unclassified arrival' + (unclassified > 1 ? 's' : '') + '</b> from this counterparty. <a data-act="openIncoming">View incoming</a>' });
  if (cp.status === 'active' && !approved.length) attn.push({ level: 'amber', html: '<b>No approved bank account or wallet address yet.</b> Settlement instructions cannot use this counterparty. <a data-act="setTab" data-arg="ssi">View whitelists</a>' });
  if (pending) attn.push({ level: 'blue', html: 'A maker-checker request is pending for this counterparty. <a data-act="viewReq" data-arg="' + esc(cp.mchRequestId) + '">View request</a>' });

  const facts = [
    ['Status', badge(cp.status, CP_STATUS)],
    ['Open settlements', String(opens.length) + (overdue ? ' <span class="ov-sub" style="color:var(--error-text)">(' + overdue + ' overdue)</span>' : '')],
    ['Whitelists', approved.length + ' <span class="ov-sub">(' + nBank + ' bank, ' + nWallet + ' wallet)</span>'],
    ['Client accounts involved', String(linked.length)]
  ];
  const tab = curTab();
  const defs = [
    { key: 'ssi', label: 'Whitelists (' + live.length + ')' },
    { key: 'tx', label: 'Transactions', flag: overdue > 0 || unclassified > 0 },
    { key: 'other', label: 'Other Details' },
    { key: 'audit', label: 'Audit log' }
  ];
  const content = { ssi: () => ssiSection(cp), tx: () => txSection(cp), other: () => detailsTab(cp), audit: () => auditTab(cp) }[tab]();

  return {
    title: cp.name, sub: badge(cp.status, CP_STATUS),
    crumbs: ['Dashboard', 'Counterparty Management', 'Counterparties', cp.name], buttons,
    html: statusAlertHtml(cp) + overviewHtml(facts, attn) + tabsHtml(defs, tab) + '<div class="card"><div class="card-body">' + content + '</div></div>'
  };
}
ACT.viewReq = (el) => go('#/approvals/' + el.dataset.arg);

function docsHtml(c) {
  const link = (label, name) => '<div><a data-act="noop" title="Prototype only: no real file">' + esc(name) + '</a><span class="sub">' + esc(label) + '</span></div>';
  if (c.regulated) return c.docName ? link('Licence proof', c.docName) : '-';
  return (c.certName ? link('Certificate of incorporation', c.certName) : '') + (c.ownerDocName ? link('Ownership document', c.ownerDocName) : '') || '-';
}

function detailsTab(cp) {
  return dl([
    ['Counterparty ID', '<span class="mono">' + esc(cp.uuid) + '</span>'], ['Status', badge(cp.status, CP_STATUS)],
    ['Name', esc(cp.name)], ['Licence number', esc(cp.licence || '-')],
    ['Regulator', esc(cp.regulator || '-')], ['Documents', docsHtml(cp)],
    ['Suspension / close reason', esc(cp.statusReason || '-')], ['Internal note', esc(cp.note || '-')],
    ['Created by', esc(userById(cp.createdBy).name)], ['Created at', dateCell(cp.createdAt)],
    ['Updated by', esc(userById(cp.updatedBy).name)], ['Updated at', dateCell(cp.updatedAt)],
    ['Type', esc(TYPES[cp.type])], ['Country', esc(countryName(cp.countryCode))],
    ['Regulated', cp.regulated ? 'Yes' : 'No'], ['', '']
  ]);
}

const TX_RESET = { mstatus: '', asset: '', account: '', from: '', to: '', cls: '', dir: '' };
ACT.openTx = () => { Object.assign(TXF, TX_RESET, { tab: 'settlements', status: 'open' }); setTab(ROUTE.parts[1], 'tx'); };
ACT.openIncoming = () => { Object.assign(TXF, TX_RESET, { tab: 'incoming', status: 'open' }); setTab(ROUTE.parts[1], 'tx'); };
ACT.txTab = (el) => { Object.assign(TXF, TX_RESET, { tab: el.dataset.arg }); rerender(); };
ACT.txFilter = (el) => { TXF[el.dataset.key] = el.value; rerender(); };
ACT.classifyIn = () => go('#/exceptions');

function txSection(cp) {
  const obs = SIApp.obligationsFor(cp.id);
  const mv = SIApp.movementsFor(cp.id);
  const mvIn = mv.filter(m => m.dir === 'in');
  const mvOut = mv.filter(m => m.dir === 'out');
  const unclassified = mvIn.filter(m => m.classification === 'unclassified').length;
  const seg = (k, label, extra) => '<button class="seg-b' + (TXF.tab === k ? ' active' : '') + '" data-act="txTab" data-arg="' + k + '">' + label + (extra || '') + '</button>';
  const bar = '<div class="sec-bar"><div class="seg">' + seg('settlements', 'Settlements (' + obs.length + ')') +
    seg('incoming', 'Incoming (' + mvIn.length + ')', unclassified ? ' <span class="tag red">' + unclassified + ' unclassified</span>' : '') + seg('outgoing', 'Outgoing (' + mvOut.length + ')') + '</div></div>';
  const empty = (t) => '<div class="empty"><div class="big">' + t + '</div></div>';
  const sel = (key, opts, ph) => '<div class="f">' + selectHtml('tx-' + key, TXF[key], opts, { placeholder: ph }).replace('data-f="tx-' + key + '"', 'data-act-change="txFilter" data-key="' + key + '"') + '</div>';
  const dateIn = (key, ph) => '<div class="f"><input type="date" class="input" title="' + ph + '" data-act-change="txFilter" data-key="' + key + '" value="' + esc(TXF[key] || '') + '"></div>';
  const inRange = (d) => (!TXF.from || (d && d >= TXF.from)) && (!TXF.to || (d && d <= TXF.to));
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  let body = '';
  if (TXF.tab === 'settlements') {
    let rows = obs.filter(o => (TXF.status === '' || (TXF.status === 'open' ? o.status === 'open' : TXF.status === 'overdue' ? o.overdue : o.status === 'settled')) &&
      (!TXF.dir || o.direction === TXF.dir) && (!TXF.asset || o.asset === TXF.asset) && (!TXF.account || o.account === TXF.account) && inRange(o.due));
    const filters = '<div class="filters">' + sel('status', [['open', 'Open'], ['overdue', 'Overdue'], ['settled', 'Settled']], 'All statuses') + sel('dir', ['Deliver', 'Receive'], 'Direction') +
      sel('asset', uniq(obs.map(o => o.asset)), 'Asset') + sel('account', uniq(obs.map(o => o.account)), 'Account') + dateIn('from', 'Due from') + dateIn('to', 'Due to') + '</div>';
    body = filters + (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Settlement instruction</th><th>Obligation</th><th>Account</th><th>Direction</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>' +
      rows.map(o => '<tr class="' + (o.overdue ? 'overdue' : '') + '"><td>' + esc(o.settlement) + '</td><td>' + esc(o.id) + '</td><td>' + esc(o.account || '-') + '</td><td>' + esc(o.direction) + '</td><td>' + esc(o.amount) + ' ' + esc(o.asset) + '</td><td>' + esc(o.due) + '</td><td>' +
        (o.status === 'settled' ? badge('settled') : o.overdue ? tag('Overdue', 'red') : badge('open')) + (cp.status === 'suspended' && o.status === 'open' ? ' ' + tag('Counterparty suspended', 'gold') : '') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="tbl-wrap">' + empty(obs.length ? 'No settlements match the filters' : 'No settlements') + '</div>');
  } else if (TXF.tab === 'incoming') {
    const rows = mvIn.filter(m => (!TXF.cls || m.classification === TXF.cls) && (!TXF.mstatus || m.status === TXF.mstatus) && (!TXF.asset || m.asset === TXF.asset) && inRange(m.at));
    const filters = '<div class="filters">' + sel('cls', [['settlement', 'Settlement'], ['unclassified', 'Unclassified']], 'Classification') + sel('mstatus', [['detected', 'Detected'], ['confirmed', 'Confirmed']], 'Status') +
      sel('asset', uniq(mvIn.map(m => m.asset)), 'Asset') + dateIn('from', 'Transacted from') + dateIn('to', 'Transacted to') + '</div>';
    body = filters + (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Movement</th><th>Amount</th><th>Status</th><th>Classification</th><th>Settlement</th><th>Received from</th><th>Reference</th><th>Transacted at</th></tr></thead><tbody>' +
      rows.map(m => '<tr class="' + (m.classification === 'unclassified' ? 'overdue' : '') + '"><td><a href="#/movement-management/incoming-movement/' + esc(m.id) + '">' + esc(m.id) + '</a></td><td>' + esc(m.amount) + ' ' + esc(m.asset) + '</td><td>' + badge(m.status) + '</td><td>' +
        (m.classification === 'unclassified' ? tag('Unclassified', 'red') + ' <button class="btn btn-link btn-sm" data-act="classifyIn">Classify</button>' : tag('Settlement', 'green')) + '</td><td>' + esc(m.settlement || '-') + '</td><td>' + esc(m.via) + '</td><td class="mono">' + esc(m.ref) + '</td><td>' + esc(m.at ? fmtDate(m.at) : '-') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="note" style="margin-top:8px">Unclassified: an arrival whose sender (wallet address, or bank account and bank code) matches this counterparty but is not yet linked to a settlement. Classify it from Settlement Instructions > Exceptions.</div>'
      : '<div class="tbl-wrap">' + empty(mvIn.length ? 'No incoming movements match the filters' : 'No incoming movements') + '</div>');
  } else {
    const rows = mvOut.filter(m => (!TXF.mstatus || m.status === TXF.mstatus) && (!TXF.asset || m.asset === TXF.asset) && inRange(m.at));
    const filters = '<div class="filters">' + sel('mstatus', [['pending', 'Pending'], ['submitted', 'Submitted'], ['confirmed', 'Confirmed'], ['failed', 'Failed']], 'Status') +
      sel('asset', uniq(mvOut.map(m => m.asset)), 'Asset') + dateIn('from', 'Transacted from') + dateIn('to', 'Transacted to') + '</div>';
    body = filters + (rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Movement</th><th>Amount</th><th>Status</th><th>Settlement</th><th>Sent to</th><th>Reference</th><th>Transacted at</th></tr></thead><tbody>' +
      rows.map(m => '<tr><td><a href="#/movement-management/outgoing-movement/' + esc(m.id) + '">' + esc(m.id) + '</a></td><td>' + esc(m.amount) + ' ' + esc(m.asset) + '</td><td>' + badge(m.status) + (m.exec ? '<div class="sub">' + esc(m.exec) + '</div>' : '') + '</td><td>' + esc(m.settlement || '-') + '</td><td>' + esc(m.via) + '</td><td class="mono">' + esc(m.ref) + '</td><td>' + esc(m.at ? fmtDate(m.at) : '-') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="tbl-wrap">' + empty(mvOut.length ? 'No outgoing movements match the filters' : 'No outgoing movements') + '</div>');
  }
  return bar + body;
}

function auditTab(cp) {
  const rows = S.audit.filter(a => a.cpId === cp.id);
  if (!rows.length) return '<div class="empty">No audit events.</div>';
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Event</th><th>User</th><th>Detail</th><th>Time</th></tr></thead><tbody>' +
    rows.map(a => '<tr><td class="mono">' + esc(a.event) + '</td><td>' + esc(userById(a.userId).name) + '</td><td>' + esc(a.detail) + '</td><td>' + dateCell(a.time) + '</td></tr>').join('') + '</tbody></table></div>';
}

/* ======================================================= FR-5 / 6 / 7 / 8 actions */
ACT.editCp = (el) => {
  const cp = cpById(el.dataset.arg);
  openDrawer({
    title: 'Edit counterparty', okText: 'Save',
    body: formItem('Name', inputHtml('e-name', cp.name, { maxlength: 140 }).replace('data-f="e-name"', ''), { id: 'e-name', required: true }) +
      formItem('Type', '<input class="input" value="' + esc(TYPES[cp.type]) + '" disabled>', { hint: 'Type and country cannot be edited.' }) +
      formItem('Country of registration', '<input class="input" value="' + esc(countryName(cp.countryCode)) + '" disabled>') +
      formItem('Internal note', '<textarea class="textarea" id="e-note">' + esc(cp.note || '') + '</textarea>', { id: 'e-note', optional: true }),
    onOk(root) {
      const res = editCp(CUR, cp.id, root.querySelector('#e-name').value, root.querySelector('#e-note').value);
      if (!res.ok) { setHelp(root, 'e-name', res.message); return false; }
      toast({ title: 'Counterparty updated', desc: 'The change is recorded in the audit log.' });
      rerender();
    }
  });
};

function reasonModal(o) {
  const modal = openModal({
    title: o.title, sub: o.sub, okText: o.okText, okDanger: o.danger,
    body: (o.info || '') + '<div class="form-item"><label><span class="req">*</span>' + esc(o.label) + '</label><textarea class="textarea" id="rs-text" placeholder="' + esc(o.placeholder || '') + '"></textarea></div>',
    onMount(m) {
      const ok = m.querySelector('[data-m="ok"]'); ok.disabled = true;
      m.querySelector('#rs-text').addEventListener('input', (e) => { ok.disabled = !e.target.value.trim(); });
    },
    onOk(m) { return o.onOk(m.querySelector('#rs-text').value.trim()); }
  });
  return modal;
}
ACT.suspendCp = (el) => {
  const cp = cpById(el.dataset.arg);
  const n = openObligations(cp.id).length;
  reasonModal({
    title: 'Suspend ' + cp.name, sub: 'Takes effect immediately. No second approval is needed.', label: 'Reason', okText: 'Suspend', danger: true,
    info: '<div class="alert warning">New settlement instructions and movements to this counterparty will be blocked. ' + (n ? '<b>' + n + ' open settlement' + (n > 1 ? 's' : '') + ' will be flagged</b> for an operator decision.' : 'There are no open settlements.') + ' ' + linkedFor(cp.id).length + ' client account(s) are involved. Incoming arrivals are still recorded. Reactivation needs a second operator.</div>',
    onOk(reason) {
      const res = suspendCp(CUR, cp.id, reason);
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; }
      toast({ title: 'Counterparty suspended', desc: cp.name + ' is now suspended.' }); rerender();
    }
  });
};
ACT.reactivateCp = (el) => {
  const cp = cpById(el.dataset.arg);
  reasonModal({
    title: 'Reactivate ' + cp.name, sub: 'Needs approval from a different operator.', label: 'Why is the suspension resolved?', okText: 'Submit for approval',
    onOk(comment) {
      const res = submitReactivate(CUR, cp.id, comment);
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; }
      toast({ title: 'Reactivation submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go('#/approvals/' + res.request.id) } }); rerender();
    }
  });
};
ACT.closeCp = (el) => {
  const cp = cpById(el.dataset.arg);
  reasonModal({
    title: 'Close ' + cp.name, sub: 'Closing is permanent.', label: 'Reason', okText: 'Close counterparty', danger: true,
    info: '<div class="alert warning">All active whitelists will be retired and the counterparty cannot be reactivated.</div>',
    onOk(reason) {
      const res = closeCp(CUR, cp.id, reason);
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; }
      toast({ title: 'Counterparty closed', desc: cp.name + ' is now closed.' }); rerender();
    }
  });
};

/* ======================================================= FR-4 / FR-12 APPROVALS */
function reqSubject(r) {
  if (r.type === 'create_counterparty') return esc(r.payload.name);
  const cp = cpById(r.targetId);
  return esc(cp ? cp.name : '-') + (r.ssiId ? '<div class="sub">' + esc(ssiById(r.ssiId).label) + '</div>' : '');
}
let APPRF = { status: '' };
function approvalsView() {
  const rows = S.requests.filter(r => !APPRF.status || r.status === APPRF.status).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filters = '<div class="filters"><div class="f">' + selectHtml('apst', APPRF.status, [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']], { placeholder: 'Status' }).replace('data-f="apst"', 'data-act-change="apprFilter"') + '</div></div>';
  const body = rows.length ? rows.map(r => '<tr class="click" data-href="#/approvals/' + r.id + '"><td>' + esc(reqTitle(r)) + '<div class="sub">' + esc(r.id) + '</div></td><td>' + reqSubject(r) + '</td><td>' + esc(userById(r.makerId).name) + '</td><td>' + dateCell(r.createdAt) + '</td><td>' + badge(r.status) + '</td></tr>').join('')
    : '<tr><td colspan="5"><div class="empty">No requests.</div></td></tr>';
  return {
    title: 'Maker Checker', crumbs: ['Dashboard', 'Approval', 'Maker Checker'], buttons: '',
    html: filters + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Request</th><th>Subject</th><th>Maker</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' + body + '</tbody></table></div>'
  };
}
ACT.apprFilter = (el) => { APPRF.status = el.value; rerender(); };

function approvalDetailView(id) {
  const r = reqById(id);
  if (!r) return { title: 'Not found', crumbs: ['Dashboard', 'Approval', 'Maker Checker'], buttons: '', html: '<div class="empty">Request not found. <a href="#/approvals">Back</a></div>' };
  const mine = r.makerId === CUR.id;
  const canDecide = isOperator() && r.status === 'pending' && !mine;
  let buttons = '';
  if (canDecide) buttons = btn('Reject', 'rejectReq', r.id, 'btn-danger') + btn('Approve', 'approveReq', r.id, 'btn-primary');
  let html = '';
  if (r.status === 'pending' && mine) html += '<div class="alert info">You submitted this request. A different operator must approve or reject it.</div>';
  if (r.status === 'approved') html += '<div class="alert success">Approved by ' + esc(userById(r.decidedBy).name) + ' on ' + esc(fmtDate(r.decidedAt)) + '.</div>';
  if (r.status === 'rejected') html += '<div class="alert error">Rejected by ' + esc(userById(r.decidedBy).name) + '. Reason: ' + esc(reasonLabel(r.reason)) + (r.remarks ? '. ' + esc(r.remarks) : '') + '</div>';
  html += '<div class="card"><div class="card-head">Request</div><div class="card-body">' + dl([
    ['Request ID', esc(r.id)], ['Status', badge(r.status)], ['Type', esc(reqTitle(r))], ['Subject', reqSubject(r)],
    ['Maker', esc(userById(r.makerId).name)], ['Submitted', dateCell(r.createdAt)], ['Maker comment', esc(r.comment || '-')], ['Approver remarks', esc(r.remarks || '-')]
  ]) + '</div></div>';
  if (r.type === 'create_counterparty') {
    const p = r.payload;
    html += '<div class="card"><div class="card-head">Submitted values</div><div class="card-body">' + dl([
      ['Name', esc(p.name)], ['Type', esc(TYPES[p.type])], ['Country of registration', esc(countryName(p.countryCode))], ['Regulated', p.regulated ? 'Yes' : 'No'],
      ['Regulator', esc(p.regulator || '-')], ['Licence number', esc(p.licence || '-')], ['Documents', docsHtml(p)], ['Internal note', esc(p.note || '-')]
    ]) + '</div></div>';
  } else if (r.type === 'reactivate_counterparty') {
    const cp = cpById(r.targetId);
    html += '<div class="card"><div class="card-head">Suspension</div><div class="card-body">' + dl([['Suspended reason', esc(cp.statusReason || '-')], ['Current status', badge(cp.status, CP_STATUS)]]) + '</div></div>';
  } else {
    const s = ssiById(r.ssiId), prev = s.replacesId ? ssiById(s.replacesId) : null;
    if (prev) html += compareHtml(prev, s);
    else html += '<div class="card"><div class="card-head">Submitted whitelist</div><div class="card-body">' + dl(ssiRows(s)) + '</div></div>';
  }
  return { title: reqTitle(r), sub: badge(r.status), crumbs: ['Dashboard', 'Approval', 'Maker Checker', r.id], buttons, html };
}
function compareHtml(a, b) {
  const rowsA = ssiRows(a), rowsB = ssiRows(b);
  const skip = ['Status', 'Version', 'Replaces', 'Created by', 'Created at', 'Approved by', 'Approved at', 'Rejection reason'];
  const body = rowsB.map((rb, i) => {
    if (skip.includes(rb[0])) return '';
    const ra = rowsA[i];
    const changed = ra[1] !== rb[1];
    return '<tr><th>' + esc(rb[0]) + '</th><td>' + ra[1] + '</td><td class="' + (changed ? 'chg' : '') + '">' + rb[1] + '</td></tr>';
  }).join('');
  return '<div class="card"><div class="card-head">Compare: version ' + a.version + ' (current) and version ' + b.version + ' (proposed)</div><div class="card-body"><table class="cmp"><thead><tr><th>Field</th><th>Current</th><th>Proposed</th></tr></thead><tbody>' + body + '</tbody></table><div class="note" style="margin-top:8px">Changed values are highlighted.</div></div></div>';
}
ACT.approveReq = (el) => {
  const id = el.dataset.arg;
  openModal({
    title: 'Approve request', sub: 'The request is revalidated when you approve.', okText: 'Approve',
    body: '<div class="form-item"><label>Remarks <span class="opt">(Optional)</span></label><textarea class="textarea" id="ap-remarks"></textarea></div>',
    onOk(m) {
      const res = approveRequest(CUR, id, m.querySelector('#ap-remarks').value);
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message + ' The request stays awaiting approval.' }); return false; }
      toast({ title: 'Request approved', desc: 'The change has been applied.' }); rerender();
    }
  });
};
ACT.rejectReq = (el) => {
  const id = el.dataset.arg; const r = reqById(id);
  const reasons = rejectReasonsFor(r);
  openModal({
    title: 'Reject request', sub: 'A reason is required.', okText: 'Reject', okDanger: true,
    body: '<div class="form-item"><label><span class="req">*</span>Reason</label><select class="select" id="rj-reason"><option value="">Select reason</option>' + Object.keys(reasons).map(k => '<option value="' + k + '">' + esc(reasons[k]) + '</option>').join('') + '</select><div class="help" id="rj-help"></div></div>' +
      '<div class="form-item"><label>Remarks <span class="opt">(Optional)</span></label><textarea class="textarea" id="rj-remarks"></textarea></div>',
    onOk(m) {
      const reason = m.querySelector('#rj-reason').value;
      if (!reason) { m.querySelector('#rj-help').textContent = 'Reason is required'; return false; }
      const res = rejectRequest(CUR, id, reason, m.querySelector('#rj-remarks').value);
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; }
      toast({ title: 'Request rejected' }); rerender();
    }
  });
};

/* ======================================================= FR-13 CLIENT PICKER */
let PK = { q: '', sel: null };
function clientPayload() {
  return S.counterparties.filter(c => c.status === 'active' || c.status === 'suspended').map(c => ({ id: c.id, name: c.name, type: c.type, status: c.status }));
}
ACT.noop = () => {};

/* Whitelisted Bank Account and Whitelist Address with a Who is this for? choice (Client or Counterparty) above the existing Scope field. Counterparty records can also be added from the counterparty page. */

const WLK = {
  bank: { title: 'Whitelisted Bank Accounts', one: 'Whitelisted Bank Account', base: '#/whitelists/bank-accounts', type: 'bank', scopes: [['account', 'Account'], ['entity', 'Entity'], ['counterparty', 'Counterparty']] },
  wallet: { title: 'Whitelist Addresses', one: 'Whitelist Address', base: '#/whitelists/addresses', type: 'wallet', scopes: [['account', 'Account'], ['counterparty', 'Counterparty']] }
};
const SCOPE_LABEL = { account: 'Account', entity: 'Entity', counterparty: 'Counterparty' };
const ASSETS_BY_CHAIN = { ethereum: ['ETH', 'USDC', 'USDT', 'UNIT', 'TOKEN'], polygon: ['MATIC', 'USDC'], bitcoin: ['BTC'], solana: ['SOL', 'USDC'] };
const ORIGINS = ['Exchange', 'Non-custodial Wallet', 'Others'];
const wlRecs = (kind) => S.ssis.filter(s => s.assetType === WLK[kind].type);
const shortAddr = (a) => (a && a.length > 16 ? a.slice(0, 8) + '…' + a.slice(-6) : a || '-');

const wlMatch = (s, f) => {
  if (f.label && !normName(s.label).includes(normName(f.label))) return false;
  if (f.who.length && !f.who.includes(s.scope === 'counterparty' ? 'counterparty' : 'client')) return false;
  if (f.scopes.length && !f.scopes.includes(s.scope)) return false;
  if (f.cps.length && !f.cps.includes(s.cpId)) return false;
  if (f.statuses.length && !f.statuses.includes(s.status)) return false;
  return true;
};
function ownerCell(s) {
  if (s.scope === 'counterparty') {
    const cp = cpById(s.cpId);
    return tag('Counterparty', 'gold') + '<div>' + esc(cp ? cp.name : '-') + '</div>';
  }
  return tag('Client', 'blue') + '<div>' + esc(s.clientName || s.ownerName || '-') + '</div>';
}
function scopeCell(s) {
  if (s.scope === 'counterparty') return '<span class="sub">-</span>';
  return esc(SCOPE_LABEL[s.scope] || s.scope) + '<div class="sub">' + esc(s.ownerCode || '') + '</div>';
}

/* Shared detail rows (also used by the approvals pages and the review modal) */
function ssiRows(s) {
  const bank = s.assetType === 'bank';
  const prev = s.replacesId ? ssiById(s.replacesId) : null;
  const cp = s.scope === 'counterparty' ? cpById(s.cpId) : null;
  const owner = cp ? '<a href="#/counterparties/' + cp.id + '">' + esc(cp.name) + '</a>' : esc((s.ownerName || '-') + ' | ' + (s.ownerCode || ''));
  const rows = [['Label', esc(s.label)], ['Who is this for?', cp ? 'Counterparty' : 'Client']].concat(cp ? [] : [['Scope', esc(SCOPE_LABEL[s.scope] || s.scope)]]).concat([[cp ? 'Counterparty' : (s.scope === 'entity' ? 'Entity' : 'Account'), owner], ['Status', badge(s.status, SSI_STATUS)]]);
  if (bank) {
    rows.push(['Asset (currency)', esc(s.currency || '-')], ['Bank country', esc(countryName(s.bankCountry))], ['SWIFT/BIC', esc(s.swift || '-')], ['Bank account number', '<span class="mono">' + esc(s.account || '-') + '</span>'],
      ['Intermediary SWIFT', esc(s.intermediary || '-')], ['Routing code', esc(s.routing || '-')], ['Beneficiary name', esc(s.beneName || '-')],
      ['Beneficiary country', esc(countryName(s.beneCountry))], ['Town / City', esc(s.beneCity || '-')], ['Postal code', esc(s.benePostal || '-')],
      ['Street name', esc(s.beneStreet || '-')], ['Building name / number', esc(((s.beneBuildingName || '') + ' ' + (s.beneBuildingNo || '')).trim() || '-')],
      ['Floor / Room', esc(((s.beneFloor || '') + ' ' + (s.beneRoom || '')).trim() || '-')]);
  } else {
    rows.push(['Blockchain', esc((CHAINS[s.chain] || {}).name || '-')], ['Asset', esc(s.asset || '-')], ['Wallet address', '<span class="mono">' + esc(s.address || '-') + '</span>'],
      ['Recipient', cp ? esc(cp.name) + '<span class="sub">' + esc(countryName(cp.countryCode)) + '</span>' : esc(s.ownerName || '-')],
      ['Address origin', esc(s.origin || '-')], ['Origin detail', esc(s.originDetail || '-')]);
  }
  rows.push(['Version', String(s.version || 1)], ['Replaces', prev ? '<a href="' + WLK[kindOfRec(prev)].base + '/' + prev.id + '">Version ' + prev.version + '</a>' : '-']);
  if (s.scope !== 'counterparty' && bank) rows.push(['KYC reliance', 'Available'], ['Bank statement', '<a data-act="noop">statement.pdf</a>']);
  rows.push(['Verification note', esc(s.note || '-')], ['Created by', esc(userById(s.createdBy).name)], ['Created at', dateCell(s.createdAt)],
    ['Approved by', s.approvedBy ? esc(userById(s.approvedBy).name) : '-'], ['Approved at', s.approvedAt ? dateCell(s.approvedAt) : '-'],
    ['Rejection reason', s.rejectReason ? esc(reasonLabel(s.rejectReason)) : '-']);
  return rows;
}
const kindOfRec = (s) => (s.assetType === 'bank' ? 'bank' : 'wallet');

/* ======================================================= Counterparty page: Whitelists tab (FR-9 of the Counterparties PRD) */
function ssiSection(cp) {
  const all = S.ssis.filter(s => s.scope === 'counterparty' && s.cpId === cp.id);
  const isLive = (s) => s.status === 'approved' || s.status === 'under_review';
  const nBank = all.filter(s => s.assetType === 'bank' && isLive(s)).length;
  const nWallet = all.filter(s => s.assetType === 'wallet' && isLive(s)).length;
  const sub = SSIF.sub;
  let rows = all.filter(s => s.assetType === sub);
  if (!SSIF.showRetired) rows = rows.filter(isLive);
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const canAdd = isOperator() && cp.status === 'active' && !cp.mchRequestId;
  const addLbl = sub === 'bank' ? '+ Add Bank Account' : '+ Add Wallet Address';
  const addBtn = !isOperator() ? '' : canAdd ? btn(addLbl, 'sdAdd', sub + '|' + cp.id, 'btn-primary') : btn(addLbl, 'noop', null, 'btn-primary', { disabled: true, title: cp.status === 'active' ? 'A request is pending for this counterparty.' : 'Only an active counterparty can receive new whitelists.' });
  const bar = '<div class="sec-bar"><div class="seg"><button class="seg-b' + (sub === 'bank' ? ' active' : '') + '" data-act="ssiSub" data-arg="bank">Bank Accounts (' + nBank + ')</button><button class="seg-b' + (sub === 'wallet' ? ' active' : '') + '" data-act="ssiSub" data-arg="wallet">Wallet Addresses (' + nWallet + ')</button></div>' +
    '<label class="f-check"><button type="button" class="switch' + (SSIF.showRetired ? ' on' : '') + '" data-act="toggleRetired"></button> Show retired</label><span style="flex:1"></span>' + addBtn + '</div>';
  const head = sub === 'bank' ? '<th>Label</th><th>Currency</th><th>SWIFT/BIC</th><th>Key detail</th><th>Version</th><th>Status</th><th>Created at</th>' : '<th>Label</th><th>Asset</th><th>Blockchain</th><th>Address</th><th>Version</th><th>Status</th><th>Created at</th>';
  const body = rows.length ? rows.map(s => {
    const href = WLK[sub].base + '/' + s.id;
    const mid = sub === 'bank' ? '<td>' + esc(s.currency) + '</td><td>' + esc(s.swift) + '</td><td class="mono">' + esc(maskTail(s.account)) + '</td>' : '<td>' + esc(s.asset) + '</td><td>' + esc((CHAINS[s.chain] || {}).name) + '</td><td class="mono">' + esc(shortAddr(s.address)) + '</td>';
    return '<tr class="click" data-href="' + href + '"><td><a href="' + href + '">' + esc(s.label) + '</a></td>' + mid + '<td>' + s.version + '</td><td>' + badge(s.status, SSI_STATUS) + (s.replacementPending ? ' ' + tag('Replacement pending', 'gold') : '') + '</td><td>' + dateCell(s.createdAt) + '</td></tr>';
  }).join('') : '<tr><td colspan="7"><div class="empty"><div class="big">No ' + (sub === 'bank' ? 'bank accounts' : 'wallet addresses') + '</div></div></td></tr>';
  return bar + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    '<div class="note" style="margin-top:8px">One record per currency or asset. These are Whitelisted Bank Account and Whitelist Address records that belong to this counterparty. You can add them here, or from the <a href="#/whitelists/bank-accounts">Whitelisted Bank Account</a> and <a href="#/whitelists/addresses">Whitelist Address</a> pages (Who is this for? Counterparty). Never shown to clients.</div>';
}
ACT.sdAdd = (el) => { const [kind, cpId] = el.dataset.arg.split('|'); WF = null; go(WLK[kind].base + '/create?cp=' + cpId); };
ACT.ssiSub = (el) => { SSIF.sub = el.dataset.arg; rerender(); };
ACT.toggleRetired = () => { SSIF.showRetired = !SSIF.showRetired; rerender(); };

/* ======================================================= LIST (FR-2 / FR-7) */
/* Whitelist Management is its own sidebar item. Its page has two tabs: Whitelist Addresses and Whitelist Bank Accounts */
function acctTabsHtml(kind) {
  return '<div class="tabs"><button class="tab' + (kind === 'wallet' ? ' active' : '') + '" data-href="#/whitelists/addresses">Whitelist Addresses</button><button class="tab' + (kind === 'bank' ? ' active' : '') + '" data-href="#/whitelists/bank-accounts">Whitelist Bank Accounts</button></div>';
}
function wlListView(route, kind) {
  const K = WLK[kind];
  const f = listQuery(route);
  const rows = wlRecs(kind).filter(s => wlMatch(s, f)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / f.size));
  const page = Math.min(f.page, pages);
  const slice = rows.slice((page - 1) * f.size, page * f.size);
  const any = f.label || f.who.length || f.scopes.length || f.cps.length || f.statuses.length;
  const onlyCp = f.who.length === 1 && f.who[0] === 'counterparty', onlyClient = f.who.length === 1 && f.who[0] === 'client';
  const off = (label, tip) => '<div class="f"><button type="button" class="ms-btn ph" disabled title="' + esc(tip) + '"><span>' + esc(label) + '</span><span>\u25be</span></button></div>';

  const filters = '<div class="filters">' +
    '<div class="f input-wrap"><input class="input" id="flt-label" data-list-text="label" placeholder="Label" title="Matches part of the label" value="' + esc(f.label) + '"><span class="search-ico">⌕</span></div>' +
    multiSelect('who', 'Owner', [['client', 'Client'], ['counterparty', 'Counterparty']], f.who) +
    (kind === 'wallet' ? '' : onlyCp ? off('Scope', 'Only applies to clients') : multiSelect('scopes', 'Scope', K.scopes.filter(sc => sc[0] !== 'counterparty'), f.scopes)) +
    (onlyClient ? off('Counterparty', 'Only applies to counterparties') : multiSelect('cps', 'Counterparty', S.counterparties.map(c => [c.id, c.name + ' | ' + TYPES[c.type]]), f.cps)) +
    multiSelect('statuses', 'Status', Object.keys(SSI_STATUS).map(k => [k, SSI_STATUS[k]]), f.statuses) +
    (any ? '<button class="btn btn-link danger" data-act="resetList">Reset all</button>' : '') + '</div>';

  const head = kind === 'bank'
    ? '<th>Label | ID</th><th>Asset</th><th>Owner</th><th>Scope</th><th>SWIFT/BIC</th><th>Status</th>'
    : '<th>Label | ID</th><th>Asset</th><th>Blockchain</th><th>Address value</th><th>Owner</th><th>Status</th>';
  const cols = 6;
  const labelCell = (s) => esc(s.label) + (s.version > 1 ? ' ' + tag('v' + s.version, 'blue') : '') + '<div class="sub">' + esc(s.id) + '</div>';
  const statusCell = (s) => badge(s.status, SSI_STATUS) + (s.replacementPending ? ' ' + tag('Replacement pending', 'gold') : '');
  const body = slice.length ? slice.map(s => '<tr class="click" data-href="' + K.base + '/' + s.id + '"><td>' + labelCell(s) + '</td>' +
    (kind === 'bank'
      ? '<td>' + esc(s.currency) + '</td><td>' + ownerCell(s) + '</td><td>' + scopeCell(s) + '</td><td>' + esc(s.swift) + '</td><td>' + statusCell(s) + '</td>'
      : '<td>' + esc(s.asset) + '</td><td>' + esc((CHAINS[s.chain] || {}).name) + '</td><td class="mono">' + esc(shortAddr(s.address)) + '</td><td>' + ownerCell(s) + '</td><td>' + statusCell(s) + '</td>') + '</tr>').join('')
    : '<tr><td colspan="' + cols + '"><div class="empty"><div class="big">No records found</div>' + (any ? '<button class="btn" data-act="resetList">Reset all</button>' : '') + '</div></td></tr>';
  const pageBtns = [];
  for (let i = 1; i <= pages; i++) pageBtns.push('<button class="page-btn' + (i === page ? ' active' : '') + '" data-act="goPage" data-arg="' + i + '">' + i + '</button>');
  const from = total ? (page - 1) * f.size + 1 : 0;
  const to = Math.min(page * f.size, total);
  const html = acctTabsHtml(kind) + filters + '<div class="note" style="margin:-8px 0 12px">Prototype note: the existing filters (ID, asset, SWIFT code, account, entity) are not simulated here. Only the filters added or changed for the counterparty scope are shown.</div>' + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
    '<div class="pager"><span>' + from + '-' + to + ' of ' + total + ' items</span>' + pageBtns.join('') +
    '<select class="select" data-act-change="setSize">' + [10, 20, 50].map(n => '<option' + (n === f.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>';
  return {
    title: 'Whitelist Management', crumbs: ['Dashboard', 'Whitelist Management', K.title],
    buttons: btn('Export CSV', 'wlExport', kind, '') + (isOperator() ? btn('Add New ' + K.one, 'wlAdd', kind, 'btn-primary') : ''),
    html
  };
}
ACT.wlAdd = (el) => { WF = null; go(WLK[el.dataset.arg].base + '/create'); };
ACT.wlExport = (el) => {
  const kind = el.dataset.arg;
  const f = listQuery(ROUTE);
  const rows = wlRecs(kind).filter(s => wlMatch(s, f));
  csvDownload(kind + '-whitelist.csv', [['ID', 'Label', 'Who is this for?', 'Scope', 'Owner', 'Counterparty', 'Version', 'Status']].concat(rows.map(s => {
    const cp = cpById(s.cpId);
    return [s.id, s.label, s.scope === 'counterparty' ? 'Counterparty' : 'Client', s.scope === 'counterparty' ? '' : s.scope, s.ownerName || '', cp ? cp.name : '', s.version, SSI_STATUS[s.status]];
  })));
  toast({ title: 'Export started', desc: rows.length + ' rows exported using the current filters, including counterparty and version.' });
};

/* ======================================================= DETAIL (FR-3 / FR-5 / FR-7) */
function wlDetailView(kind, id) {
  const K = WLK[kind];
  const s = ssiById(id);
  if (!s || kindOfRec(s) !== kind) return { title: 'Not found', crumbs: ['Dashboard', 'Whitelist Management'], buttons: '', html: '<div class="empty"><div class="big">Record not found</div><a href="' + K.base + '">Back to list</a></div>' };
  const cp = s.scope === 'counterparty' ? cpById(s.cpId) : null;
  const req = reqById(s.requestId);
  const mine = req && req.makerId === CUR.id;
  const canDecide = isOperator() && s.status === 'under_review' && req && req.status === 'pending' && !mine && s.scope === 'counterparty';
  let buttons = '';
  if (canDecide) buttons = btn('Reject', 'rejectReq', req.id, 'btn-danger') + btn('Approve', 'approveReq', req.id, 'btn-primary');
  else if (isOperator() && s.status === 'under_review' && req) buttons = btn('View request', 'viewReq', req.id, '');
  if (isOperator() && s.scope === 'counterparty' && s.status === 'approved' && cp && cp.status === 'active' && !s.replacementPending) buttons = btn('Replace', 'wlReplace', kind + '|' + s.id, 'btn-primary');

  let html = '';
  const noun = kind === 'bank' ? 'Bank account' : 'Wallet address';
  if (s.status === 'approved') html += '<div class="alert success">' + (s.scope === 'counterparty' ? noun + ' approved. It can be used for settlement with this counterparty.' : 'Approved and ready to use.') + '</div>';
  if (s.status === 'rejected') html += '<div class="alert error">This request has been declined. Reason: ' + esc(reasonLabel(s.rejectReason)) + '.</div>';
  if (s.status === 'retired') {
    const succ = S.ssis.find(x => x.replacesId === s.id && x.status === 'approved');
    html += '<div class="alert grey">' + (succ ? 'This version has been replaced by version ' + succ.version + '.' : 'Retired because the counterparty is closed.') + '</div>';
  }
  if (s.status === 'under_review' && mine) html += '<div class="alert info">You submitted this request. A different operator must approve or reject it.</div>';
  if (s.replacementPending) html += '<div class="alert warning">A replacement is awaiting approval. Open settlements keep the version they were created with.</div>';
  html += '<div class="card"><div class="card-head">Details</div><div class="card-body">' + dl(ssiRows(s)) + '</div></div>';
  if (s.status === 'under_review' && s.replacesId) html += compareHtml(ssiById(s.replacesId), s);
  if (req) html += '<div class="card"><div class="card-head">Request</div><div class="card-body">' + dl([['Request ID', esc(req.id)], ['Request status', badge(req.status)], ['Maker', esc(userById(req.makerId).name)], ['Maker comment', esc(req.comment || '-')]]) + '</div></div>';
  const audit = S.audit.filter(a => a.entityId === s.id);
  html += '<div class="card"><div class="card-head">Audit log</div><div class="card-body">' + (audit.length ? '<table class="cmp"><tbody>' + audit.map(a => '<tr><td class="mono">' + esc(a.event) + '</td><td>' + esc(userById(a.userId).name) + '</td><td>' + esc(a.detail) + '</td><td>' + dateCell(a.time) + '</td></tr>').join('') + '</tbody></table>' : '<div class="note">No audit events.</div>') + '</div></div>';
  return {
    title: s.label, sub: esc(s.id) + ' ' + badge(s.status, SSI_STATUS) + (s.version > 1 ? ' ' + tag('v' + s.version, 'blue') : '') + (s.replacementPending ? ' ' + tag('Replacement pending', 'gold') : ''),
    crumbs: ['Dashboard', 'Whitelist Management', K.title, s.label], buttons, html
  };
}
ACT.wlReplace = (el) => { const [kind, id] = el.dataset.arg.split('|'); WF = null; go(WLK[kind].base + '/create?replace=' + id); };

/* ======================================================= CREATE / REPLACE (FR-1, FR-4, FR-6, FR-8) */
let WF = null;
const BANK_COPY = ['bankCountry', 'swift', 'account', 'intermediary', 'routing', 'beneName', 'beneCountry', 'beneCity', 'benePostal', 'beneStreet', 'beneBuildingName', 'beneBuildingNo', 'beneFloor', 'beneRoom'];
const FORM_FIELDS = {
  bank: ['label', 'currency'].concat(BANK_COPY, ['cpId', 'note']),
  wallet: ['label', 'chain', 'asset', 'address', 'origin', 'originDetail', 'cpId', 'note']
};
function blankWl(kind) {
  const f = { assetType: WLK[kind].type, errors: {}, warn: '', scope: 'account', cpId: '', copyFrom: '', note: '', label: '' };
  FORM_FIELDS[kind].forEach(k => { if (!(k in f)) f[k] = ''; });
  return f;
}
function wlInit(kind, replaceId, fromCp) {
  const key = kind + ':' + (replaceId || 'new') + ':' + (fromCp || '');
  if (WF && WF._key === key) return;
  WF = blankWl(kind);
  WF._key = key; WF.kind = kind;
  if (fromCp && !replaceId) { WF.cpId = fromCp; WF.fromCp = fromCp; WF.scope = 'counterparty'; if (kind === 'bank' && cpById(fromCp)) WF.beneName = cpById(fromCp).name; }
  if (replaceId) {
    const old = ssiById(replaceId);
    FORM_FIELDS[kind].forEach(k => { WF[k] = old[k] == null ? '' : old[k]; });
    WF.note = '';
    WF.replacesId = old.id; WF.scope = 'counterparty';
  }
}

function wlFormHtml() {
  const F = WF, e = F.errors, K = WLK[F.kind], lock = !!F.replacesId;
  const cpOptions = S.counterparties.filter(c => c.status === 'active' || c.id === F.cpId).map(c => [c.id, c.name + ' | ' + TYPES[c.type]]);
  const cp = cpById(F.cpId);
  const isCp = F.scope === 'counterparty';
  let scopeHtml;
  if (F.fromCp || lock) {
    scopeHtml = '<div class="form-item"><label>Who is this for?</label><div class="for-line"><b>Counterparty</b>' + (cp ? ' &middot; ' + esc(cp.name) + ' <span class="sub">' + esc(TYPES[cp.type]) + '</span>' : '') + '</div></div>';
  } else {
    scopeHtml = '<div class="form-item"><label><span class="req">*</span>Who is this for?</label><div class="seg">' +
      [['client', 'Client'], ['counterparty', 'Counterparty']].map(w => '<button type="button" class="seg-b' + ((w[0] === 'counterparty') === isCp ? ' active' : '') + '" data-who="' + w[0] + '">' + w[1] + '</button>').join('') + '</div>' +
      (isCp ? '<div class="sub" style="margin-top:6px">An outside party we settle with. Operators only, never shown to clients.</div>' : '') + '</div>';
    if (!isCp && F.kind === 'bank') {
      scopeHtml += '<div class="form-item"><label><span class="req">*</span>Scope<span class="tip" title="Account: only this account can use the whitelist. Entity: every account of the entity can use it.">?</span></label><div>' +
        K.scopes.filter(sc => sc[0] !== 'counterparty').map(sc => '<label style="margin-right:24px"><input type="radio" name="scope" data-scope="' + sc[0] + '"' + (F.scope === sc[0] ? ' checked' : '') + '> ' + esc(sc[1]) + '</label>').join('') + '</div></div>';
    }
  }
  if (F.scope !== 'counterparty') {
    return '<div class="form-wrap">' + sectionTitle('Whitelist Details', 'Basic information about the ' + (F.kind === 'bank' ? 'whitelist bank account.' : 'whitelist address.')) + scopeHtml +
      '<div class="alert info">Client whitelists (Account and Entity) work as they do today and are not simulated in this prototype. Choose <b>Counterparty</b> to continue.</div>' +
      '<div class="form-actions">' + btn('Exit', 'wlExit', null, '') + '</div></div>';
  }
  let h = '<div class="form-wrap">' + sectionTitle('Whitelist Details', 'Basic information about the ' + (F.kind === 'bank' ? 'whitelist bank account.' : 'whitelist address.')) + scopeHtml +
    (lock ? '<div class="alert info">Open settlements keep the details they were created with. This creates version ' + (ssiById(F.replacesId).version + 1) + ' and retires version ' + ssiById(F.replacesId).version + ' when approved.</div>' : '') +
(F.fromCp || lock ? '' :     formItem('Counterparty', selectHtml('cpId', F.cpId, cpOptions, { placeholder: 'Search and select counterparty', disabled: lock || F.fromCp, error: e.cpId }), { id: 'cpId', required: true, error: e.cpId, hint: lock ? '' : (F.fromCp ? 'Set from the counterparty page.' : 'Only active counterparties are offered.') }));
  if (F.kind === 'bank' && !lock && F.cpId) {
    const sameCp = S.ssis.filter(s => s.scope === 'counterparty' && s.cpId === F.cpId && s.assetType === 'bank' && (s.status === 'approved' || s.status === 'under_review'));
    if (sameCp.length) h += formItem('Copy details from', selectHtml('copyFrom', F.copyFrom, sameCp.map(s => [s.id, s.label + ' (' + s.currency + ')']), { placeholder: 'Optional: pre-fill from an existing record' }), { id: 'copyFrom', optional: true, tip: 'Fills in the bank, beneficiary and address fields from another record of this counterparty. You choose the currency yourself.', hint: 'Fills in the bank, beneficiary and address fields. Choose the new currency yourself.' });
  }
  h += formItem('Label', inputHtml('label', F.label, { placeholder: 'e.g. LP SGD bank (DBS)', error: e.label, maxlength: 70 }), { id: 'label', required: true, error: e.label, tip: 'A name your team will recognise, for example "LP SGD bank (DBS)". It must be unique for this counterparty.' });
  if (F.kind === 'bank') {
    h += formItem('Asset (currency)', selectHtml('currency', F.currency, FIAT, { disabled: lock, error: e.currency, placeholder: 'Select currency' }), { id: 'currency', required: true, error: e.currency, tip: 'The currency this bank account receives. If the same account is used in another currency, add it again as a separate record.', hint: 'One record per currency. Add the same account again for another currency.' }) +
      '<hr class="divider">' + sectionTitle('Bank Details', 'Details of the counterparty bank account.') +
      '<div class="row2">' + formItem('Bank country', selectHtml('bankCountry', F.bankCountry, countryOpts(), { error: e.bankCountry, placeholder: 'Select country' }), { id: 'bankCountry', required: true, error: e.bankCountry }) +
      formItem('SWIFT/BIC', inputHtml('swift', F.swift, { error: e.swift, maxlength: 11, placeholder: '8 or 11 characters' }), { id: 'swift', required: true, error: e.swift, tip: 'The bank\'s code, 8 or 11 characters, for example DBSSSGSG. It identifies the bank, not the account.' }) + '</div>' +
      formItem('Account number / IBAN', inputHtml('account', F.account, { error: e.account, maxlength: 34 }), { id: 'account', required: true, error: e.account, tip: 'The account number exactly as the bank shows it. For IBAN countries, enter the full IBAN without spaces.' }) +
      ((F.moreBank || F.intermediary || F.routing)
        ? '<div class="opt-group"><div class="opt-head"><span>Intermediary bank and routing (optional)</span><a data-act="wlLess" data-arg="bank">Remove</a></div><div class="row2">' +
          formItem('Intermediary bank SWIFT', inputHtml('intermediary', F.intermediary, { error: e.intermediary, maxlength: 11, placeholder: 'e.g. CHASUS33' }), { id: 'intermediary', error: e.intermediary, tip: 'Only needed when payments must go through another bank first. Use the code the beneficiary bank gave you.' }) +
          formItem('Routing code', inputHtml('routing', F.routing, { error: e.routing, maxlength: 31, placeholder: 'e.g. sort code or ABA number' }), { id: 'routing', error: e.routing, tip: 'A local bank code such as a sort code, ABA routing number or BSB. Only some countries need it.' }) + '</div></div>'
        : '<div class="add-opt"><button type="button" class="btn btn-link" data-act="wlMore" data-arg="bank">+ Add intermediary bank or routing code</button></div>') +
      '<hr class="divider">' + sectionTitle('Beneficiary Profile') +
      formItem('Beneficiary name', inputHtml('beneName', F.beneName, { error: e.beneName, maxlength: 140, placeholder: 'Exactly as on the bank account' }), { id: 'beneName', required: true, tip: 'The account holder\'s name exactly as the bank has it. A different name can make the bank reject the payment.', error: e.beneName || F.warn, warn: !e.beneName && !!F.warn, hint: F.beneName === (cp && cp.name) ? 'Filled in from the counterparty name. Change it if the bank account is held under another name.' : '' }) +
      '<hr class="divider">' + sectionTitle('Beneficiary Address') +
      '<div class="row2">' + formItem('Country', selectHtml('beneCountry', F.beneCountry, countryOpts(), { error: e.beneCountry, placeholder: 'Select country' }), { id: 'beneCountry', required: true, error: e.beneCountry }) +
      formItem('Town / City', inputHtml('beneCity', F.beneCity, { error: e.beneCity, maxlength: 35 }), { id: 'beneCity', required: true, error: e.beneCity }) + '</div>' +
      '<div class="row2">' + formItem('Postal code', inputHtml('benePostal', F.benePostal, { maxlength: 16 }), { id: 'benePostal', optional: true }) +
      formItem('Street name', inputHtml('beneStreet', F.beneStreet, { maxlength: 70 }), { id: 'beneStreet', optional: true }) + '</div>' +
      ((F.moreAddr || F.beneBuildingName || F.beneBuildingNo || F.beneFloor || F.beneRoom)
        ? '<div class="opt-group"><div class="opt-head"><span>Building details (optional)</span><a data-act="wlLess" data-arg="addr">Remove</a></div><div class="row4">' +
          formItem('Building name', inputHtml('beneBuildingName', F.beneBuildingName, { maxlength: 35, placeholder: 'Tower A' }), { id: 'beneBuildingName' }) +
          formItem('Building no.', inputHtml('beneBuildingNo', F.beneBuildingNo, { maxlength: 16, placeholder: '12' }), { id: 'beneBuildingNo' }) +
          formItem('Floor', inputHtml('beneFloor', F.beneFloor, { maxlength: 70, placeholder: '5' }), { id: 'beneFloor' }) +
          formItem('Room', inputHtml('beneRoom', F.beneRoom, { maxlength: 70, placeholder: '501' }), { id: 'beneRoom' }) + '</div></div>'
        : '<div class="add-opt"><button type="button" class="btn btn-link" data-act="wlMore" data-arg="addr">+ Add building, floor or room</button></div>');
  } else {
    const assets = F.chain ? ASSETS_BY_CHAIN[F.chain] : [];
    h += '<div class="row2">' + formItem('Blockchain Network', selectHtml('chain', F.chain, Object.keys(CHAINS).map(k => [k, CHAINS[k].name]), { disabled: lock, error: e.chain, placeholder: 'Select blockchain' }), { id: 'chain', required: true, error: e.chain, tip: 'The network the address is on. Sending on the wrong network can lose the funds.' }) +
      formItem('Asset', selectHtml('asset', F.asset, assets, { disabled: lock || !F.chain, error: e.asset, placeholder: F.chain ? 'Select asset' : 'Select blockchain first' }), { id: 'asset', required: true, error: e.asset, tip: 'The token this address receives. If the same address is used for another asset, add it again as a separate record.', hint: 'One record per asset.' }) + '</div>' +
      formItem('Address', inputHtml('address', F.address, { error: e.address, placeholder: 'Enter wallet address' }), { id: 'address', required: true, error: e.address, tip: 'The wallet address exactly as the counterparty gave it. It is checked against the selected network.' }) +
      '<hr class="divider">' + sectionTitle('Recipient', 'Set automatically to the counterparty.') +
      '<div class="row2">' + formItem('Receiver\'s full name', '<input class="input" disabled value="' + esc(cp ? cp.name : '') + '">') +
      formItem('Country of residence / registration', '<input class="input" disabled value="' + esc(cp ? countryName(cp.countryCode) : '') + '">') + '</div>' +
      '<div class="form-item"><label><span class="req">*</span>Address origin<span class="tip" title="Where the address is held, such as an exchange or a private wallet. Kept for the travel rule.">?</span></label><div>' +
      ORIGINS.map(o => '<label style="margin-right:24px"><input type="radio" name="origin" data-origin="' + esc(o) + '"' + (F.origin === o ? ' checked' : '') + '> ' + esc(o) + '</label>').join('') + '</div><div class="help">' + esc(e.origin || '') + '</div></div>' +
      (F.origin === 'Exchange' || F.origin === 'Others' ? formItem(F.origin === 'Exchange' ? 'Exchange / VASP name' : 'Origin detail', inputHtml('originDetail', F.originDetail, { maxlength: 70 }), { id: 'originDetail', optional: true }) : '');
  }
  h += '<hr class="divider">' + formItem('Verification note', textareaHtml('note', F.note, { maxlength: 500, placeholder: 'e.g. confirmed by email from known contact on 3 Oct' }), { id: 'note', optional: true, tip: 'How you confirmed these details, for example "confirmed by email from known contact on 3 Oct". The approver sees it.', hint: 'Optional record of how these details were confirmed. Shown to the approver.', error: e.note }) +
    '<div class="form-actions">' + btn('Exit', 'wlExit', null, '') + btn('Submit', 'wlSubmit', null, 'btn-primary') + '</div></div>';
  return h;
}

function wlCreateView(route, kind) {
  const K = WLK[kind];
  const replaceId = route.query.replace || null;
  wlInit(kind, replaceId, route.query.cp || null);
  const replacing = !!replaceId;
  return {
    title: replacing ? 'Replace ' + K.one : 'Add New ' + K.one, crumbs: route.query.cp && cpById(route.query.cp) ? ['Dashboard', 'Counterparty Management', 'Counterparties', cpById(route.query.cp).name, 'Add ' + K.one] : ['Dashboard', 'Whitelist Management', K.title, replacing ? 'Replace' : 'Add'], buttons: '',
    html: wlFormHtml(),
    bind(root) {
      bindForm(root, WF, (field) => {
        if (field === 'cpId') { WF.copyFrom = ''; WF.warn = ''; const c0 = cpById(WF.cpId); if (c0 && WF.kind === 'bank' && !WF.beneName) WF.beneName = c0.name; rerender(); }
        else if (field === 'chain') { WF.asset = ''; rerender(); }
        else if (field === 'copyFrom') {
          const src = ssiById(WF.copyFrom);
          if (src) { BANK_COPY.forEach(k => { WF[k] = src[k] == null ? '' : src[k]; }); WF.currency = ''; }
          rerender();
        }
      });
      root.querySelectorAll('[data-scope]').forEach(r => r.addEventListener('change', () => { WF.scope = r.dataset.scope; rerender(); }));
      root.querySelectorAll('[data-who]').forEach(r => r.addEventListener('click', () => { WF.scope = r.dataset.who === 'counterparty' ? 'counterparty' : (WF.scope === 'entity' ? 'entity' : 'account'); rerender(); }));
      root.querySelectorAll('[data-origin]').forEach(r => r.addEventListener('change', () => { WF.origin = r.dataset.origin; rerender(); }));
      const bn = root.querySelector('#beneName');
      if (bn) bn.addEventListener('blur', () => {
        const cp = cpById(WF.cpId);
        WF.warn = cp && WF.beneName.trim() && normName(WF.beneName) !== normName(cp.name) ? 'The beneficiary name differs from the counterparty name. Check before submitting.' : '';
        setHelp(root, 'beneName', WF.warn, true);
      });
    }
  };
}
ACT.wlExit = () => { const kind = WF ? WF.kind : 'bank'; const back = WF && WF.fromCp ? '#/counterparties/' + WF.fromCp + '?tab=ssi' : WLK[kind].base; WF = null; go(back); };
ACT.wlSubmit = () => {
  WF.errors = validateSsi(WF, WF.cpId, null);
  if (Object.keys(WF.errors).length) { rerender(); return; }
  rerender();
  const kind = WF.kind;
  const replaceOf = WF.replacesId ? ssiById(WF.replacesId) : null;
  const preview = Object.assign({}, WF, { scope: 'counterparty', status: 'under_review', id: 'new', version: replaceOf ? replaceOf.version + 1 : 1, createdBy: CUR.id, createdAt: new Date().toISOString() });
  openModal({
    title: 'Review ' + (kind === 'bank' ? 'bank account' : 'wallet address'), sub: 'Check the details before submitting for approval.', wide: true,
    body: dl(ssiRows(preview)).replace('class="dl"', 'class="dl" style="grid-template-columns:1fr"') +
      '<div class="form-item" style="margin-top:16px"><label>Comment <span class="opt">(Optional)</span></label><textarea class="textarea" id="rv-comment" placeholder="Add a comment for the approver"></textarea></div>',
    okText: 'Confirm and submit',
    onOk(m) {
      const fromCpId = WF.fromCp || null;
      const res = submitSsi(CUR, WF.cpId, WF, m.querySelector('#rv-comment').value, replaceOf);
      if (!res.ok) { toast({ type: 'error', title: res.code, desc: res.message }); return false; }
      WF = null;
      toast({ title: (replaceOf ? 'Replacement' : (kind === 'bank' ? 'Bank account' : 'Wallet address')) + ' submitted', desc: 'Awaiting approval by another operator.', button: { label: 'View Details', onClick: () => go(WLK[kind].base + '/' + res.record.id) } });
      go(fromCpId ? '#/counterparties/' + fromCpId + '?tab=ssi' : WLK[kind].base);
    }
  });
};

/* ======================================================= CLIENT VIEW (FR-9 isolation demo) */
function clientWlView() {
  const mine = S.ssis.filter(s => s.scope === 'account');
  const rows = mine.length ? mine.map(s => '<tr><td>' + esc(s.label) + '<div class="sub">' + esc(s.id) + '</div></td><td>' + (s.assetType === 'bank' ? 'Bank account' : 'Wallet address') + '</td><td>' + esc(ssiKey(s)) + '</td><td>' + badge(s.status, SSI_STATUS) + '</td></tr>').join('') : '<tr><td colspan="4"><div class="empty">No records</div></td></tr>';
  const hidden = S.ssis.filter(s => s.scope === 'counterparty').length;
  return {
    title: 'Whitelists', crumbs: ['Dashboard', 'Whitelists'], buttons: '',
    html: '<div class="scope-box">Demo of FR-9 (client isolation). This is the client\'s own whitelist. Counterparty records exist (' + hidden + ' in this demo) but are never listed, counted or exported here.</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Label | ID</th><th>Type</th><th>Currency / Blockchain</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table><div class="pager"><span>1-' + mine.length + ' of ' + mine.length + ' items</span></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head">Isolation checks</div><div class="card-body"><div class="header-buttons" style="justify-content:flex-start">' +
      btn('Open a counterparty record by ID', 'isoOpen', null, '') + btn('Withdraw to a counterparty bank account', 'isoWithdraw', null, '') + btn('Create with scope Counterparty', 'isoCreate', null, '') + '</div></div></div>'
  };
}
ACT.isoOpen = () => toast({ type: 'error', title: 'NOT_FOUND', desc: 'The requested resource was not found.' });
ACT.isoWithdraw = () => toast({ type: 'error', title: 'WBA_SCOPE_MISMATCH', desc: 'The specified bank account destination is not accessible from the source account.' });
ACT.isoCreate = () => toast({ type: 'error', title: 'UNSUPPORTED_VALUE', desc: 'Scope Counterparty is not allowed for client requests.' });

ACT.wlMore = (el) => { if (WF) { if (el.dataset.arg === 'bank') WF.moreBank = true; else WF.moreAddr = true; rerender(); } };
ACT.wlLess = (el) => { if (!WF) return; if (el.dataset.arg === 'bank') { WF.moreBank = false; WF.intermediary = ''; WF.routing = ''; } else { WF.moreAddr = false; WF.beneBuildingName = ''; WF.beneBuildingNo = ''; WF.beneFloor = ''; WF.beneRoom = ''; } rerender(); };


/* ===== bundle tail: integration with the shell ===== */
let CUR = USERS[0];
let ROUTE = { path: '', query: {}, parts: [], id: null };
const rerender = () => Shell.render();

function resolveView() {
  const p = ROUTE.parts;
  if (p[0] === 'client-whitelists') return clientWlView();
  if (p[0] === 'whitelists') {
    const kind = p[1] === 'bank-accounts' ? 'bank' : p[1] === 'addresses' ? 'wallet' : null;
    if (!kind) { location.replace('#/whitelists/bank-accounts'); return null; }
    if (p[2] === 'create') return isOperator() ? wlCreateView(ROUTE, kind) : { title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty">FORBIDDEN</div>' };
    return p[2] ? wlDetailView(kind, p[2]) : wlListView(ROUTE, kind);
  }
  if (p[0] === 'counterparties') {
    if (p[1] === 'create') return isOperator() ? createView() : { title: 'Forbidden', crumbs: [], buttons: '', html: '<div class="empty">FORBIDDEN</div>' };
    return p[1] ? detailView(ROUTE, p[1]) : listView(ROUTE);
  }
  return null;
}

function resetUi() { CF = null; WF = null; SSIF = { sub: 'bank', showRetired: false }; APPRF = { status: '' }; Object.assign(TXF, TX_RESET, { tab: 'settlements', status: 'open' }); }

let debounceT = null;
const appEl = document.getElementById('app');
appEl.addEventListener('click', (e) => {
  if (Shell.active !== 'cp') return;
  const msBtn = e.target.closest('[data-ms]');
  if (msBtn) { const id = msBtn.dataset.ms; UI.ms = UI.ms === id ? null : id; rerender(); return; }
  if (!e.target.closest('[data-ms-root]') && UI.ms) { UI.ms = null; rerender(); }
  const act = e.target.closest('[data-act]');
  if (act && !act.disabled) { const fn = ACT[act.dataset.act]; if (fn) { fn(act, e); return; } }
  const row = e.target.closest('[data-href]');
  if (row) go(row.dataset.href);
});
appEl.addEventListener('change', (e) => {
  if (Shell.active !== 'cp') return;
  const t = e.target;
  if (t.dataset.actChange && ACT[t.dataset.actChange]) { ACT[t.dataset.actChange](t, e); return; }
  if (t.dataset.msOpt) {
    const id = t.dataset.msOpt;
    const vals = [...appEl.querySelectorAll('[data-ms-opt="' + id + '"]')].filter(x => x.checked).map(x => x.value);
    setList({ [id]: vals, page: 1 });
  }
});
appEl.addEventListener('input', (e) => {
  if (Shell.active !== 'cp') return;
  const t = e.target;
  if (t.dataset.listText) { clearTimeout(debounceT); debounceT = setTimeout(() => setList({ [t.dataset.listText]: t.value, page: 1 }), 500); }
});
appEl.addEventListener('contextmenu', (e) => {
  if (Shell.active !== 'cp') return;
  const row = e.target.closest('[data-href]');
  if (row) { e.preventDefault(); window.open(location.href.split('#')[0] + row.dataset.href, '_blank'); }
});

const shortA = (a) => (a && a.length > 16 ? a.slice(0, 8) + '…' + a.slice(-6) : a || '');
window.CPApp = {
  name: 'cp',
  setUser(u) { CUR = u; }, setRoute(r) { ROUTE = r; }, resolveView, resetUi, closeOverlays: closeAllOverlays, toast,
  load() { loadState(); saveState(); }, reset() { resetState(); resetUi(); },
  counterparties: () => S.counterparties,
  details: () => S.ssis.filter(s => s.scope === 'counterparty' && s.status === 'approved').map(s => ({ id: s.id, cpId: s.cpId, asset: s.assetType === 'bank' ? s.currency : s.asset, label: s.label, version: s.version, kind: s.assetType, ref: s.assetType === 'bank' ? s.account + ' (' + s.swift + ')' : shortA(s.address) })),
  hasRequest: (id) => !!reqById(id),
  requestRows: () => S.requests.map(r => ({ id: r.id, title: reqTitle(r), subject: reqSubject(r), maker: userById(r.makerId).name, createdAt: r.createdAt, status: r.status })),
  requestDetail: approvalDetailView,
  pendingCount: () => S.requests.filter(r => r.status === 'pending').length
};

})();
