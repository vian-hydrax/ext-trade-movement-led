// ═══════════════════════════════════════════════════════════════════
// SCENARIOS 6–11
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// 6 — INDICATIVE AMOUNT AND TRANCHED ARRIVAL
// ───────────────────────────────────────────────────────────────────
SCENARIOS.push({
  tab: 'Unknown amount',
  name: 'Fund subscription — the amount does not exist yet',
  introTitle: 'The obligation exists before its amount does',
  subtitle: 'The client subscribes 10,000 SGD to Fund Z. How many units that buys depends on a NAV struck three days later. The obligation has to exist before its amount does — and then the units arrive in two pieces.',
  badges: [{ t: 'amount_is_fixed = false', cls: 'badge-warn' }, { t: 'no expected posted', cls: 'badge-dgr' }, { t: 'tranched arrival', cls: 'badge-hi' }, { t: 'partially_settled', cls: 'badge' }],
  createdVia: 'operator',
  accounts: [
    { id: 'client', label: 'Client A', kind: 'client' },
    { id: 'vCash', label: 'Bank Venue V', kind: 'venue' },
    { id: 'vTok', label: 'Token Venue W', kind: 'venue' },
  ],
  counterparties: [{ id: 'fundZ', label: 'Fund Z', type: 'fund', status: 'active', nettingEnabled: false, ssi: 'SGD bank acct · UNIT address' }],
  init: { 'client|SGD': { total: 15000 }, 'client|UNIT': { total: 0 }, 'vCash|SGD': { total: 2000000 }, 'vTok|UNIT': { total: 0 } },
  positions: ['T+0', 'T+3'],
  sis: [{ id: 'SI-1', name: 'subscribe 10,000 SGD to Fund Z', purpose: 'subscription', status: 'draft' }],
  legs: [
    { id: 'L1', si: 'SI-1', from: 'client', to: 'cp:fundZ', asset: 'SGD', amount: 10000, pos: 'T+0' },
    { id: 'L2', si: 'SI-1', from: 'cp:fundZ', to: 'client', asset: 'UNIT', amount: null, pos: 'T+3', fixed: false },
  ],
  obligations: [
    { id: 'OB1', si: 'SI-1', acct: 'client', asset: 'SGD', dir: 'deliver', faces: 'fundZ', pos: 'T+0', amount: 10000, from: ['L1'] },
    { id: 'OB2', si: 'SI-1', acct: 'client', asset: 'UNIT', dir: 'receive', faces: 'fundZ', pos: 'T+3', amount: null, fixed: false, from: ['L2'] },
  ],
  approvals: [{ si: 'SI-1', acct: 'client' }],
  intro: 'The client subscribes 10,000 SGD to Fund Z. How many units that buys depends on a NAV struck three days later.<br><br><strong><code>amount_is_fixed</code></strong> — a nullable amount plus a boolean carries all of it. Fixed and set is binding; not fixed is either indicative or not yet knowable.<br><br><strong>Nothing is posted to <code>expected</code></strong> — a number there reads as a commitment, and we do not know it yet.<br><br><strong>Tranched arrival</strong> — the units come in two pieces, so the obligation goes <code>partially_settled</code> and accumulates a <code>settled_amount</code>.',
  introCallout: { label: 'Design — §3.2', text: 'A separate enum would add a third source of truth for something the two existing columns already say. And <strong>non-fixed amounts do not net</strong>: you cannot add a null, and folding an estimate into a firm number would produce a total that looks more precise than it is. A leg whose amount is not fixed always forms its own obligation.' },
  steps: [
    {
      id: 'book', label: 'Book', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator books it with one amount missing',
      description: 'OB1 is 10,000 SGD and fixed. OB2 has no amount at all — the fund has not struck a NAV.<br><br><strong>The obligation exists anyway.</strong> It has an account, an asset, a direction, a counterparty and a due date, all of which are known.<br><br>Only the quantity is open.',
      ops: [['si', 'SI-1', 'under_review'], ['apprAll', 'approved']],
    },
    {
      id: 'earmark', label: 'Earmark', actor: 'system', actorLabel: 'System',
      title: 'System reserves 10,000 and posts nothing on the units',
      description: 'The cash side reserves normally. The unit side posts no <code>expected</code> balance at all.<br><br><code>expected</code> is client-facing, and <strong>a number there reads as a commitment</strong>. "You are expecting 50 units" before the NAV is struck would be telling the client something we do not know.<br><br>The indicative amount lives on the instruction, where the context makes clear it is an estimate.',
      callout: { label: 'Design — §10', text: 'Binding (fixed, set) → expected posted, auto-settles within tolerance. Indicative (not fixed, set) → no expected, operator confirms. Not determinable (not fixed, null) → no expected, operator confirms. <strong>Tolerance applies only to fixed obligations.</strong>' },
      ops: [['bal', 'client', 'SGD', 'reserved', 10000]],
    },
    {
      id: 'pay', label: 'Pay', actor: 'venue', actorLabel: 'Venue',
      title: 'Venue sends 10,000 SGD to Fund Z',
      description: 'The known side settles on schedule while the unknown side waits.<br><br>Client SGD 15,000 → 5,000.',
      ops: [
        ['si', 'SI-1', 'settling'],
        ['mov', { id: 'OM-1', dir: 'out', asset: 'SGD', amount: 10000, status: 'confirmed', venueStatus: 'confirmed', venue: 'Bank Venue V', ssi: 'Fund Z · SGD SSI', obls: [['OB1', 10000]], compliance: 'passed' }],
        ['obl', 'OB1', { status: 'settled', settled: 10000 }],
        ['bal', 'client', 'SGD', 'total', -10000], ['bal', 'client', 'SGD', 'reserved', -10000],
        ['bal', 'vCash', 'SGD', 'total', -10000],
        ['je', { event: 'OM-1 — subscribe to Fund Z', dr: 'Client A', cr: 'Bank Venue V', amount: 10000, asset: 'SGD', obls: ["OB1"] }],
      ],
    },
    {
      id: 'firm', label: 'NAV strikes', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator confirms the allocation — 49.8 units',
      description: 'Fund Z strikes the NAV. The operator sets the amount, <code>amount_is_fixed</code> flips, and the expected balance posts at that moment.<br><br>Tolerance matching applies from here, so the arrival can settle automatically.<br><br><strong>This does not send the instruction back for approval.</strong> The client agreed to the 10,000 and accepts whatever units the valuation produces — approval attaches to the deal, not the estimate.',
      callout: { label: 'Design — §10', text: 'In practice this rarely arises anyway — unknown amounts occur in <strong>operator-booked</strong> instructions, which carry no client approval to invalidate. The indicative-amount machinery and the client-approval machinery are largely disjoint.' },
      ops: [
        ['leg', 'L2', { amount: 49.8, fixed: true }],
        ['obl', 'OB2', { amount: 49.8, fixed: true, status: 'eligible' }],
        ['bal', 'client', 'UNIT', 'expected', 49.8],
      ],
    },
    {
      id: 'tranche1', label: 'Test send', actor: 'counterparty', actorLabel: 'Fund Z',
      title: 'Fund Z sends 0.1 units as a test — OB2 partially_settled',
      description: 'A test transfer before the balance is ordinary practice on a first transfer to a new address.<br><br>The obligation accepts it: <code>settled_amount</code> becomes 0.1 and the client\'s expected is drawn down <strong>by this tranche only</strong>.<br><br>The invariant holds — 0 active + 0.1 settled ≤ 49.8, with 49.7 still to discharge.',
      callout: { label: 'Design — §3.7', text: 'An obligation is an <strong>amount to discharge</strong>, and can be discharged in pieces. This is where the design deliberately differs from <code>UnifiedWithdrawalAttempt</code>, which correctly allows one active attempt — a withdrawal is a single indivisible instruction, not an amount.' },
      ops: [
        ['mov', { id: 'IM-1', dir: 'in', asset: 'UNIT', amount: 0.1, status: 'confirmed', venue: 'Token Venue W', ssi: 'Fund Z · UNIT SSI', obls: [['OB2', 0.1]], compliance: 'passed', note: 'test transfer' }],
        ['obl', 'OB2', { status: 'partially_settled', settled: 0.1 }],
        ['bal', 'client', 'UNIT', 'total', 0.1], ['bal', 'client', 'UNIT', 'expected', -0.1],
        ['bal', 'vTok', 'UNIT', 'total', 0.1],
        ['je', { event: 'IM-1 — Fund Z tranche 1', dr: 'Token Venue W', cr: 'Client A', amount: 0.1, asset: 'UNIT', obls: ["OB2"] }],
      ],
    },
    {
      id: 'tranche2', label: 'Balance', actor: 'counterparty', actorLabel: 'Fund Z',
      title: 'Fund Z sends the remaining 49.7 units — OB2 settled',
      description: 'Second movement, same obligation. <code>settled_amount</code> reaches 49.8, which meets the obligation within tolerance.<br><br><strong>Two movements, one obligation</strong>, one expected balance drawn to zero in two steps.<br><br>Client holds 49.8 units and 5,000 SGD.',
      callout: { label: 'Design — §8.1', text: 'Over-delivery beyond tolerance is <strong>not</strong> absorbed by the obligation. The excess routes to break resolution as an ordinary unattributed arrival — the same path any unexpected deposit takes. An obligation is a claim for a specific amount, not a bucket.' },
      ops: [
        ['mov', { id: 'IM-2', dir: 'in', asset: 'UNIT', amount: 49.7, status: 'confirmed', venue: 'Token Venue W', ssi: 'Fund Z · UNIT SSI', obls: [['OB2', 49.7]], compliance: 'passed', note: 'balance of the allocation' }],
        ['obl', 'OB2', { status: 'settled', settled: 49.8 }],
        ['bal', 'client', 'UNIT', 'total', 49.7], ['bal', 'client', 'UNIT', 'expected', -49.7],
        ['bal', 'vTok', 'UNIT', 'total', 49.7],
        ['je', { event: 'IM-2 — Fund Z tranche 2', dr: 'Token Venue W', cr: 'Client A', amount: 49.7, asset: 'UNIT', obls: ["OB2"] }],
        ['si', 'SI-1', 'completed'],
      ],
    },
  ],
});

// ───────────────────────────────────────────────────────────────────
// 7 — APPROVAL-TIME CHECKS (client cannot afford it)
// ───────────────────────────────────────────────────────────────────
SCENARIOS.push({
  tab: 'Client can\'t fund',
  name: 'Client cannot fund it — the two checks at approval',
  introTitle: 'Two different checks run at approval',
  subtitle: 'Client A holds 5,000 SGD, is owed 4,000 from an earlier sale, and wants to buy tokens. Whether that works depends on two different questions, and a design with only one of them lets an instruction fail halfway through settlement instead of at the door.',
  badges: [{ t: 'approval checks', cls: 'badge-hi' }, { t: 'branching', cls: 'badge-warn' }, { t: 'negative available', cls: 'badge-dgr' }, { t: 'rejected at creation', cls: 'badge' }],
  createdVia: 'operator',
  accounts: [
    { id: 'client', label: 'Client A', kind: 'client' },
    { id: 'house', label: 'House Account', kind: 'house' },
    { id: 'vCash', label: 'Bank Venue V', kind: 'venue' },
    { id: 'vTok', label: 'Token Venue W', kind: 'venue' },
  ],
  counterparties: [{ id: 'lp', label: 'LP', type: 'broker', status: 'active', nettingEnabled: false, ssi: 'SGD bank acct · TOKEN address' }],
  init: { 'client|SGD': { total: 5000 }, 'client|TOKEN': { total: 0 }, 'house|SGD': { total: 60000 }, 'vCash|SGD': { total: 2000000 }, 'vTok|TOKEN': { total: 0 } },
  positions: ['T+0', 'T+2'],
  sis: [{ id: 'SI-1', name: 'Client A buys 20 TOKEN', purpose: 'trade', status: 'draft' }],
  legs: [
    { id: 'L1', si: 'SI-1', from: 'house', to: 'client', asset: 'SGD', amount: 4000, pos: 'T+0' },
    { id: 'L2', si: 'SI-1', from: 'client', to: 'cp:lp', asset: 'SGD', amount: 8000, pos: 'T+2' },
    { id: 'L3', si: 'SI-1', from: 'cp:lp', to: 'client', asset: 'TOKEN', amount: 20, pos: 'T+2' },
  ],
  obligations: [
    { id: 'OB1', si: 'SI-1', acct: 'house', asset: 'SGD', dir: 'deliver', faces: null, pos: 'T+0', amount: 4000, from: ['L1'] },
    { id: 'OB2', si: 'SI-1', acct: 'client', asset: 'SGD', dir: 'receive', faces: null, pos: 'T+0', amount: 4000, from: ['L1'] },
    { id: 'OB3', si: 'SI-1', acct: 'client', asset: 'SGD', dir: 'deliver', faces: 'lp', pos: 'T+2', amount: 8000, from: ['L2'] },
    { id: 'OB4', si: 'SI-1', acct: 'client', asset: 'TOKEN', dir: 'receive', faces: 'lp', pos: 'T+2', amount: 20, from: ['L3'] },
  ],
  approvals: [{ si: 'SI-1', acct: 'client' }, { si: 'SI-1', acct: 'house' }],
  intro: 'Client A holds 5,000 SGD, is owed 4,000 from an earlier sale settling on trade date, and wants to pay 8,000 for tokens.<br><br><strong>Check (a) — net affordability.</strong> Does the netted position work against what they hold?<br><br><strong>Check (b) — the projection.</strong> Does it work at <em>every</em> settlement position, or does it dip negative in the middle?<br><br><strong>Three variants below.</strong> Each changes one thing, and each is caught by a different check — or by neither. A design with only one of them lets an instruction fail halfway through settlement instead of at the door.',
  introCallout: { label: 'Design — §9.4', text: 'Two checks, both at <strong>approval</strong>: <strong>(a)</strong> the net position per (account, asset) is affordable — reserve it; <strong>(b)</strong> the position-by-position projection never goes negative for any account. At execution there is no check at all — postings go gross with the balance check bypassed. An SI that fails the projection is rejected at creation with the offending position named, rather than discovered mid-settlement.' },
  steps: [
    {
      id: 'branch', label: 'Variant', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator decides: which version of the deal to book',
      description: 'Each variant changes a single thing. Try all three.',
      type: 'branch',
      ops: [],
      choices: [
        {
          label: 'As booked — 8,000 at T+2',
          description: 'Net −4,000, projection stays positive. Both checks pass.',
          steps: [
            {
              id: 'ok-appr', label: 'Approve', actor: 'system', actorLabel: 'System',
              title: 'Both checks pass — 4,000 reserved on the client',
              description: '<strong>Check (a).</strong> Client SGD nets to +4,000 − 8,000 = −4,000 against 5,000 held. Affordable, so 4,000 is reserved and available drops to 1,000.<br><br><strong>Check (b).</strong> 5,000 → 9,000 at <code>T+0</code> → 1,000 at <code>T+2</code>. Never negative.<br><br>Reserving only the net is the point: <strong>the client never needed 8,000 of their own money</strong>.',
              ops: [
                ['si', 'SI-1', 'under_review'], ['apprAll', 'approved'],
                ['bal', 'client', 'SGD', 'reserved', 4000],
                ['bal', 'client', 'TOKEN', 'expected', 20],
                ['bal', 'house', 'SGD', 'reserved', 4000],
              ],
            },
            {
              id: 'ok-p1', label: 'T+0', actor: 'system', actorLabel: 'System',
              title: 'T+0 — the 4,000 lands',
              description: 'Client now holds 9,000: available 5,000, reserved 4,000.<br><br>The reservation is still held — it is protecting the payment two days out.',
              ops: [
                ['si', 'SI-1', 'settling'],
                ['obl', 'OB1', { status: 'settled', settled: 4000 }], ['obl', 'OB2', { status: 'settled', settled: 4000 }],
                ['bal', 'house', 'SGD', 'total', -4000], ['bal', 'house', 'SGD', 'reserved', -4000],
                ['bal', 'client', 'SGD', 'total', 4000],
                ['je', { event: 'OB1/OB2 — sale proceeds', dr: 'House Account', cr: 'Client A', amount: 4000, asset: 'SGD', obls: ["OB1","OB2"] }],
              ],
            },
            {
              id: 'ok-p2', label: 'Pay + receive', actor: 'venue', actorLabel: 'Venue',
              title: 'T+2 — 8,000 out, 20 TOKEN in',
              description: 'The client pays 8,000 gross while holding 9,000.<br><br>The balance check is bypassed on the posting, and correctly so — <strong>sufficiency was proven at approval over the whole instruction</strong>.<br><br>Client ends at 1,000 SGD and 20 TOKEN.',
              callout: CO.bypass,
              ops: [
                ['mov', { id: 'OM-1', dir: 'out', asset: 'SGD', amount: 8000, status: 'confirmed', venueStatus: 'confirmed', venue: 'Bank Venue V', ssi: 'LP · SGD SSI', obls: [['OB3', 8000]], compliance: 'passed' }],
                ['mov', { id: 'IM-1', dir: 'in', asset: 'TOKEN', amount: 20, status: 'confirmed', venue: 'Token Venue W', ssi: 'LP · TOKEN SSI', obls: [['OB4', 20]], compliance: 'passed' }],
                ['obl', 'OB3', { status: 'settled', settled: 8000 }], ['obl', 'OB4', { status: 'settled', settled: 20 }],
                ['bal', 'client', 'SGD', 'total', -8000], ['bal', 'client', 'SGD', 'reserved', -4000],
                ['bal', 'vCash', 'SGD', 'total', -8000],
                ['bal', 'client', 'TOKEN', 'total', 20], ['bal', 'client', 'TOKEN', 'expected', -20],
                ['bal', 'vTok', 'TOKEN', 'total', 20],
                ['je', { event: 'OM-1 — pay LP', dr: 'Client A', cr: 'Bank Venue V', amount: 8000, asset: 'SGD', obls: ["OB3"] }],
                ['je', { event: 'IM-1 — LP delivers', dr: 'Token Venue W', cr: 'Client A', amount: 20, asset: 'TOKEN', obls: ["OB4"] }],
                ['si', 'SI-1', 'completed'],
              ],
            },
          ],
        },
        {
          label: 'Buy 12,000 instead',
          description: 'Net −8,000 against a 5,000 balance. Check (a) fails.',
          steps: [
            {
              id: 'b-fail', label: 'Rejected', actor: 'system', actorLabel: 'System',
              title: 'Check (a) fails — rejected before anything is reserved',
              description: 'Client SGD nets to +4,000 − 12,000 = −8,000 against 5,000 held.<br><br><strong>No schedule makes this work</strong> — the shortfall is in the net itself.<br><br>This is the ordinary sufficiency check, operating on the netted position rather than the gross legs.',
              callout: { label: 'Why this one is easy', text: 'Net affordability is a single comparison per (account, asset) and needs no knowledge of ordering. It catches the case where the account simply does not have the money. What it <em>cannot</em> catch is the next variant — try it.' },
              ops: [
                ['leg', 'L2', { amount: 12000 }],
                ['obl', 'OB3', { amount: 12000 }],
                ['si', 'SI-1', 'rejected'],
                ['apprAll', 'not_applicable'],
                ['oblMany', ['OB1', 'OB2', 'OB3', 'OB4'], { status: 'cancelled' }],
              ],
            },
            {
              id: 'b-note', label: 'Note', actor: 'operator', actorLabel: 'Operator',
              title: 'Nothing was reserved, so nothing needs releasing',
              description: 'The check runs before the reservations are posted, so the client\'s balances are untouched — total 5,000, available 5,000.<br><br>The remedy is a business one: reduce the size, ask the client to fund, or find the difference elsewhere.<br><br><strong>The platform\'s job was to say no at the door.</strong>',
              ops: [],
            },
          ],
        },
        {
          label: 'Pay at T+0, proceeds at T+2',
          description: 'Same net, wrong order. Check (a) passes; check (b) fails.',
          steps: [
            {
              id: 'c-fail', label: 'Rejected', actor: 'system', actorLabel: 'System',
              title: 'Check (a) passes, check (b) fails — still rejected',
              description: 'Nothing about the amounts changed. Net is still −4,000 and the client still holds 5,000.<br><br>But the schedule is inverted: they pay 8,000 at <code>T+0</code> and receive the 4,000 only at <code>T+2</code>. The running total reads 5,000 → −3,000 → 1,000.<br><br><strong>It ends fine and dips negative in the middle.</strong> Without the position-by-position check this would approve cleanly, earmark 4,000, and stall at <code>T+0</code>.',
              callout: { label: 'Design — §9.4 — why no third entity', text: 'What resolves net-versus-gross is a <strong>computation</strong> — the position-by-position projection — not a row. There is no execution entity between obligation and movement, and no stored per-position funding record. The projection runs once at approval and names the offending position in the rejection.' },
              ops: [
                ['leg', 'L1', { pos: 'T+2' }], ['leg', 'L2', { pos: 'T+0' }], ['leg', 'L3', { pos: 'T+0' }],
                ['obl', 'OB1', { pos: 'T+2' }], ['obl', 'OB2', { pos: 'T+2' }],
                ['obl', 'OB3', { pos: 'T+0' }], ['obl', 'OB4', { pos: 'T+0' }],
                ['si', 'SI-1', 'rejected'],
                ['apprAll', 'not_applicable'],
                ['oblMany', ['OB1', 'OB2', 'OB3', 'OB4'], { status: 'cancelled' }],
              ],
            },
            {
              id: 'c-note', label: 'Fix', actor: 'operator', actorLabel: 'Operator',
              title: 'Operator fixes it with a sequence, not a funding request',
              description: 'The rejection names the offending position: <code>T+0</code> · Client A · SGD · short 3,000.<br><br>Move the proceeds leg back to <code>T+0</code> — or sequence it <code>T+0 [1]</code> ahead of the payment at <code>T+0 [2]</code> — and it becomes fundable without a cent changing hands.<br><br><strong>Dates are the deal\'s schedule and a fact; sequence is our ordering within a date and a control.</strong>',
              callout: { label: 'Design — §5.6', text: 'Because sequence only ever orders <em>within</em> a date, it can never contradict the deal\'s schedule. That is a structural guarantee rather than a validation rule — there is no way to author a sequence that moves an obligation to the wrong day.' },
              ops: [],
            },
          ],
        },
      ],
    },
  ],
});

// ───────────────────────────────────────────────────────────────────
// 8 — MOVEMENT FAILURE AND RETRY
// ───────────────────────────────────────────────────────────────────
SCENARIOS.push({
  tab: 'Movement fails',
  name: 'The payment fails at the venue',
  introTitle: 'The bank rejects the payment',
  subtitle: 'A movement is the execution attempt; the obligation is what has to be discharged. When the bank rejects the transfer, the obligation does not fail — the link goes inactive, the amount returns to the undischarged balance, and the reservation never moves.',
  badges: [{ t: 'failure path', cls: 'badge-dgr' }, { t: 'branching', cls: 'badge-warn' }, { t: 'retry vs close', cls: 'badge' }, { t: 'reservation survives', cls: 'badge-ok' }],
  createdVia: 'operator',
  accounts: [
    { id: 'client', label: 'Client A', kind: 'client' },
    { id: 'vCash', label: 'Bank Venue V', kind: 'venue' },
    { id: 'vTok', label: 'Token Venue W', kind: 'venue' },
  ],
  counterparties: [{ id: 'lp', label: 'LP', type: 'broker', status: 'active', nettingEnabled: false, ssi: 'SGD bank acct · TOKEN address' }],
  init: { 'client|SGD': { total: 30000 }, 'client|TOKEN': { total: 0 }, 'vCash|SGD': { total: 2000000 }, 'vTok|TOKEN': { total: 0 } },
  positions: ['T+0', 'T+2'],
  sis: [{ id: 'SI-1', name: 'buy 50 TOKEN from LP', purpose: 'trade', status: 'draft' }],
  legs: [
    { id: 'L1', si: 'SI-1', from: 'client', to: 'cp:lp', asset: 'SGD', amount: 10000, pos: 'T+0' },
    { id: 'L2', si: 'SI-1', from: 'cp:lp', to: 'client', asset: 'TOKEN', amount: 50, pos: 'T+2' },
  ],
  obligations: [
    { id: 'OB1', si: 'SI-1', acct: 'client', asset: 'SGD', dir: 'deliver', faces: 'lp', pos: 'T+0', amount: 10000, from: ['L1'] },
    { id: 'OB2', si: 'SI-1', acct: 'client', asset: 'TOKEN', dir: 'receive', faces: 'lp', pos: 'T+2', amount: 50, from: ['L2'] },
  ],
  approvals: [{ si: 'SI-1', acct: 'client' }],
  intro: 'Two obligations, one instruction. The client pays on trade date and receives two days later. Everything works until the bank rejects the payment for a beneficiary-name mismatch on LP\'s account.<br><br><strong>A movement is the attempt; the obligation is what has to be discharged.</strong> The movement fails — the obligation does not.<br><br><strong>The link goes inactive</strong> and its amount returns to the undischarged balance. The reservation never moves.<br><br><strong>Then a decision:</strong> is this an execution problem or an instruction problem?',
  introCallout: { label: 'Design — §3.7', text: 'The obligation ↔ movement constraint is an <strong>amount invariant, not a count</strong>: <code>sum(active movements) + settled_amount ≤ obligation.amount</code>. Regeneration after failure needs no special case — the failed movement is marked inactive, its amount returns to the undischarged balance, and a new movement is created for it. The same mechanic covers a failed retry and a deliberate second tranche.' },
  steps: [
    {
      id: 'setup', label: 'Approve', actor: 'system', actorLabel: 'System',
      title: 'Booked and approved — 10,000 reserved',
      description: 'Client SGD nets to −10,000 and is reserved; 50 TOKEN expected.<br><br>Available drops to 20,000.',
      ops: [
        ['si', 'SI-1', 'under_review'], ['apprAll', 'approved'],
        ['bal', 'client', 'SGD', 'reserved', 10000],
        ['bal', 'client', 'TOKEN', 'expected', 50],
      ],
    },
    {
      id: 'submit', label: 'Submit', actor: 'system', actorLabel: 'System',
      title: 'System submits OB1 to the bank as movement OM-1',
      description: 'Compliance passes on the destination, the movement is submitted, and the obligation goes to <code>instructed</code>.<br><br>The link row records the movement\'s contribution: 10,000 of an obligation of 10,000, leaving nothing undischarged.',
      ops: [
        ['si', 'SI-1', 'settling'],
        ['obl', 'OB1', { status: 'instructed' }],
        ['mov', { id: 'OM-1', dir: 'out', asset: 'SGD', amount: 10000, status: 'submitted', venueStatus: 'broadcasted', venue: 'Bank Venue V', ssi: 'LP · SGD SSI', obls: [['OB1', 10000]], compliance: 'passed' }],
        ['bal', 'vCash', 'SGD', 'reserved', 10000],
      ],
    },
    {
      id: 'fail', label: 'Rejected', actor: 'venue', actorLabel: 'Bank Venue',
      title: 'Bank rejects OM-1 — the obligation stays instructed',
      description: 'Beneficiary name mismatch. The movement is terminal and will never settle.<br><br><strong>The obligation is not.</strong> It still has 10,000 to discharge, still faces LP, still due today.<br><br>The link row goes <code>active = false</code> and its 10,000 returns to the undischarged balance.<br><br>No ledger posting ever happened, so <strong>there is nothing to reverse</strong>.',
      callout: { label: 'Design — §11', text: 'Outgoing movement fails at venue → the movement is terminal; a new movement is generated against the same obligation, <strong>reusing the existing reservation</strong>. The obligation does not fail. This is the same separation the transaction–movement model already makes: the movement is the execution attempt, the obligation is the instruction.' },
      ops: [
        ['movst', 'OM-1', 'failed', 'failed'],
        ['movup', 'OM-1', { note: 'link active = false · 10,000 returns to undischarged' }],
        ['bal', 'vCash', 'SGD', 'reserved', -10000],
      ],
    },
    {
      id: 'decide', label: 'Decide', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator decides: reissue, or abandon the instruction',
      description: 'If the SSI is wrong, fixing it and reissuing discharges the same obligation.<br><br>If the deal itself is off, the obligation has to be closed.',
      type: 'branch', ops: [],
      choices: [
        {
          label: 'Fix the SSI and reissue',
          description: 'Execution-level — new movement against the same obligation',
          steps: [
            {
              id: 'r-new', label: 'Reissue', actor: 'operator', actorLabel: 'Operator',
              title: 'Operator corrects the SSI and issues OM-2',
              description: 'The counterparty SSI is amended under maker-checker and a new movement is issued against the same obligation.<br><br><strong>OB1 never left <code>instructed</code></strong>, approval was never re-sought, and the reservation carried over untouched.<br><br>Two movements now point at one obligation — one inactive, one active — and the invariant still holds: 10,000 active + 0 settled ≤ 10,000.',
              callout: { label: 'Design — §12.2', text: 'Once the SI is approved, <strong>no further maker-checker approval is required to settle any part of it</strong>. The per-movement controls that already exist — account-status gate, compliance gate, submission gate — continue to apply, because they are operational gates rather than authorisations.' },
              ops: [
                ['mov', { id: 'OM-2', dir: 'out', asset: 'SGD', amount: 10000, status: 'submitted', venueStatus: 'broadcasted', venue: 'Bank Venue V', ssi: 'LP · SGD SSI (v2, corrected)', obls: [['OB1', 10000]], compliance: 'passed' }],
                ['bal', 'vCash', 'SGD', 'reserved', 10000],
              ],
            },
            {
              id: 'r-ok', label: 'Confirmed', actor: 'venue', actorLabel: 'Bank Venue',
              title: 'Bank confirms OM-2 — OB1 settled',
              description: 'Client SGD 30,000 → 20,000, reservation released.<br><br><strong>The failure cost one extra movement row</strong> — no reversal, no re-approval, no correcting entry.',
              ops: [
                ['movst', 'OM-2', 'confirmed', 'confirmed'],
                ['obl', 'OB1', { status: 'settled', settled: 10000 }],
                ['bal', 'client', 'SGD', 'total', -10000], ['bal', 'client', 'SGD', 'reserved', -10000],
                ['bal', 'vCash', 'SGD', 'total', -10000], ['bal', 'vCash', 'SGD', 'reserved', -10000],
                ['je', { event: 'OM-2 confirmed — pay LP', dr: 'Client A', cr: 'Bank Venue V', amount: 10000, asset: 'SGD', obls: ["OB1"] }],
              ],
            },
            {
              id: 'r-recv', label: 'Token in', actor: 'counterparty', actorLabel: 'LP',
              title: 'LP delivers the tokens — instruction complete',
              description: 'Client holds 20,000 SGD and 50 TOKEN.<br><br>From the outside the only trace of the failure is an extra movement row in the audit trail — <strong>which is exactly the trace you want</strong>.',
              ops: [
                ['mov', { id: 'IM-1', dir: 'in', asset: 'TOKEN', amount: 50, status: 'confirmed', venue: 'Token Venue W', ssi: 'LP · TOKEN SSI', obls: [['OB2', 50]], compliance: 'passed' }],
                ['obl', 'OB2', { status: 'settled', settled: 50 }],
                ['bal', 'client', 'TOKEN', 'total', 50], ['bal', 'client', 'TOKEN', 'expected', -50],
                ['bal', 'vTok', 'TOKEN', 'total', 50],
                ['je', { event: 'IM-1 — LP delivers', dr: 'Token Venue W', cr: 'Client A', amount: 50, asset: 'TOKEN', obls: ["OB2"] }],
                ['si', 'SI-1', 'completed'],
              ],
            },
          ],
        },
        {
          label: 'Abandon the trade',
          description: 'Instruction-level — nothing has settled, so the SI can still be rejected',
          steps: [
            {
              id: 'a-rej', label: 'Rejected', actor: 'operator', actorLabel: 'Operator',
              title: 'Operator rejects the instruction — nothing had settled',
              description: 'This is the clean case. Nothing settled, so the instruction can be terminated outright.<br><br>Every obligation cancels, every reservation and expected balance releases, and <strong>the client\'s balances return exactly to where they started</strong>.<br><br>Compare with scenario 9, where one obligation had settled and this option no longer exists.',
              callout: { label: 'Design — §11.1', text: '<strong>No obligation settled yet</strong> → the SI is <code>rejected</code>; every reservation and expected balance is released. This is today\'s behaviour, unchanged. <strong>At least one obligation settled</strong> → the SI cannot be cancelled at all — part of its economic effect is real, and a status change cannot rescind it.' },
              ops: [
                ['oblMany', ['OB1', 'OB2'], { status: 'cancelled' }],
                ['bal', 'client', 'SGD', 'reserved', -10000],
                ['bal', 'client', 'TOKEN', 'expected', -50],
                ['si', 'SI-1', 'rejected'],
              ],
            },
          ],
        },
      ],
    },
  ],
});

// ───────────────────────────────────────────────────────────────────
// 9 — SETTLEMENT FAIL AND CLOSE-OUT
// ───────────────────────────────────────────────────────────────────
SCENARIOS.push({
  tab: 'Never arrives',
  name: 'The delivery never comes — settlement fail and close-out',
  introTitle: 'The delivery never comes',
  subtitle: 'The cash went out on trade date. The tokens were due at T+3 and nothing arrived. An obligation past its contractual settlement date while still non-terminal is, precisely, a settlement fail — and it is only detectable because that date was stored on the obligation.',
  badges: [{ t: 'settlement fail', cls: 'badge-dgr' }, { t: 'no auto timeout', cls: 'badge-warn' }, { t: 'close-out', cls: 'badge-dgr' }, { t: 'branching', cls: 'badge' }],
  createdVia: 'operator',
  accounts: [
    { id: 'client', label: 'Client A', kind: 'client' },
    { id: 'vCash', label: 'Bank Venue V', kind: 'venue' },
    { id: 'vTok', label: 'Token Venue W', kind: 'venue' },
  ],
  counterparties: [{ id: 'issuerY', label: 'Issuer Y', type: 'issuer', status: 'active', nettingEnabled: false, ssi: 'SGD bank acct · TOKEN address' }],
  init: { 'client|SGD': { total: 30000 }, 'client|TOKEN': { total: 0 }, 'vCash|SGD': { total: 2000000 }, 'vTok|TOKEN': { total: 0 } },
  positions: ['T+0', 'T+3'],
  sis: [{ id: 'SI-1', name: 'subscribe 50 TOKEN with Issuer Y', purpose: 'subscription', status: 'draft' }],
  legs: [
    { id: 'L1', si: 'SI-1', from: 'client', to: 'cp:issuerY', asset: 'SGD', amount: 10000, pos: 'T+0' },
    { id: 'L2', si: 'SI-1', from: 'cp:issuerY', to: 'client', asset: 'TOKEN', amount: 50, pos: 'T+3' },
  ],
  obligations: [
    { id: 'OB1', si: 'SI-1', acct: 'client', asset: 'SGD', dir: 'deliver', faces: 'issuerY', pos: 'T+0', amount: 10000, from: ['L1'] },
    { id: 'OB2', si: 'SI-1', acct: 'client', asset: 'TOKEN', dir: 'receive', faces: 'issuerY', pos: 'T+3', amount: 50, from: ['L2'] },
  ],
  approvals: [{ si: 'SI-1', acct: 'client' }],
  intro: 'Pay first, receive three days later — free of payment on the cash leg. The most ordinary shape in this design, and also the riskiest: for three days the client has given up value and holds nothing but a claim. Then the claim does not pay.<br><br><strong>A settlement fail is a query, not a status</strong> — non-terminal, and past its contractual settlement date. Two columns already on the row answer it.<br><br><strong>Nothing times out on its own.</strong> The obligation does not fail, and nothing is released, until someone decides.<br><br><strong>Cancellation is refused once anything has settled</strong> — close-out is what is offered instead.',
  introCallout: { label: 'Design — §5.4', text: 'An obligation whose contractual settlement date has passed while it is still non-terminal is, precisely, a <strong>failed settlement</strong> — the standard industry term. It can only be aged and reported if the expected date was recorded. Without it, an overdue obligation is indistinguishable from a not-yet-due one.' },
  steps: [
    {
      id: 'pay', label: 'Pay', actor: 'venue', actorLabel: 'Venue',
      title: 'Venue sends the cash on T+0',
      description: '10,000 reserved at approval, 50 TOKEN expected. The outgoing movement confirms and OB1 settles.<br><br>Client SGD 30,000 → 20,000.<br><br>The expected 50 TOKEN sits on the client\'s balance as the signal that something is coming.',
      ops: [
        ['si', 'SI-1', 'under_review'], ['apprAll', 'approved'],
        ['bal', 'client', 'SGD', 'reserved', 10000], ['bal', 'client', 'TOKEN', 'expected', 50],
        ['si', 'SI-1', 'settling'],
        ['mov', { id: 'OM-1', dir: 'out', asset: 'SGD', amount: 10000, status: 'confirmed', venueStatus: 'confirmed', venue: 'Bank Venue V', ssi: 'Issuer Y · SGD SSI', obls: [['OB1', 10000]], compliance: 'passed' }],
        ['obl', 'OB1', { status: 'settled', settled: 10000 }],
        ['bal', 'client', 'SGD', 'total', -10000], ['bal', 'client', 'SGD', 'reserved', -10000],
        ['bal', 'vCash', 'SGD', 'total', -10000],
        ['je', { event: 'OM-1 — pay Issuer Y', dr: 'Client A', cr: 'Bank Venue V', amount: 10000, asset: 'SGD', obls: ["OB1"] }],
      ],
    },
    {
      id: 'due', label: 'T+3', actor: 'system', actorLabel: 'System',
      title: 'T+3 arrives and nothing does',
      description: 'The position is eligible. There is no movement to create — <strong>an incoming obligation waits for the counterparty to act</strong>, and the counterparty has not acted.<br><br>OB2 stays eligible. It does not fail, it does not time out, and nothing is released.',
      callout: { label: 'Design — §11', text: 'Arrival never comes → the obligation stays non-terminal <strong>indefinitely</strong>. There is no automatic timeout. Obligation aging is surfaced in an operations view instead. An automatic timeout would be a system deciding a commercial matter — whether a counterparty has defaulted is not something a scheduler should conclude.' },
      ops: [['obl', 'OB2', { status: 'eligible' }]],
    },
    {
      id: 'overdue', label: 'Overdue', actor: 'system', actorLabel: 'System',
      title: 'Two days later, OB2 is a settlement fail',
      description: 'Non-terminal, past its contractual settlement date. <strong>That is the whole query</strong> — two columns already on the row.<br><br>The same table answers the rest. What does Issuer Y owe us? Unsettled receives where <code>counterparty_id = Y</code>. Which client is exposed? The obligation\'s <code>account_id</code>.<br><br><strong>There is no exposure view to build.</strong> The obligations table already is one.',
      callout: CO.noSusp,
      ops: [['obl', 'OB2', { status: 'overdue' }]],
    },
    {
      id: 'decide', label: 'Decide', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator decides: keep chasing, or close it out',
      description: 'Late settlement is routine and is not a design event.<br><br>Abandoning the claim is, and the design constrains what is available.',
      type: 'branch', ops: [],
      choices: [
        {
          label: 'It settles late',
          description: 'Arrives on T+9 — actual settlement date ≠ contractual',
          steps: [
            {
              id: 'l-arr', label: 'Late', actor: 'counterparty', actorLabel: 'Issuer Y',
              title: 'Issuer Y delivers six days late — OB2 settled',
              description: 'Nothing in the model had to change to allow this. The obligation was never terminal, the expected balance was never released, and the arrival matches as it would have on time.<br><br>The record now shows a contractual date of <code>T+3</code> and a <code>completed_at</code> of <code>T+9</code>.<br><br><strong>That gap is the reportable fact</strong>, and it exists only because both dates are stored.',
              callout: { label: 'Design — §5.4', text: '<code>completed_at</code> is the <strong>completion</strong>, not the first movement. An obligation settled in tranches already has a date per tranche — each movement carries its own <code>transactedAt</code>, so the individual dates are never lost. What the obligation needs is the single answer to "was this settled, and by when".' },
              ops: [
                ['mov', { id: 'IM-1', dir: 'in', asset: 'TOKEN', amount: 50, status: 'confirmed', venue: 'Token Venue W', ssi: 'Issuer Y · TOKEN SSI', obls: [['OB2', 50]], compliance: 'passed', note: 'transactedAt = T+9 · contractual was T+3' }],
                ['obl', 'OB2', { status: 'settled', settled: 50 }],
                ['bal', 'client', 'TOKEN', 'total', 50], ['bal', 'client', 'TOKEN', 'expected', -50],
                ['bal', 'vTok', 'TOKEN', 'total', 50],
                ['je', { event: 'IM-1 — late delivery from Issuer Y', dr: 'Token Venue W', cr: 'Client A', amount: 50, asset: 'TOKEN', obls: ["OB2"] }],
                ['si', 'SI-1', 'completed'],
              ],
            },
          ],
        },
        {
          label: 'Close it out',
          description: 'Issuer Y has defaulted — terminate what is left',
          steps: [
            {
              id: 'c-try', label: 'Cannot cancel', actor: 'operator', actorLabel: 'Operator',
              title: 'Operator asks to cancel — and is refused',
              description: '10,000 SGD really did leave custody and reach Issuer Y. That happened.<br><br><strong>A status change cannot rescind it.</strong> An instruction reporting itself cancelled would be lying about a payment sitting in someone else\'s bank account.<br><br>What is offered instead is close-out.',
              callout: { label: 'Design — §11.1', text: 'Recovering assets already delivered is <strong>not</strong> an SI operation. That is a reversal or a claim, which the platform already models as first-class transaction types. The settlement instruction records what was instructed and what settled; it is not the vehicle for getting money back.' },
              ops: [],
            },
            {
              id: 'c-out', label: 'Close out', actor: 'operator', actorLabel: 'Operator',
              title: 'Operator closes it out — SI failed, OB2 cancelled',
              description: 'The unsettled obligation cancels and releases its expected balance. The settled obligation stands.<br><br>The instruction permanently records what actually happened: <strong>one leg discharged, one abandoned</strong>.<br><br>Client ends at 20,000 SGD and zero tokens, with a claim against Issuer Y that lives outside this instruction entirely.',
              callout: { label: 'Why <code>failed</code> and not <code>rejected</code>', text: '<code>rejected</code> means terminated before any obligation settled — reversible in the sense that nothing happened. <code>failed</code> means terminated after at least one did. The two statuses carry genuinely different information about the state of the world, which is why the design keeps both rather than collapsing them into one terminal status.' },
              ops: [
                ['obl', 'OB2', { status: 'cancelled' }],
                ['bal', 'client', 'TOKEN', 'expected', -50],
                ['si', 'SI-1', 'failed'],
              ],
            },
          ],
        },
      ],
    },
  ],
});

// ───────────────────────────────────────────────────────────────────
// 10 — SECURITIES DvP THROUGH AN AGENT
// ───────────────────────────────────────────────────────────────────
SCENARIOS.push({
  tab: 'Securities DvP',
  name: 'Securities DvP — through an agent, not a depository',
  introTitle: 'Securities, through an agent rather than a depository',
  subtitle: 'We are not a CSD participant. We hold at DBS; DBS holds at Euroclear. A delivery-versus-payment purchase is one instruction to our agent, two movements at two venues, and one settlement event that resolves both or neither.',
  badges: [{ t: 'securities', cls: 'badge-hi' }, { t: 'DvP', cls: 'badge-hi' }, { t: 'matched, not pushed', cls: 'badge-warn' }, { t: 'atomic pair', cls: 'badge-ok' }, { t: 'branching', cls: 'badge' }],
  createdVia: 'operator',
  accounts: [
    { id: 'client', label: 'Client A', kind: 'client' },
    { id: 'vCash', label: 'Cash Corresp.', kind: 'venue' },
    { id: 'vSec', label: 'Securities @ DBS', kind: 'venue' },
  ],
  counterparties: [{ id: 'brokerB', label: 'Broker B', type: 'broker', status: 'active', nettingEnabled: false, ssi: 'PSET Euroclear · agent BIC · acct 4471' }],
  init: { 'client|SGD': { total: 120000 }, 'client|BOND': { total: 0 }, 'vCash|SGD': { total: 5000000 }, 'vSec|BOND': { total: 0 } },
  positions: ['T+2'],
  sis: [{ id: 'SI-1', name: 'buy 100 BOND against payment', purpose: 'trade', status: 'draft' }],
  legs: [
    { id: 'L1', si: 'SI-1', from: 'client', to: 'cp:brokerB', asset: 'SGD', amount: 98500, pos: 'T+2', method: 'dvp' },
    { id: 'L2', si: 'SI-1', from: 'cp:brokerB', to: 'client', asset: 'BOND', amount: 100, pos: 'T+2', method: 'dvp' },
  ],
  obligations: [
    { id: 'OB1', si: 'SI-1', acct: 'client', asset: 'SGD', dir: 'deliver', faces: 'brokerB', pos: 'T+2', amount: 98500, from: ['L1'] },
    { id: 'OB2', si: 'SI-1', acct: 'client', asset: 'BOND', dir: 'receive', faces: 'brokerB', pos: 'T+2', amount: 100, from: ['L2'] },
  ],
  approvals: [{ si: 'SI-1', acct: 'client' }],
  intro: 'We are not a CSD participant. We hold at DBS; DBS holds at Euroclear. A bond does not travel to an address — it moves between accounts inside a depository, and settlement is a book entry there.<br><br><strong>Instructions are matched, not pushed</strong> — we instruct our agent to receive against payment, the counterparty instructs the mirror, and the CSD matches the two.<br><br><strong>Both sides\' SSIs are needed</strong> — ours goes in their instruction, theirs goes in ours.<br><br><strong>DvP is an atomic pair</strong> — one instruction, two movements at two venues, and one settlement event that resolves both or neither.',
  introCallout: { label: 'Design — §3.5.1', text: 'The chain is <code>us → our agent (DBS) → CSD (Euroclear) ← their agent ← Broker B</code>. Our venue is the agent, not the CSD — a securities venue is our securities account at our agent, exactly as a fiat venue is our cash account at a bank. <strong>The venue model needs no new concept for the depository behind it.</strong>' },
  steps: [
    {
      id: 'ssi', label: 'SSI', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator records Broker B\'s SSI — an agent, not an address',
      description: 'For DBS to build the CSD instruction it needs the place of settlement (Euroclear), the counterparty\'s agent BIC, and their account at that agent.<br><br>Our own SSI is the mirror of that, and <strong>not a separate entity</strong>: "Euroclear, via DBS, account X" is the same triple describing our securities venue.<br><br>The venue record carries these so they can be published to counterparties.',
      callout: { label: 'Design — §3.5', text: 'Fiat and token SSIs are <strong>destinations</strong> — you push, it lands, and it is one-sided: you need theirs, they do not need yours to receive. A securities SSI is a <strong>counterparty account at a shared depository</strong>. This is why SWIFT has separate deliver and receive message types rather than one transfer message.' },
      ops: [['si', 'SI-1', 'under_review'], ['apprAll', 'approved']],
    },
    {
      id: 'earmark', label: 'Earmark', actor: 'system', actorLabel: 'System',
      title: 'System earmarks both legs at one position, marked dvp',
      description: '98,500 SGD reserved, 100 BOND expected. Both legs share position <code>T+2</code> and carry a shared <code>dvp_group</code>.<br><br>Note what the position is <em>not</em> doing. Same date and sequence would ordinarily mean two independent obligations that happen to be scheduled together, each able to fail alone.<br><br><strong>The <code>dvp</code> marking is what says these are two halves of one exchange.</strong>',
      callout: { label: 'Design — §6.2', text: '<code>dvp_group</code> is a <strong>disambiguator, not a requirement</strong>. Where a position contains exactly one deliver and one receive facing the same counterparty in different assets, the pair is derivable and the group can be left null. It earns its keep when a position holds more than one such pair — two separate DvP trades with the same broker settling the same day.' },
      ops: [
        ['bal', 'client', 'SGD', 'reserved', 98500],
        ['bal', 'client', 'BOND', 'expected', 100],
      ],
    },
    {
      id: 'instruct', label: 'Instruct', actor: 'system', actorLabel: 'System',
      title: 'System sends one instruction to DBS — producing two movements',
      description: 'One MT541-shaped instruction: receive 100 BOND against payment of 98,500 SGD, naming Broker B\'s account at their agent.<br><br><strong>Two movements is not a contradiction.</strong> A movement records assets entering or leaving a venue, and this purchase produces two venue events — bonds credited at DBS, cash debited at the cash correspondent.<br><br>Different assets, different venues, opposite directions. Collapsing them would need a movement to carry two assets.',
      callout: { label: 'Design — §6.1', text: 'What DvP adds is not fewer movements but a <strong>shared outcome</strong>. Ordinary pair: 2 movements, 2 independent instructions, either can fail alone, real exposure if one does. DvP pair: 2 movements, <strong>1</strong> instruction carrying both sides, a single settlement event resolving both, and no exposure — which is the point.' },
      ops: [
        ['si', 'SI-1', 'settling'],
        ['oblMany', ['OB1', 'OB2'], { status: 'instructed' }],
        ['mov', { id: 'OM-1', dir: 'out', asset: 'SGD', amount: 98500, status: 'submitted', venueStatus: 'ack_by_agent', venue: 'Cash Corresp.', ssi: 'Broker B · Euroclear acct 4471', obls: [['OB1', 98500]], compliance: 'passed', note: 'ext instruction ref DVP-9910 · dvp_group G1' }],
        ['mov', { id: 'IM-1', dir: 'in', asset: 'BOND', amount: 100, status: 'submitted', venueStatus: 'ack_by_agent', venue: 'Securities @ DBS', ssi: 'Broker B · Euroclear acct 4471', obls: [['OB2', 100]], compliance: 'passed', note: 'ext instruction ref DVP-9910 · dvp_group G1' }],
        ['bal', 'vCash', 'SGD', 'reserved', 98500],
      ],
    },
    {
      id: 'unmatched', label: 'Unmatched', actor: 'venue', actorLabel: 'Agent · DBS',
      title: 'DBS reports unmatched — Broker B has not instructed',
      description: 'Our side is in; the other side is not, so Euroclear has nothing to match and nothing settles. Both movements stay <code>submitted</code>.<br><br>What changed is <strong>the venue sub-status</strong>, exactly as venue execution sub-statuses already work elsewhere.<br><br>Matching happens one level removed — DBS matches at Euroclear and reports back — so we never model CSD matching as a platform concept.',
      callout: { label: 'Design — §3.5.1', text: 'A settlement fail surfaces as the agent telling us the instruction is unmatched or overdue. <strong>Matching is a venue sub-status, not a platform status.</strong> This is the whole reason indirect access simplifies rather than complicates the model.' },
      ops: [
        ['movst', 'OM-1', 'submitted', 'unmatched'],
        ['movst', 'IM-1', 'submitted', 'unmatched'],
      ],
    },
    {
      id: 'decide', label: 'Outcome', actor: 'venue', actorLabel: 'Agent · DBS',
      title: 'Does Broker B instruct before the cut-off?',
      description: 'Everything below the platform now depends on one thing: whether the mirror instruction shows up before the CSD gives up.',
      type: 'branch', ops: [],
      choices: [
        {
          label: 'Matched → CSD settles',
          description: 'One settlement event resolves both obligations',
          steps: [
            {
              id: 'm-match', label: 'Matched', actor: 'venue', actorLabel: 'Agent · DBS',
              title: 'Broker B instructs — Euroclear matches',
              description: 'The two instructions agree on quantity, amount, date and accounts, so Euroclear matches them and queues the book entry.<br><br>Still no platform status change — <strong>still a venue sub-status</strong>.',
              ops: [
                ['movst', 'OM-1', 'submitted', 'matched'],
                ['movst', 'IM-1', 'submitted', 'matched'],
              ],
            },
            {
              id: 'm-settle', label: 'Settled', actor: 'venue', actorLabel: 'Agent · DBS',
              title: 'One settlement event resolves both obligations',
              description: 'Euroclear moves the bonds and the cash in one book entry. DBS reports a single outcome, and that one confirmation resolves both movements.<br><br><strong>This is the genuinely new piece in the movement layer.</strong> Everywhere else movements resolve independently — that is exactly why In-Transit exists.<br><br>Atomic pair resolution is a new lifecycle pattern in the coordinator, not a parameter on an existing one. There was never a moment where one had moved and the other had not.',
              callout: { label: 'Design — §3.5.1', text: '<strong>DvP is usually the agent\'s job, not ours.</strong> If DBS settles DvP at Euroclear, we send one instruction and DBS returns one outcome — the atomicity is theirs to guarantee. That makes DvP considerably cheaper to support than the direct-membership case §6.3 costs out.' },
              ops: [
                ['movst', 'OM-1', 'confirmed', 'confirmed'],
                ['movst', 'IM-1', 'confirmed', 'confirmed'],
                ['obl', 'OB1', { status: 'settled', settled: 98500 }],
                ['obl', 'OB2', { status: 'settled', settled: 100 }],
                ['bal', 'client', 'SGD', 'total', -98500], ['bal', 'client', 'SGD', 'reserved', -98500],
                ['bal', 'vCash', 'SGD', 'total', -98500], ['bal', 'vCash', 'SGD', 'reserved', -98500],
                ['bal', 'client', 'BOND', 'total', 100], ['bal', 'client', 'BOND', 'expected', -100],
                ['bal', 'vSec', 'BOND', 'total', 100],
                ['je', { event: 'DVP-9910 — cash leg', dr: 'Client A', cr: 'Cash Corresp.', amount: 98500, asset: 'SGD', obls: ["OB1"] }],
                ['je', { event: 'DVP-9910 — securities leg', dr: 'Securities @ DBS', cr: 'Client A', amount: 100, asset: 'BOND', obls: ["OB2"] }],
                ['si', 'SI-1', 'completed'],
              ],
            },
          ],
        },
        {
          label: 'Still unmatched at cut-off',
          description: 'Settlement fail — both fail together, nothing moved',
          steps: [
            {
              id: 'f-fail', label: 'Both fail', actor: 'venue', actorLabel: 'Agent · DBS',
              title: 'Cut-off passes unmatched — both movements fail together',
              description: 'The instruction ages past settlement date and DBS reports the fail.<br><br><strong>This is the other half of the new lifecycle pattern, and the half easy to forget</strong> — independent failure is assumed everywhere else, so paired failure has to be built deliberately.<br><br>The client\'s cash never left and the bonds never arrived. Compare scenario 9, where the free-of-payment shape meant cash left three days before the failure was visible. <strong>That is what DvP buys.</strong>',
              callout: { label: 'Design — §15.7', text: 'Custody mandates conventionally limit the custodian to moving client assets <strong>only against corresponding value</strong>, which is precisely the control that lets a custodian settle trades without per-trade client approval — the client cannot be defrauded by an instruction that must deliver value back. Deferring DvP is right on engineering grounds; that does not automatically make it right on <em>authority</em> grounds.' },
              ops: [
                ['movst', 'OM-1', 'failed', 'unmatched'],
                ['movst', 'IM-1', 'failed', 'unmatched'],
                ['oblMany', ['OB1', 'OB2'], { status: 'eligible' }],
                ['movup', 'OM-1', { note: 'links inactive · amounts return to undischarged' }],
                ['movup', 'IM-1', { note: 'links inactive · amounts return to undischarged' }],
              ],
            },
            {
              id: 'f-back', label: 'Reinstruct', actor: 'operator', actorLabel: 'Operator',
              title: 'Both obligations return to eligible — reservations intact',
              description: 'No obligation failed, no posting was made, no reservation moved.<br><br>The obligations are back where they were, and the operator can chase Broker B and reissue.<br><br>It can also be closed out cleanly if the trade is dead: nothing settled, so it terminates at <code>rejected</code> and everything releases.',
              ops: [],
            },
          ],
        },
      ],
    },
  ],
});

// ───────────────────────────────────────────────────────────────────
// 11 — CROSS-SI AGGREGATION AND PARTIAL ALLOCATION
// ───────────────────────────────────────────────────────────────────
SCENARIOS.push({
  tab: 'Aggregation',
  name: 'Aggregation — one payment, two instructions',
  introTitle: 'One payment for two instructions',
  subtitle: 'Two agency clients buy from the same broker on the same date. They should produce one payment, not two — and the obligations being aggregated live in different settlement instructions, which is why no in-SI mechanism could ever have solved this.',
  badges: [{ t: 'cross-SI', cls: 'badge-hi' }, { t: 'movement → many obligations', cls: 'badge-hi' }, { t: 'pro-rata allocation', cls: 'badge-warn' }, { t: 'agency', cls: 'badge' }, { t: 'branching', cls: 'badge' }],
  createdVia: 'operator',
  accounts: [
    { id: 'cA', label: 'Client A', kind: 'client' },
    { id: 'cB', label: 'Client B', kind: 'client' },
    { id: 'vCash', label: 'Bank Venue V', kind: 'venue' },
    { id: 'vTok', label: 'Token Venue W', kind: 'venue' },
  ],
  counterparties: [{ id: 'lp', label: 'LP', type: 'broker', status: 'active', nettingEnabled: false, ssi: 'SGD bank acct · TOKEN address' }],
  init: { 'cA|SGD': { total: 5000 }, 'cA|TOKEN': { total: 0 }, 'cB|SGD': { total: 20000 }, 'cB|TOKEN': { total: 0 }, 'vCash|SGD': { total: 2000000 }, 'vTok|TOKEN': { total: 0 } },
  positions: ['T+2'],
  sis: [
    { id: 'SI-1', name: 'Client A buys 10 TOKEN', purpose: 'trade', status: 'draft' },
    { id: 'SI-2', name: 'Client B buys 40 TOKEN', purpose: 'trade', status: 'draft' },
  ],
  legs: [
    { id: 'L1', si: 'SI-1', from: 'cA', to: 'cp:lp', asset: 'SGD', amount: 2000, pos: 'T+2' },
    { id: 'L2', si: 'SI-1', from: 'cp:lp', to: 'cA', asset: 'TOKEN', amount: 10, pos: 'T+2' },
    { id: 'L3', si: 'SI-2', from: 'cB', to: 'cp:lp', asset: 'SGD', amount: 8000, pos: 'T+2' },
    { id: 'L4', si: 'SI-2', from: 'cp:lp', to: 'cB', asset: 'TOKEN', amount: 40, pos: 'T+2' },
  ],
  obligations: [
    { id: 'OB1', si: 'SI-1', acct: 'cA', asset: 'SGD', dir: 'deliver', faces: 'lp', pos: 'T+2', amount: 2000, from: ['L1'] },
    { id: 'OB2', si: 'SI-1', acct: 'cA', asset: 'TOKEN', dir: 'receive', faces: 'lp', pos: 'T+2', amount: 10, from: ['L2'] },
    { id: 'OB3', si: 'SI-2', acct: 'cB', asset: 'SGD', dir: 'deliver', faces: 'lp', pos: 'T+2', amount: 8000, from: ['L3'] },
    { id: 'OB4', si: 'SI-2', acct: 'cB', asset: 'TOKEN', dir: 'receive', faces: 'lp', pos: 'T+2', amount: 40, from: ['L4'] },
  ],
  approvals: [{ si: 'SI-1', acct: 'cA' }, { si: 'SI-2', acct: 'cB' }],
  intro: 'Two agency clients buy from the same broker on the same date. Settled naively that is two bank transfers, two fees and two failure modes. Settled sensibly it is one transfer of 10,000.<br><br><strong>One movement, many obligations</strong> — a single cardinality change, with each link row carrying its own amount.<br><br><strong>The obligations sit in different instructions</strong>, which is why nothing inside an SI could ever have expressed this.<br><br><strong>Partial fills need an allocation rule</strong> — pro-rata by default, operator-overridable, and never silent.',
  introCallout: { label: 'Design — §15.9', text: 'Aggregation creates <strong>no visibility problem</strong>. Legs and approvals are both per account and both permission-filtered on account ownership, so Client A sees only their own 2,000. There is no single aggregate leg for anyone to read, because each client\'s leg is their own — and no house account is needed, because these are agency trades with no netting across directions.' },
  steps: [
    {
      id: 'book', label: 'Book', actor: 'operator', actorLabel: 'Operator',
      title: 'Operator books both instructions independently',
      description: 'Each client faces LP directly — agency. Each instruction is approved on its own and neither can block the other.<br><br>Reservations: A 2,000 SGD and 10 TOKEN expected; B 8,000 SGD and 40 TOKEN expected.<br><br><strong>Client A holds only 5,000 SGD</strong> — they could not have been part of a combined instruction that required funding 10,000.',
      ops: [
        ['si', 'SI-1', 'under_review'], ['si', 'SI-2', 'under_review'], ['apprAll', 'approved'],
        ['bal', 'cA', 'SGD', 'reserved', 2000], ['bal', 'cA', 'TOKEN', 'expected', 10],
        ['bal', 'cB', 'SGD', 'reserved', 8000], ['bal', 'cB', 'TOKEN', 'expected', 40],
      ],
    },
    {
      id: 'group', label: 'Group', actor: 'operator', actorLabel: 'Operator · Settlement run',
      title: 'Settlement run groups OB1 and OB3 into one movement of 10,000',
      description: 'They agree on everything the grouping rule requires: counterparty, asset, direction, contractual settlement date and venue.<br><br>Whether they are actually grouped is <strong>an operational choice — a settlement run, a cut-off — not a structural one</strong>.<br><br>The link table already carries an amount per link, so this needs no new structure. What it needs is the removal of an assumption: that one movement serves one obligation.',
      callout: { label: 'Design — §8', text: 'There is <strong>no execution entity beyond the movement</strong>. The movement already is the execution unit — one instruction to a venue, with its own reference, status, failure and regeneration. Adding a layer between obligation and movement would duplicate it. What changes is only cardinality.' },
      ops: [
        ['si', 'SI-1', 'settling'], ['si', 'SI-2', 'settling'],
        ['oblMany', ['OB1', 'OB3'], { status: 'instructed' }],
        ['mov', { id: 'OM-1', dir: 'out', asset: 'SGD', amount: 10000, status: 'submitted', venueStatus: 'broadcasted', venue: 'Bank Venue V', ssi: 'LP · SGD SSI', obls: [['OB1', 2000], ['OB3', 8000]], compliance: 'passed', note: 'settlement run 14:00 · 2 obligations, 2 instructions' }],
        ['bal', 'vCash', 'SGD', 'reserved', 10000],
      ],
    },
    {
      id: 'outcome', label: 'Outcome', actor: 'venue', actorLabel: 'Bank Venue',
      title: 'Does the full 10,000 land?',
      description: 'Aggregation buys one fee and one reconciliation.<br><br>It also creates a question that two separate payments never had.',
      type: 'branch', ops: [],
      choices: [
        {
          label: 'Full 10,000 settles',
          description: 'Both obligations discharge from one confirmation',
          steps: [
            {
              id: 'g-ok', label: 'Confirmed', actor: 'venue', actorLabel: 'Bank Venue',
              title: 'One confirmation settles two obligations',
              description: 'The movement confirms once and the link rows do the allocation: 2,000 against OB1, 8,000 against OB3.<br><br>Two separate postings, one to each client, <strong>because the clients\' balances are separate and always were</strong>.<br><br>The aggregation existed only at the movement layer. Nothing above it knows the payment was shared.',
              ops: [
                ['movst', 'OM-1', 'confirmed', 'confirmed'],
                ['obl', 'OB1', { status: 'settled', settled: 2000 }],
                ['obl', 'OB3', { status: 'settled', settled: 8000 }],
                ['bal', 'cA', 'SGD', 'total', -2000], ['bal', 'cA', 'SGD', 'reserved', -2000],
                ['bal', 'cB', 'SGD', 'total', -8000], ['bal', 'cB', 'SGD', 'reserved', -8000],
                ['bal', 'vCash', 'SGD', 'total', -10000], ['bal', 'vCash', 'SGD', 'reserved', -10000],
                ['je', { event: 'OM-1 allocation → OB1', dr: 'Client A', cr: 'Bank Venue V', amount: 2000, asset: 'SGD', obls: ["OB1"] }],
                ['je', { event: 'OM-1 allocation → OB3', dr: 'Client B', cr: 'Bank Venue V', amount: 8000, asset: 'SGD', obls: ["OB3"] }],
              ],
            },
            {
              id: 'g-in', label: 'Tokens in', actor: 'counterparty', actorLabel: 'LP',
              title: 'LP delivers 50 TOKEN as one arrival — split across OB2 and OB4',
              description: 'The incoming side aggregates the same way: one arrival of 50, two link rows, two credits.<br><br>Client A ends with 3,000 SGD and 10 TOKEN; Client B with 12,000 SGD and 40 TOKEN.<br><br><strong>Two instructions, four obligations, two movements.</strong> Without aggregation it would have been four.',
              ops: [
                ['mov', { id: 'IM-1', dir: 'in', asset: 'TOKEN', amount: 50, status: 'confirmed', venue: 'Token Venue W', ssi: 'LP · TOKEN SSI', obls: [['OB2', 10], ['OB4', 40]], compliance: 'passed', note: 'one arrival, two obligations across two SIs' }],
                ['obl', 'OB2', { status: 'settled', settled: 10 }],
                ['obl', 'OB4', { status: 'settled', settled: 40 }],
                ['bal', 'cA', 'TOKEN', 'total', 10], ['bal', 'cA', 'TOKEN', 'expected', -10],
                ['bal', 'cB', 'TOKEN', 'total', 40], ['bal', 'cB', 'TOKEN', 'expected', -40],
                ['bal', 'vTok', 'TOKEN', 'total', 50],
                ['je', { event: 'IM-1 allocation → OB2', dr: 'Token Venue W', cr: 'Client A', amount: 10, asset: 'TOKEN', obls: ["OB2"] }],
                ['je', { event: 'IM-1 allocation → OB4', dr: 'Token Venue W', cr: 'Client B', amount: 40, asset: 'TOKEN', obls: ["OB4"] }],
                ['si', 'SI-1', 'completed'], ['si', 'SI-2', 'completed'],
              ],
            },
          ],
        },
        {
          label: 'Only 9,000 lands',
          description: 'Partial settlement — which client is short?',
          steps: [
            {
              id: 'p-part', label: 'Partial', actor: 'venue', actorLabel: 'Bank Venue',
              title: 'Only 9,000 lands — allocated pro-rata by default',
              description: 'The bank returns 1,000 for a formatting reason on the correspondent leg. Nine thousand reached LP. <strong>Which client is short? Nothing in the payment says.</strong><br><br>The default allocates pro-rata — A 1,800, B 7,200 — and both obligations go to <code>partially_settled</code>.<br><br>An operator can override, because the right answer is sometimes commercial. What the design refuses to do is <strong>guess silently</strong> — that would be an accounting error nobody could see.',
              callout: { label: 'Design — §8', text: 'Partial settlement of an aggregated movement <strong>needs an allocation rule</strong>. Default to pro-rata with operator override; do not guess silently. This is the one cost aggregation genuinely adds — two separate payments would have had one clean success and one clean failure.' },
              ops: [
                ['movup', 'OM-1', { status: 'confirmed', venueStatus: 'confirmed', amount: 9000, obls: [['OB1', 1800], ['OB3', 7200]], note: 'partial — 1,000 returned · pro-rata allocation, operator may override' }],
                ['obl', 'OB1', { status: 'partially_settled', settled: 1800 }],
                ['obl', 'OB3', { status: 'partially_settled', settled: 7200 }],
                ['bal', 'cA', 'SGD', 'total', -1800], ['bal', 'cA', 'SGD', 'reserved', -1800],
                ['bal', 'cB', 'SGD', 'total', -7200], ['bal', 'cB', 'SGD', 'reserved', -7200],
                ['bal', 'vCash', 'SGD', 'total', -9000], ['bal', 'vCash', 'SGD', 'reserved', -10000],
                ['je', { event: 'OM-1 partial → OB1', dr: 'Client A', cr: 'Bank Venue V', amount: 1800, asset: 'SGD', obls: ["OB1"] }],
                ['je', { event: 'OM-1 partial → OB3', dr: 'Client B', cr: 'Bank Venue V', amount: 7200, asset: 'SGD', obls: ["OB3"] }],
              ],
            },
            {
              id: 'p-top', label: 'Top up', actor: 'operator', actorLabel: 'Operator',
              title: 'Operator issues a second movement of 1,000',
              description: 'Both obligations still have an undischarged balance — 200 on OB1 and 800 on OB3 — so a top-up movement is issued against both.<br><br>The invariant holds throughout: active + settled ≤ amount, for each.<br><br><strong>Nothing needed re-approval and no obligation failed</strong>, and the partial state was visible on both clients\' rows the whole time.',
              ops: [
                ['mov', { id: 'OM-2', dir: 'out', asset: 'SGD', amount: 1000, status: 'confirmed', venueStatus: 'confirmed', venue: 'Bank Venue V', ssi: 'LP · SGD SSI', obls: [['OB1', 200], ['OB3', 800]], compliance: 'passed', note: 'top-up for the returned amount' }],
                ['obl', 'OB1', { status: 'settled', settled: 2000 }],
                ['obl', 'OB3', { status: 'settled', settled: 8000 }],
                ['bal', 'cA', 'SGD', 'total', -200], ['bal', 'cA', 'SGD', 'reserved', -200],
                ['bal', 'cB', 'SGD', 'total', -800], ['bal', 'cB', 'SGD', 'reserved', -800],
                ['bal', 'vCash', 'SGD', 'total', -1000],
                ['je', { event: 'OM-2 top-up → OB1', dr: 'Client A', cr: 'Bank Venue V', amount: 200, asset: 'SGD', obls: ["OB1"] }],
                ['je', { event: 'OM-2 top-up → OB3', dr: 'Client B', cr: 'Bank Venue V', amount: 800, asset: 'SGD', obls: ["OB3"] }],
              ],
            },
            {
              id: 'p-in', label: 'Tokens in', actor: 'counterparty', actorLabel: 'LP',
              title: 'LP delivers 50 TOKEN — both instructions complete',
              description: 'One arrival, two link rows, two credits.<br><br>Client A 3,000 SGD and 10 TOKEN; Client B 12,000 SGD and 40 TOKEN — <strong>the same end state as the clean path</strong>, reached through three movements instead of two.',
              ops: [
                ['mov', { id: 'IM-1', dir: 'in', asset: 'TOKEN', amount: 50, status: 'confirmed', venue: 'Token Venue W', ssi: 'LP · TOKEN SSI', obls: [['OB2', 10], ['OB4', 40]], compliance: 'passed' }],
                ['obl', 'OB2', { status: 'settled', settled: 10 }],
                ['obl', 'OB4', { status: 'settled', settled: 40 }],
                ['bal', 'cA', 'TOKEN', 'total', 10], ['bal', 'cA', 'TOKEN', 'expected', -10],
                ['bal', 'cB', 'TOKEN', 'total', 40], ['bal', 'cB', 'TOKEN', 'expected', -40],
                ['bal', 'vTok', 'TOKEN', 'total', 50],
                ['je', { event: 'IM-1 allocation → OB2', dr: 'Token Venue W', cr: 'Client A', amount: 10, asset: 'TOKEN', obls: ["OB2"] }],
                ['je', { event: 'IM-1 allocation → OB4', dr: 'Token Venue W', cr: 'Client B', amount: 40, asset: 'TOKEN', obls: ["OB4"] }],
                ['si', 'SI-1', 'completed'], ['si', 'SI-2', 'completed'],
              ],
            },
          ],
        },
      ],
    },
  ],
});
