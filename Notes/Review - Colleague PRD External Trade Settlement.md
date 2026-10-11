# Review: Colleague PRD "External Trade Settlement"

Source: `Resources/Collegue PRDs/external-trade-settlement-prd.md` (446 lines, 8 functional requirements).
Compared with: our four PRDs and the prototype (state as of this note).
Purpose: an honest view of the strengths, weaknesses and gaps, and what each side can learn from the other. Nothing has been changed in either PRD.

---

## 1. One-paragraph verdict

The colleague's PRD is a **small, clean Phase 1 slice**: add an outside party, put it on a leg, create obligations, let the operator process them by date and link movements by hand. Its format is good (every field has meaning, source and verification). Its weakness is that it **stops where the hard problems begin**: it contradicts itself on unknown amounts, forbids any date but today, has no requirement for the "settlement details" it promises, and leaves funding, netting, partial settlement and failures to later phases or to "the existing process". Our PRDs cover far more ground and are closer to a full process, but they are **heavier, and they cover several phases at once**, which makes delivery harder to slice. The two are complementary more than competing.

---

## 2. What it is

| Part | Content |
| --- | --- |
| FR-1 | External counterparty: name, type (broker, custodian, bank, exchange, other), internal notes. Maker-checker, no balances, no VenueGroup |
| FR-2 | Leg fields: source, destination, asset, amount type (known or unknown), amount, settlement date, external reference, internal notes |
| FR-3 | Obligations are created once the account owners and the operator checker approve; grouped by settlement date; pending until then |
| FR-4 | An unknown obligation amount is entered after the incoming movement is complete |
| FR-5 | **Process** action: the operator selects a date and processes its obligations. Incoming: link by hand. Outgoing: starts the existing withdrawal workflow |
| FR-6, FR-7 | Classify an incoming movement as an external settlement; link incoming or outgoing movements to an obligation by hand (several allowed) |
| FR-8 | House Account flag: allow a negative balance for all assets |
| Phasing | Phase 1 manual. Failed movements, overdue, close-out, override: Phase 2. Automation, aggregation, partial allocation: Phase 3 |

---

## 3. Advantages

1. **Small and deliverable.** Eight requirements, one clear job: get an outside party onto a leg and track the settlement. Easy to estimate, build and test.
2. **Honest about manual work.** It says plainly that the operator completes the external settlement by hand in Phase 1. No hidden automation promises.
3. **Strong field table format.** Every field has Format or sample, Meaning, How it is obtained, How it is verified. It makes unverifiable fields explicit ("the system does not verify the reference"). We adopted this for the leg fields.
4. **Clear phasing.** Phase 2 and Phase 3 are named, with specific items, so scope creep has a place to go.
5. **Reuses existing machinery.** Maker-checker, earmark and reserved balance, the withdrawal workflow, existing Settlement Instruction lifecycle. Less new surface, lower risk.
6. **Stable validation codes.** Every rule has a code, a rule, a user message and a "when checked" column (submission, approval, process). Easy for QA.
7. **Data model written with indexes and relationships.** Close to implementation-ready (including `ObligationMovementLink` as its own table, which supports several movements per obligation).
8. **Multiple movements per obligation** is allowed from day one (FR-7), which anticipates partial settlement.
9. **Process by date** gives the operator a daily working list, a natural operations habit.
10. **Counterparty types include custodian and bank**, which real flows need. Ours does not have these yet.

---

## 4. Disadvantages and risks

| # | Issue | Why it matters |
| --- | --- | --- |
| 1 | **Contradiction on unknown amounts.** FR-4 says the obligation amount is entered after the incoming movement is complete. FR-6 and FR-7 say the obligation must have an amount before a movement can be linked | Deadlock: the amount needs the movement, the link needs the amount |
| 2 | **Settlement date must be today** (`SETTLEMENT_DATE_INVALID`, "Select today's date") | Blocks T+2, forward-dated settlement, and the principal buy example. It also contradicts "obligations can settle on different dates" in FR-2's own design constraints |
| 3 | **"Settlement details" are promised but never specified.** The Release Note, Glossary and Assumptions all mention them. No requirement, no fields, no data model | The core of "how do we pay this outside party" is missing: bank account, wallet address, who verified it |
| 4 | **No counterparty identity or risk data.** Name, type and notes only. No country, regulated status, licence, due diligence documents, UUID rule | Compliance cannot tell who the party is. Duplicate names are not prevented |
| 5 | **Counterparty lifecycle is one line.** "Supports activation, disabling and closure" with no requirement, no effect on open obligations | Suspending a counterparty mid-settlement is undefined |
| 6 | **Outgoing step is vague.** "The system starts the withdrawal workflow for the obligation" | In the repo an operator creates a withdrawal by choosing a client, entity, account, asset, amount and destination, and the movement is generated from it. An obligation has none of that shape (an outside party has no client or entity, a house account is not a client). How an obligation becomes a withdrawal, which whitelist it pays, and how the two stay tied is not said |
| 7 | **Only two obligation statuses** (pending, completed) | No in-flight state, no partial, no failure, no cancel. The operator cannot tell "waiting" from "instructed and awaiting bank" |
| 8 | **Funding is delegated** ("existing earmark and reserved-balance process") | The hard part: what is earmarked when legs net, when a receive funds a later payment, when the house account over-commits. Not defined |
| 9 | **No netting rule, and it conflicts with the repo.** Their data model requires `settlementInstructionLegId` on each obligation, so obligations are one per leg. The repo already derives **net obligations per account** (asset, amount, receive or deliver) on the Settlement Instruction page, with the account's approval status and reason | Two different "obligation" concepts would exist side by side. Fee legs, offsetting trades and many small legs would create many obligations and over-reserve funds. Their PRD says the existing model is "changed" but does not say how the existing net account obligations migrate (ours does: split into account approval plus obligation, with a migration open item) |
| 10 | **House account flag is blunt.** One flag, all assets, all balance types | A negative expected or reserved balance is allowed everywhere. No guard that the balance never goes below zero in total |
| 11 | **Manual-only linking** puts the full matching burden on the operator | Error-prone and slow at volume. No sender matching, no tolerance, no duplicate protection |
| 12 | **Notes inconsistency.** Main flow step 7 says "external reference and remarks". The field table says "Internal notes" | Small, but it shows the PRD was not proofread against itself |
| 13 | **Unverified claims flagged with a red flag emoji** in FR-1 only | Looks unfinished in a PRD meant for engineering |
| 14 | **Several empty sections:** non-functional N/A, status diagram N/A, error handling N/A, research "to be added" | Weak for performance, audit and idempotency, which matter for money movement |
| 15 | **No design or screen guidance.** No list, filters, detail page, review step, empty or error states | The designer has to invent the experience |
| 16 | **"Wallet" naming** for the platform, and `omnibus wallet / client deposit wallet` appears once without explanation | Terms need alignment with our glossary |
| 17 | **"Process" already exists in the repo.** The Settlement Instruction page has a **Process** button for an instruction under review (and Reject). Their FR-5 introduces a new Process per settlement date without saying whether it replaces or sits next to the existing one | Two actions with the same name and different meaning. Our PRD resolves it: the old Process becomes **Approve for settlement**, and positions then run on their dates |

---

## 5. What is missing (gap list)

Things a team will hit within the first month of using this design:

| Area | Missing |
| --- | --- |
| **Counterparty** | Country, regulated or not, documents, status reasons, who can be selected by clients |
| **Settlement details** | Bank accounts and wallet addresses per counterparty, versions, retire and replace, verification note |
| **Dates** | Any date other than today. Order within a day. Back-dating rules |
| **Funding** | Earmark rule, netting, house over-commit, the funding check at submission and approval |
| **Obligation lifecycle** | Instructed, partly settled, failed, cancelled, overdue |
| **Movements** | Partial settlement, tolerance, excess, automatic classification, handling an unknown sender |
| **Failure** | Rejected payment, retry, mark failed (their Phase 2) |
| **Close-out** | What happens to an overdue obligation (their Phase 2) |
| **Suspend or close a counterparty** | Effect on open obligations and new movements |
| **Client view** | What a client sees (our FR-20) |
| **Exceptions** | A place that lists what needs attention |
| **Audit** | Which events are logged |
| **Existing Account Obligation** | How the repo's per-account net obligations (with approval status) relate to the new obligations, and the migration |
| **Maker-checker for movements** | Booking and classification approvals |
| **Movements nobody instructed** | Bank fees, network fees, unexplained arrivals (our Manual Movement PRD) |
| **Reconciliation** | Suspense, so the books match the bank while something is unexplained |

---

## 6. What we can learn from it

1. **Ship a thin first slice.** Their Phase 1 shows a version that can be delivered quickly. Our PRD could be tagged in the same way: *Phase A internal only, Phase B outside party, Phase C automation* (we already have A and B markings). We should make the **minimum Phase B** as small as theirs and push partial settlement, retry and close-out clearly into a later release.
2. **A per-date working view.** A daily "what do I need to do today" list is a good operational habit. In our design positions run automatically on their date, and the operator's work is spread across Progress, Exceptions and the movement cards. A **due today** view (payments to instruct, receipts expected, items overdue) is worth considering. Note the repo already has a Process button per instruction, which we replaced with Approve for settlement. A **Process for date X** screen could group everything due on a day (payments to instruct, receipts to expect, items overdue).
3. **Manual linking as a fallback.** Our design relies on sender matching. When matching fails (unknown sender, wrong amount) the operator needs a manual **Link to obligation** path. We have Classify as Settlement, which is nearly the same, but an explicit link from the obligation side is worth adding.
4. **Custodian and bank counterparty types.** Their list (broker, custodian, bank, exchange, other) is wider where it matters. Ours (broker, exchange, issuer, fund, other) has no custodian or bank. A bank is common for fiat legs.
5. **Validation table with "When checked".** The column (submission, approval, process) tells QA when each check runs. We state it in prose; adopting the column would be clearer.
6. **Separate link table.** `ObligationMovementLink` with a unique (obligation, movement) pair is a clean way to support several movements per obligation. Ours already has this table, with an allocated amount, an active flag and a rule that active links plus settled amount never exceed the obligation. A unique (obligation, movement) constraint is worth adding to ours explicitly.
7. **Indexes in the data model.** Specifying the access paths early avoids slow date and status queries.
8. **Explicit out-of-scope reasons.** Each deferred item has a phase. We have reasons but not always a phase.
9. **Admit unverifiable fields.** "The platform cannot verify the name" is a good habit. Use it on counterparty name and notes.

---

## 7. What they could learn from ours

| Our feature | Why it helps them |
| --- | --- |
| Whitelisted bank accounts and wallet addresses per counterparty, with versions | Fills their missing "settlement details" and gives payment verification a home |
| Counterparty compliance data and a status model (active, suspended, closed) | Answers who the party is, and what happens when it is suspended |
| Obligation statuses, overdue and close-out | Gives operators something to act on when a settlement does not arrive |
| Netting plus gross postings | Fewer obligations to fund, with a full ledger |
| Funding check (earmark, lowest point of the schedule) | Specifies the part they delegate to "the existing process" |
| Automatic classification and tranche matching | Removes most manual linking |
| Suspense and book-then-classify for movements | Handles fees and unexplained arrivals without breaking reconciliation |
| Exceptions view and counterparty flags | Operators see problems without searching |
| Client visibility rules | Defines what clients can and cannot see |
| House account `mayOverCommit` with a guard that totals never go below zero | Safer than a blanket negative-balance flag |

---

## 8. Quick research notes

Short checks against public material, to see whether the colleague's choices and ours match how the industry works. These are context, not requirements.

- **Standing settlement instructions (SSIs) are normally stored per counterparty and reused.** FMSB and ISDA guidance treat the SSI as the "where" of delivery and recommend sharing and permissioning it, and note that incorrect SSIs are a leading cause of settlement failures. This supports our design (whitelists per counterparty, versioned) and highlights the gap in the colleague's PRD, which has no settlement details. Sources: [FMSB Standard for Sharing SSIs](https://fmsb.com/wp-content/uploads/2025/01/20241128_FMSB-Standard-for-Sharing-of-Standard-Settlement-Instructions-SSIs_FINAL.pdf), [ISDA SSI SOP](https://www.isda.org/a/CROgE/ISDA-Standing-Settlement-Instructions-SOP-v1-092024.pdf).
- **Settlement instructions carry a netting eligibility indicator, and failures often come from incorrect SSIs, missed netting and messaging errors.** Netting is therefore a normal, expected part of settlement logic. Our netting rule (with external and non-fixed legs never netted) is aligned; the colleague's PRD has no netting. Sources: [ISO 15022 MT545 field 22F](https://www.iso20022.org/15022/uhb/mt545-61-field-22f.htm), [Calypso netting and SSI overview](https://ascenteum.org/calypso-netting-and-settlement-how-the-platform-handles-ssis-and-swift-messaging/).
- **Once an SSI is correctly configured, settlement instructions generated from trade data apply the right path automatically.** This is the argument for our automatic matching over manual-only linking. Source: [Calypso overview](https://ascenteum.org/calypso-netting-and-settlement-how-the-platform-handles-ssis-and-swift-messaging/).
- **Off-exchange settlement in crypto is an established pattern.** Copper ClearLoop lets clients settle with integrated exchanges without moving assets to the exchange first, and Fireblocks Off Exchange uses collateral vaults that give the exchange a trading credit. This is the closest market analogue to an "exchange trade where all parties are held here", and it shows the exchange as a settlement counterparty with its own risk limits. Our exchange trade example (buyer, seller and exchange fee) models the simplest version. Sources: [Copper ClearLoop comparison](https://walletinvestor.com/news/crypto-news/copper-clearloop-vs-digital-asset-settlement-networks-crypto-clearing-compared/), [Valmar report on off-exchange settlement](https://www.valmar.io/blog/report-on-crypto-custody-and-off-exchange-settlement-solutions), [Copper and OKX](https://finance.yahoo.com/news/crypto-custodian-copper-partners-okx-152919518.html).
- **Takeaway for both PRDs:** the market treats the settlement instruction, its counterparty-specific details and its netting as one design. The colleague's PRD separates the first two out of Phase 1; ours keeps them together.

Limits: these were quick web searches, not a full study. They do not review how the repo handles any of this today. The ISO 15022 material is about securities messaging and applies to our design only by analogy.

---

## 9. Recommendation

1. **Do not choose between them.** Treat the colleague's PRD as a **Phase 1 cut** of ours and align the shared parts (counterparty fields, leg fields) so they are the same.
2. **Raise the contradictions with the colleague now** (section 4, items 1, 2, 3, 6, 12). They are cheap to fix in a PRD and expensive in code.
3. **Take from them:** the daily Process-for-date view, a manual link fallback, the custodian and bank counterparty types, the "When checked" validation column, the link table and the phase tags on out-of-scope items.
4. **Offer from ours:** the settlement details (whitelists), counterparty status model, funding and netting rules, obligation statuses, and the book-then-classify movement flow.
5. **Agree the phase boundary** in writing. For example: Phase 1 = outside party on a leg, same date range, manual movements, whitelists, simple statuses. Phase 2 = failure, retry, close-out, partial settlement. Phase 3 = automation.

---

## 10. Questions to settle with the colleague

1. Is the settlement date really today-only, or is that a placeholder?
2. How does an obligation become a withdrawal, and which whitelist does it pay?
3. When is an unknown amount entered, before or after the movement? (FR-4 vs FR-6 and FR-7)
4. Where do the settlement details live, and who approves them?
5. Is netting expected, or one obligation per leg?
6. Do we share one counterparty record, or two?
7. Who owns the House Account flag and does it apply to total balance or only reserved and expected?
8. Does Phase 1 include a client view?

---

## 11. Verification log (re-check against our PRDs and the repo)

What was re-checked and the result.

| Claim in this review | Checked against | Result |
| --- | --- | --- |
| Colleague's counterparty fields, types, FR-1 to FR-8, data model, phasing | The colleague's PRD, full re-read | Correct |
| Settlement date must be today; FR-4 vs FR-6 and FR-7 contradiction; notes vs remarks mismatch; red flag emoji in FR-1 only | The colleague's PRD text (FR-2 validations, FR-4 preconditions, FR-6 and FR-7 validations, main flow step 7) | Correct |
| Our counterparty types are broker, exchange, issuer, fund, other | `PRD - Counterparties.md` | Correct |
| Ours has obligation statuses pending, eligible, instructed, partially settled, settled, cancelled, with overdue derived | `PRD - Settlement Instruction - External Settlement.md`, status diagrams | Correct |
| Ours has a link table, `mayOverCommit` and a rule that totals never go below zero | Same PRD, data model and FR-7 funding check | Correct. The link table is already richer than the colleague's (allocated amount, active flag, over-allocation rule) |
| Ours has phases A, B, C | Same PRD, Phases table | Correct |
| Ours replaces the repo's Process with Approve for settlement | Same PRD, FR-8 and migration notes; repo SettlementIndividual page header buttons (Reject, Process) | Correct, and the repo check added item 17 |
| **"A withdrawal is client-led in the repo"** | Repo `Withdrawal/PageWithdrawalCreate` (fields: Client, Entity, Account, Asset, Amount, destination, comments) | **Wrong in the first version.** It is created in the operator UI. Fixed in item 6 |
| **"Obligations are one per leg and account"** | Repo `SettlementIndividual/ObligationDrawerItem` (Net Obligations per account, with status and reason) | **Incomplete in the first version.** The repo already nets per account. Fixed in item 9 |
| "Process by date is something only they have" | Repo header buttons | Softened. A Process action already exists, per instruction |
| Repo leg modal fields | Repo `SettlementCreate/AddLegsModal` (Entity, From Account, Entity, To Account, Asset, Withdrawal Amount, External Reference, Remarks) | Confirms the repo has no settlement date, counterparty or amount type, so their FR-2 fields are all new except external reference and remarks |

Not re-checked: the market research in section 8 (web searches only), and the colleague's API specs on Apidog, which are not in the file.
