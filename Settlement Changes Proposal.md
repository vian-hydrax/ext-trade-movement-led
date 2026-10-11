# Settlement Instruction: Proposed Changes

Draft for discussion. Compares today's Settlement Instruction (SI) with the Future Concept (external trade settlement).

Sources: `Resources/Unified Account MVP Part 3- PRD.md`, `Resources/Settlement Instruction Examples.md`, the Phase 1A to 1D and DBS PRDs, `Future concepts/settlement/*`, and the SI pages in `Repo/` (read-only reference).

---

## Summary in plain language

**Today:** a settlement instruction moves assets between accounts we hold. Everything settles at once, and an operator clicks Process.

**Future:** it can also move assets to and from outside parties (brokers, issuers, funds), on different dates, and settlement can be partial or fail.

**What to change**

1. **Outside parties.** Add a "counterparty" with its bank or wallet details. A leg can then go to a counterparty, not only an account.
2. **Timing.** Each leg gets a settlement date, and an optional order within that day. Later dates wait for earlier ones.
3. **Obligations get a life.** Today they are just "approved or rejected". They need statuses like waiting, in progress, partly settled, settled, failed and overdue. They also need to track how much has settled.
4. **Funding check.** Instead of reserving the net amount, check that the account can afford every step in order, and reserve the lowest point. Reject at approval if any step would go short.
5. **Real movements.** Outside legs create bank or wallet transfers through the existing withdrawal and deposit flows. They can fail and be retried without re-approval.
6. **Failures.** An obligation past its due date is flagged as a settlement fail. Once something has settled, the instruction can only be closed out, not cancelled.
7. **Dealer accounts.** The house account may promise assets it doesn't hold yet, but can never actually go negative.
8. **Later.** Combining payments across instructions, and securities delivery-versus-payment.

---

## 1. Today vs Future

| | Today | Future concept |
| --- | --- | --- |
| Parties | Unified accounts only | Accounts and external counterparties |
| Timing | Everything settles together | Legs have a settlement date and optional sequence |
| Obligation | Approved or rejected | Full lifecycle with settled amount and due date |
| Funding check | Reserve net delivery per account and asset | Check every step in order, reserve the lowest point |
| Execution | One Process click posts everything | Position by position; external legs create movements |
| Failure | Reject only | Retry, partial settlement, settlement fail, close-out |
| Dealer accounts | Cannot over-commit | House may promise assets it does not hold; total never negative |

---

## 2. Proposed changes

### A. Data model
1. **Counterparty** entity: type (broker, issuer, fund), status, `netting_enabled`.
2. **Counterparty SSI** as a third destination type, next to whitelisted address and whitelisted bank account.
3. **Leg** gains: counterparty endpoint, settlement date and sequence, nullable amount with `amount_is_fixed`, method (`free` or `dvp`), optional `dvp_group`.
4. **Obligation** gains: status lifecycle, `settled_amount`, counterparty, contractual settlement date, `completed_at`.
   - Statuses: pending, eligible, instructed, partially_settled, settled, failed, cancelled, overdue.
5. **Obligation to movement link**: amount per link plus an active flag.
   - Invariant: `sum(active links) + settled_amount <= obligation amount`.
6. **Approval** becomes its own record (one per account per SI), separate from the obligation.
7. **Postings** stay gross, one per leg. Netting decides what is settled and funded, not what is recorded.

### B. Approval and funding
1. Funding check at approval: run each account's schedule forward and reserve the lowest point.
2. Reject at approval if any step goes short, naming the position.
3. `may_over_commit` flag on house accounts (reserved can exceed total). Total can never go negative.
4. Account approval is automatic when the submitter already has authority (service user, or client user with direct SI permission).
5. Operator approval stays a separate gate from account approval.

### C. Execution
1. A position becomes eligible only when all earlier positions are terminal.
2. Internal obligations post straight to the ledger.
3. External obligations create movements through the existing outgoing and incoming movement flows (compliance, submit, confirm, fail, regenerate), with no re-approval after SI approval.
4. Execution postings skip the balance check, because sufficiency was proven at approval.
5. A failed movement does not fail the obligation. The link goes inactive and a new movement can be issued.
6. Settlement fail is a derived view: non-terminal and past the contractual date. No automatic timeout.
7. Once anything has settled, the SI cannot be cancelled. Close-out ends it as `failed` (versus `rejected` when nothing settled).

### D. Later phases
1. One movement serving many obligations across SIs, with pro-rata allocation on partial fills.
2. DvP as an atomic pair of movements through an agent.
3. Securities venues.

### E. UI and API
See section 3 for the UX recommendations. API notes: the Repo's single `/complete` call is replaced by per-position execution, and list and detail responses need obligation progress, counterparty and next settlement date.

---

## 3. UX recommendations (product design view)

Keep the current structure (list, detail, create with legs modal, drawers) and add layers. The main shift: the detail page changes from a static record into a progress view.

### Current gaps
- **List:** fine, needs new statuses and filters.
- **Create:** the leg modal assumes both sides are our accounts and has no sense of time.
- **Detail:** three stacked collapses (Details, Transaction Details, Rejection) show what was instructed, not where things stand.
- **Drawers:** obligations show only approval status and net amounts, no progress.

### 3.1 Create flow
1. **Leg type first:** Internal transfer, Send to outside party, Receive from outside party, later Exchange (DvP). Hides fields that do not apply.
2. **Counterparty picker** for outside legs, with its saved bank or wallet details shown read-only.
3. **"Settles on" date** per leg, default today. Group the leg table by date.
4. **Sequence** hidden behind "Set order within the day".
5. **Amount not known yet** checkbox with an optional estimate labelled indicative.
6. **Live funding preview:** per account, balance after each date. A leg that would go short is flagged inline with the date and shortfall. Highest-value addition: it replaces rejection after submit with guidance while editing.
7. **Tag external legs** so users see which parts leave custody.

### 3.2 Detail page
1. Header (ID, status, reference, purpose, actions) plus tabs: **Progress** (default), Legs, Approvals, Postings, Audit log.
2. **Progress tab:** vertical timeline by settlement date. Each date is a band (done, current, upcoming). Under it, obligation cards show account, direction, settled vs total (progress bar), counterparty and status. Expanding a card shows its movements, then its postings.
3. **Overdue:** red "Overdue by N days" tag on the card plus a banner at the top of the page.
4. **Statuses:** keep operator vs client labels; add Settling, Partly settled, Overdue, Failed.
5. **Rejected vs Failed** get different colours and a one-line explanation (Rejected: nothing happened. Failed: partly settled, then closed out).

### 3.3 Operator actions
1. Header buttons depend on state: Under review (Reject, Process); Settling (no global Process, actions move to cards); Overdue (Close out).
2. Card-level actions: submit, retry with corrected details, mark failed. A failed movement shows Retry as primary and explains the reservation is kept.
3. **Close-out replaces Cancel** once anything has settled. The confirmation lists what stays settled and what will be released.
4. **Partial arrivals:** allocation dialog with pro-rata prefilled and editable; never applied silently.
5. Keep the existing rule: pending maker-checker request hides action buttons and shows only "View request".

### 3.4 Client approvals
1. One approval per account: show "You are approving for: Account A, Account D" with checkboxes so partial approval is clear.
2. Show only the user's own legs, with counterparty details for context.
3. Auto-approved rows read "Auto-approved (direct authority)" so reviewers can tell nobody objected from nobody was asked.

### 3.5 List and new screens
1. **List:** add Next settlement date and Progress (e.g. 2 of 4 settled) columns; filters for counterparty, date range and Overdue only.
2. **Settlement exceptions view (new):** overdue obligations, failed movements, unmatched deliveries.
3. **Counterparty management (new):** list and detail, settlement details as a tab, own maker-checker.
4. **Balances:** show Available, Reserved, Expected and an "Over-committed" tag on house accounts.

### 3.6 Design principles
- Show consequences before confirming (what is reserved, released or sent).
- Time is the main axis: dates are headers, not data columns.
- Mark anything that leaves custody.
- Always say who is waiting on whom (client, operator, counterparty).
- Keep platform conventions: URL-persisted filters, account numbers instead of IDs, maker-checker "View request" pattern.

### 3.7 Highest-impact first
The Progress tab and the live funding preview. Both help even if only Phase A is built.

---

## 4. Counterparties (outside parties): design

> **Update:** settlement details are no longer a separate record. They are Whitelisted Bank Accounts and Whitelist Addresses that belong to a counterparty (the Whitelist form asks "Who is this for?": Client or Counterparty, above the existing Scope field). Operators create them from the Whitelist pages or from the counterparty page (Whitelists tab), one record per currency or asset, with replace and retire for counterparty records only. Where this section describes a separate settlement-details (SSI) form, it is superseded by `New Requirements/PRD - Whitelist Bank Account and Address - Counterparty Scope.md` and `New Requirements/PRD - Counterparties.md`.

Focus area. A counterparty is an outside party we settle with (broker, issuer, fund). Closest existing patterns: Account create (short form, operator activation) and Whitelisted Bank Account (review modal, maker-checker, immutable details).

### 4.1 Decisions made
| Topic | Decision |
| --- | --- |
| Who creates | Operators only. Clients can pick existing counterparties but not create them. |
| Who sees | Operators see everything. Clients see name, type and status on legs they are part of. Settlement details (bank or wallet) are operator-only. |
| Types | Broker, issuer, fund, other. |
| Review | Every counterparty gets full operator review with maker-checker. No auto-approve. |
| "Is this counterparty regulated?" | Toggle that decides which documents are required: regulated counterparties provide licence proof; non-regulated counterparties provide a certificate of incorporation and an ownership document. It never skips the approval. Reason: even when relying on another regulated firm's checks, we stay responsible. |
| Country | Required on the counterparty (country of registration). Bank country is separate on each bank settlement detail. |
| Suspend | Included in v1. One operator can suspend (reason required). Reactivation needs maker-checker. |
| Close | Permanent. Blocked while open settlements exist. |
| Callback verification | Not in v1 (does not match today's process). May be added later. |
| First-payment hold | Not in v1. May be added later. |
| Verification note | Optional free-text note on settlement details, as a record for the approver (e.g. "confirmed by email from known contact on 3 Oct"). |

### 4.2 Screens
**List** (Counterparty Management > Counterparties)
- Columns: Name | Code, Type, Country, Status, Settlement details (count), Open settlements (count).
- Filters: name, code, type, status, has open settlements. Header: Add Counterparty, Export CSV.
- Statuses: Under review, Active, Suspended, Closed, Rejected.
- Platform standards: filters persist in URL, page size 10, wrapping filter row, row click opens detail.

**Create** (short form, like Account create)
- Counterparty Details: name, type, country of registration, internal note (optional).
- Compliance: "Is this counterparty regulated?" toggle; if on, regulator, licence number and proof.
- Duplicate-name warning (normalised comparison).
- Review modal with a comment box, then submit to maker-checker. Result: Under review, success toast with View Details.
- Settlement details are not entered here; they are added from the detail page.

**Detail**
- Actions by status (like the account page):
  - Under review: Approve, Reject (reason and remarks).
  - Active: Edit, Suspend (reason), Close, Add settlement details.
  - Suspended: Reactivate (maker-checker), Close.
  - Pending maker-checker request: hide all actions, show only "View request".
- Banners: green (approved), grey (suspended or closed), red (rejected).
- Tabs: Details | Settlement details | Open settlements (overdue highlighted) | Audit log.
- Suspend and Close show how many open settlements are affected.

**Settlement details (SSIs)**
- Table: Label, Asset type, Currency or blockchain, Key detail (masked), Version, Status (under review, active, retired).
- Add settlement details (drawer), fields by type:
  - Bank: currency, bank country, SWIFT/BIC, account number, beneficiary name and address (country and town required), intermediary SWIFT and routing code optional.
  - Wallet: blockchain, address (validated per chain), label.
  - Securities: later.
- Optional "Verification note" field.
- Duplicate rule: same address on same blockchain, or same account number and SWIFT, is rejected.
- Maker-checker approval; maker and checker must be different people.
- Immutable once approved. "Replace" creates a new version and retires the old one on approval. Open settlements keep the version they were created with.

### 4.3 Suspend behaviour
- Blocks new settlement instructions and new movements to the counterparty.
- Existing obligations stay visible and are flagged for an operator decision.
- Incoming arrivals are still recorded.
- Reason is shown on the detail page and recorded in the audit log.

### 4.4 Permissions and audit
- Separate permission for managing counterparties (create, approve, suspend) vs viewing.
- Audit events: create, approve, reject, suspend, reactivate, close, settlement detail add and replace.

### 4.5 Still open
- Wallet addresses: what proof beyond the verification note (e.g. test transfer, signed message)? Deferred.
- Securities settlement details: deferred until securities are in scope.

### 4.6 Research basis and limits
Based on FATF R.10 and R.17 (risk-based approach, reliance conditions), general settlement-instruction and payment-fraud controls, treasury partner-lifecycle patterns, and Fireblocks' whitelist approval model. The ISDA and FMSB settlement instruction standards could not be read, and no public detail was found on how Copper, BitGo or Anchorage onboard or suspend counterparties. Some choices (country required, LEI optional, single-operator suspend) are design judgment, not sourced rules.

---

## 5. Suggested phasing

| Phase | Scope | Touches movements? |
| --- | --- | --- |
| A | Dates and sequence, obligation statuses, funding check, over-commit for house, still internal only | No |
| B | Counterparties, SSIs, external legs on fiat and token | Yes (existing flows) |
| C | Aggregation, DvP, securities | Yes (new patterns) |

---

## 6. Open questions

1. Is the phase order right, or is external settlement needed sooner? Alternative if there is a near-term external use case: A' (one simple external case with a minimal obligation lifecycle, operator-created and gross only), then B' (dates and funding projection), then C'. Cost: some rework and no funding check at first.
8. Should the Progress tab replace the current detail layout, or sit alongside it during rollout?
9. Who sees the funding preview: operators, clients, or both? (Clients need it most.)
2. Split approval from obligation now (migration), or layer the lifecycle on top of the existing rows?
3. Maker-checker: keep it for operator-created SIs, or use a rule-based auto-approve? External legs probably should never auto-approve.
4. Netting: keep external legs gross by default (netting needs a legal agreement)?
5. Can clients create external legs, or only operators?
6. Is securities out of scope until a securities movement model exists?
7. What is the sizing rule for house over-commitment (any limit, or visibility only)?

## 7. Risks to watch

- Backward compatibility: Phase A must leave today's single-date internal SIs behaving exactly as they do now.
- Existing status vocabulary differs between operator and client UI (under review vs processing); new statuses need labels for both.
- The Repo calls `/complete` to process; the new flow replaces one atomic call with per-position execution, so API contracts need a plan.
