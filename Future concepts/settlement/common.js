// ═══════════════════════════════════════════════════════════════════
// Settlement Instruction Simulator — shared vocabulary
// ═══════════════════════════════════════════════════════════════════

const STATUS_COLOR = {
  // ── Settlement instruction ──
  draft:                    { bg:'#f8fafc', border:'#e2e8f0', txt:'#94a3b8' },
  pending_mch:              { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  awaiting_client_approval: { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  under_review:             { bg:'#ede9fe', border:'#a78bfa', txt:'#5b21b6' },
  settling:                 { bg:'#e0f2fe', border:'#38bdf8', txt:'#075985' },
  completed:                { bg:'#dcfce7', border:'#86efac', txt:'#166534' },
  rejected:                 { bg:'#fef2f2', border:'#fecaca', txt:'#b91c1c' },

  // ── Obligation ──
  pending:                  { bg:'#f8fafc', border:'#e2e8f0', txt:'#94a3b8' },
  eligible:                 { bg:'#e0f2fe', border:'#38bdf8', txt:'#075985' },
  instructed:               { bg:'#ede9fe', border:'#a78bfa', txt:'#5b21b6' },
  partially_settled:        { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  settled:                  { bg:'#dcfce7', border:'#86efac', txt:'#166534' },
  failed:                   { bg:'#fee2e2', border:'#fca5a5', txt:'#991b1b' },
  cancelled:                { bg:'#f1f5f9', border:'#cbd5e1', txt:'#475569' },
  overdue:                  { bg:'#ffe4e6', border:'#fda4af', txt:'#9f1239' },

  // ── Approval ──
  awaiting_approval:        { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  approved:                 { bg:'#dcfce7', border:'#86efac', txt:'#166534' },
  not_applicable:           { bg:'#f1f5f9', border:'#cbd5e1', txt:'#64748b' },

  // ── Movement ──
  detected:                 { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  submitted:                { bg:'#ede9fe', border:'#a78bfa', txt:'#5b21b6' },
  confirmed:                { bg:'#dcfce7', border:'#86efac', txt:'#166534' },

  // ── Venue execution sub-status ──
  pending_policy:           { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  pending_signature:        { bg:'#ede9fe', border:'#a78bfa', txt:'#5b21b6' },
  broadcasted:              { bg:'#e0f2fe', border:'#38bdf8', txt:'#075985' },
  matched:                  { bg:'#dcfce7', border:'#86efac', txt:'#166534' },
  unmatched:                { bg:'#fee2e2', border:'#fca5a5', txt:'#991b1b' },
  pending_settlement:       { bg:'#e0f2fe', border:'#38bdf8', txt:'#075985' },
  ack_by_agent:             { bg:'#ede9fe', border:'#a78bfa', txt:'#5b21b6' },

  // ── Compliance ──
  passed:                   { bg:'#f0fdf4', border:'#86efac', txt:'#15803d' },
  screening:                { bg:'#fef3c7', border:'#fcd34d', txt:'#92400e' },
  active:                   { bg:'#dcfce7', border:'#86efac', txt:'#166534' },
  '—':                      { bg:'#f8fafc', border:'#e2e8f0', txt:'#cbd5e1' },
};

function spill(status) {
  const c = STATUS_COLOR[status] || { bg:'#f1f5f9', border:'#cbd5e1', txt:'#475569' };
  return `<span class="spill" style="background:${c.bg};border-color:${c.border};color:${c.txt}">${status}</span>`;
}

const SCENARIOS = [];

// ── Reusable callouts ───────────────────────────────────────────────
const CO = {
  earmark: { label:'Design — §9.1', text:'Reservations and expected balances are applied at <strong>approval</strong>, not at execution. A delivering position posts <code>RESERVED</code>; a receiving position posts <code>EXPECTED</code>. This is unchanged from today and holds for external obligations too.' },
  netRes:  { label:'Design — §9.4', text:'Run each account\'s schedule forward, ignoring what it already holds. <strong>The lowest point that running total reaches is what it must earmark</strong> — if it never goes below zero, the instruction funds itself and the earmark is nothing. Execution is still gross, obligation by obligation.' },
  grossPost: { label:'Design — §9.1 / D29', text:'<strong>Ledger postings are gross, one per leg.</strong> A posting names the two parties that actually transferred value, never a pair derived by netting. Netting decides what must be <em>settled</em> and how much must be <em>funded</em> — it never decides what is <em>recorded</em>.' },
  restate: { label:'Design — §9.4', text:'The earmark is <strong>restated, never drawn down.</strong> Each time an obligation goes terminal the SI asks the question again over what remains and posts the difference. So it can never release more than it posted — and money becomes protected at exactly the moment it lands and could otherwise be spent.' },
  bypass:  { label:'Design — §9.4', text:'Execution posts gross with the balance check bypassed (<code>Actions.IgnoreBalanceCheck</code>). That is not a shortcut — sufficiency was proven at approval over the SI as a whole, by running each account\'s schedule forward and earmarking its lowest point.' },
  grossExt:{ label:'Design — §4.4', text:'External legs are <strong>gross by default</strong>. Netting against a counterparty is a legal question, not a technical one — it needs a bilateral netting agreement. With <code>netting_enabled = false</code> the leg id enters the netting key, and since every leg is unique no two can ever fold.' },
  posGate: { label:'Design — §5.6', text:'A settlement position becomes <strong>eligible only when every earlier position is terminal-success</strong>. Obligations sharing a position are independent and settle in parallel.' },
  noSusp:  { label:'Design — §9.3', text:'There is no counterparty suspense account. Bridging accounts hold a <strong>single asset</strong> between two events in that asset; external settlement sends cash out and gets a different asset back, so there is no single-asset bridge. Exposure lives in the obligations table — every non-terminal obligation <em>is</em> an unsettled position.' },
  structure:{ label:'Design — §15.2', text:'<strong>The legs record who dealt with whom.</strong> Capacity, visibility and disclosure are read from that structure, not configured alongside it. There is no <code>operating_model</code> field and no capacity enum.' },
};
