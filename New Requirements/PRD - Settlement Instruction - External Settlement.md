# PRD - Settlement Instruction: Settlement Schedules and External Settlement

Status: Draft for design. Written so a designer can work from it directly.
Builds on: `Resources/Unified Account MVP Part 3- PRD.md` (current Settlement Instruction), `PRD - Counterparties.md`, `PRD - Whitelist Bank Account and Address - Counterparty Scope.md`, the Phase 1A to 1D movement PRDs and the DBS PRDs.
Outgoing movements that belong to no instruction (bank charges, network fees, refunds) are in `PRD - Manual Outgoing Movement Booking and Classification.md`. Incoming classifications (airdrops, interest, reversals) are a later phase.
Design source: `Future concepts/settlement/` (the simulator and its design notes).

---

## About the Document

### List of Personnel

| **Role** | **Name** |
| --- | --- |
| Product Manager | [TBD] |
| Designer | [TBD] |
| Tech Lead | [TBD] |
| QA | [TBD] |

---

## Overview

### Release Note

- A settlement instruction can now settle on **different dates**, in a set order. A payment can go out on trade date and the delivery can come back two days later, in one instruction.
- A leg can now be to or from an **outside party** (a counterparty such as a broker, issuer or fund), not only another account held with us. Outside legs settle through real bank or wallet transfers.
- Each commitment inside an instruction is tracked on its own, with a status and an amount settled so far. Partial deliveries, failed payments and late deliveries are handled without restarting the instruction.
- Before an instruction is approved, the system checks that every account can afford every step in order, and tells the user which date would go short.
- The instruction page shows **progress**: what has settled, what is due next, and what is overdue.

### Problem Statement

Today a settlement instruction (SI) is a batch of transfer legs between unified accounts. All legs settle together when an operator clicks Process. This works for internal transfers but cannot support:
- **Trade settlement over time.** Real trades pay and deliver on different days (for example pay on T+0, receive on T+2).
- **Outside parties.** Assets for a buy or a fund subscription come from, or go to, a broker, an issuer or a fund that has no account with us.
- **Partial and failed settlement.** A bank can reject a payment, a counterparty can deliver in pieces or late, and today the only outcomes are "completed" or "rejected".
- **Dealer behaviour.** A dealer account commits to deliver assets before it holds them, and the platform has to show that clearly without crediting anyone with assets nobody holds.

### Solution Overview

The SI keeps its place as the instruction a user submits. Underneath it, four levels with different purposes:

| **Level** | **What it is** | **Who it is for** |
| --- | --- | --- |
| Leg | One transfer written by the user: from, to, asset, amount, settlement date | The submitter |
| Account approval | One per account involved, recording that the owner agrees | Account owners |
| Obligation | What each account must deliver or receive, per asset and settlement position. This is what is funded and settled | Operators, system |
| Posting | The ledger entry for one leg once it settles. Always gross, one per leg | The record of account |

(Movements are the bank or wallet transfers that discharge an external obligation. They already exist in the movement PRDs.)

**Flow**
1. A user submits legs. Each leg has a settlement date.
2. The system derives obligations from the legs and one approval per account.
3. Each account owner approves. At approval the system checks affordability step by step and earmarks what each account needs.
4. An operator approves the instruction for settlement.
5. Each settlement position becomes eligible when all earlier positions are final. Internal obligations post straight to the ledger. External obligations create movements through the existing movement pipeline.
6. Obligations settle, possibly in pieces. When all are settled the instruction completes.

### Phases

| **Phase** | **Scope** | **Needs movements?** |
| --- | --- | --- |
| **A** | Settlement dates and order, obligation statuses, funding check, over-commitment for house accounts, progress view. Internal legs only | No |
| **B** | Counterparties on legs, external obligations settled through movements, partial settlement, failure and retry, unknown amounts, settlement fails and close-out | Yes (existing pipeline) |
| **C** (later) | One payment covering obligations from several instructions, delivery versus payment, securities | Yes (new patterns) |

Each requirement below is marked with its phase. Phase C is outlined only (Section 6).

### In Scope

- Phases A and B as described above.
- Create (operator and client), approve (account owners, operator), reject, close-out.
- Obligations, funding check, earmarks, execution, movements for external obligations, settlement fails.
- Operator and client views, funding check, settlement exceptions view.
- The data the Counterparties PRD needs (obligations and movements, and the count of client accounts involved).

### Out of Scope

| **Item** | **Reason** |
| --- | --- |
| One movement settling obligations from several instructions (aggregation) | Phase C |
| Delivery versus payment and securities through an agent | Phase C |
| Netting against a counterparty (`netting_enabled`) | Needs a legal netting agreement. External legs are always gross |
| Automatic timeout of an overdue obligation | A system must not decide a counterparty has defaulted |
| Recovering assets already delivered | A reversal or claim, not an SI operation |
| Credit limits per counterparty | Later |
| FX conversion | Outside platform scope |
| Automated bank integration changes | Covered by the DBS PRDs |
| Auto-approval rules for the operator gate | Open item 3; external legs never auto-approve |

### Actors

- **Submitter (client):** creates an instruction for accounts they can access.
- **Approver (client):** approves or rejects for accounts they can access. Cannot approve an instruction they submitted.
- **Individual client or service user:** creates an instruction directly, with their own accounts approved automatically.
- **Operator (maker or checker):** creates instructions on behalf of clients (maker-checker), approves instructions for settlement, submits and confirms movements, resolves exceptions.
- **Counterparty:** has no login. Its bank accounts and wallet addresses are the places we send to and receive from.
- **System:** derives obligations, checks funding, earmarks, executes positions on their date, matches arrivals, flags overdue obligations.

### Assumptions & Dependencies

- `PRD - Counterparties.md` and `PRD - Whitelist Bank Account and Address - Counterparty Scope.md` are delivered before Phase B. A counterparty's whitelists are Whitelisted Bank Account and Whitelist Address records with Who is this for? = Counterparty. A leg to an outside party needs an active counterparty with an approved bank account or wallet address for the asset.
- The movement pipeline (Outgoing and Incoming Movement, KYT, execution status, mark-as-failed, regeneration) from Phases 1A to 1D and the DBS PRDs exists.
- The balance service supports reserved, expected and total balances with a value date.
- House accounts that may commit ahead of their holdings are flagged (`mayOverCommit`).
- Existing instructions keep working (see FR-20, Backward Compatibility).

### Glossary

| **Term** | **Definition** |
| --- | --- |
| Settlement instruction (SI) | A group of transfer legs submitted together. |
| Transfer leg | A movement of one asset and amount from one party to another. A party is a unified account or a counterparty. |
| Internal leg | Both parties are unified accounts. |
| External leg | One party is a counterparty. The other is a unified account. |
| Settlement position | The settlement date. Positions run in date order. (The data model keeps an optional order field for imports and future use, but leg entry does not ask for it.) |
| Account approval | One approval row per account involved in the SI. |
| Obligation | The net amount an account must deliver or receive for one asset, at one settlement position, facing one counterparty or none. |
| Movement | A bank or wallet transfer that discharges part or all of an external obligation. |
| Posting | The ledger entry for one leg when it settles. |
| Earmark (reserved) | A hold on an account's balance. Reduces available, not total. |
| Expected balance | A display-only credit showing a pending inflow. Cannot be spent. |
| Over-commitment | Reserved greater than total. Allowed only on house accounts with `mayOverCommit`. |
| Funding projection | Running each account's schedule forward in position order to find the lowest point. |
| Settlement fail | An obligation that is not final and is past its settlement date. |
| Close-out | Ending an instruction after some obligations settled, by cancelling the rest. |

---

## Functional Requirements

### Section 1: Creating an Instruction

#### FR-1: [Operator] Create a Settlement Instruction (maker-checker) — Phase A (internal), B (external)

**Requirement Details**
As an operator, I want to create a settlement instruction on behalf of clients, with legs that settle on different dates and, in Phase B, with outside parties.

**Main Flow**
1. Operator opens Transaction Management > Settlement Instructions > Add New.
2. Operator enters the instruction details and adds legs (see Fields).
3. The funding check is not shown while legs are added. It appears in the review modal when the operator submits (FR-19).
4. Operator submits. System validates (FR-4) and shows a review modal with the instruction details, the legs grouped by settlement date (outside-party legs tagged), the funding check, and a comment box.
5. On confirm, system creates a maker-checker request. No SI exists yet and nothing is earmarked.
6. A different operator approves. System creates the SI, derives obligations and approvals (FR-5), and approves every account approval on behalf of the checker's authority (existing behaviour). The funding check runs (FR-7).
7. The SI is created with status `under_review` (operator) / `processing` (client).

**Instruction fields**

| **Field** | **Required** | **Rule** |
| --- | --- | --- |
| Transaction purpose | Yes | Existing options, including "Others" with a free-text field |
| External reference | Yes | Text |
| Internal note | No | Multi-line |

**Leg fields**

| **Field** | **Format or sample** | **Meaning** | **How it is obtained** | **How it is verified** |
| --- | --- | --- | --- | --- |
| Source | Internal account or external counterparty account | Party that delivers the asset | Operator selects an account | System checks the selected record exists and is active |
| Destination | Internal account or external counterparty account | Party that receives the asset | Operator selects an account | System checks the selected record exists and is active |
| Asset | Supported token or fiat asset | Asset on the transfer leg | Operator selects an asset | System checks that the platform supports the asset |
| Amount type | `Known` or `Unknown` | Whether the obligation amount is known during setup | Operator selects a value | System checks the value is allowed |
| Amount | Exact decimal at the asset precision | Transfer amount for a known amount leg | Operator enters the amount | System checks the amount matches the asset precision |
| Settlement date | `2026-10-01` | Date when the obligation settles | Operator enters the date | System checks the date is valid |
| External reference | Operator-entered reference | Reference for the external settlement | Operator enters the reference | System does not verify |
| Internal note | Operator-entered text | Internal note for the leg, not shown outside the operator team | Operator enters the note | System does not verify |

Notes on the fields:
- **Source and Destination** are one picker each, grouped as Internal accounts and External counterparties. The leg kind (internal transfer, send to outside party, receive from outside party) follows from what is picked and is not stored. A leg has at most one counterparty. Clients also get "Account I cannot access (enter account number)" in the picker, replacing the old Send and Receive leg types. Source and Destination must differ.
- **Amount type** `Unknown` is allowed only for operator-created legs that involve a counterparty (FR-13). When `Unknown`, the Amount field is hidden. Clients are always `Known`.
- **Counterparty whitelist** is not a user-entered field. It is resolved from the counterparty and asset: if exactly one approved bank account or wallet address exists it is used; if more than one, a selector appears and is required; if none, the leg is blocked.
- **Settlement date** defaults to today and cannot be before today unless the operator has the back-date permission.
- **Order within the day** is removed from leg entry. Legs on the same date are treated as one position and settle in the order of the obligations.

**Design Constraints**
- A leg must have exactly one counterparty or none. Two counterparties on one leg are not allowed.
- The creator writes the structure. The system never adds a house-account leg on its own.
- **Entering legs.** The Add New page starts with a choice of template (Blank, Transfer between accounts, Subscription to a fund; for operators also Buy from a broker and Client buys from us). A template only fills in legs, dates and order. The Add Transfer Leg window then opens for each template leg in turn, so the user chooses the accounts, counterparty and amounts. Legs are listed in a **read-only table** and added or changed in a **modal**, as on the existing Add Settlement Instruction page.
- The review modal uses the same sections as the create page, each with a small heading. In order: a short plain-language summary (what leaves custody and what is expected from outside parties, totals per asset, what stays between accounts, settlement dates); **Settlement Instruction Details** (purpose, external reference, internal note); **Transfer Legs** with Source, Destination, Amount and a Status column ("Leaves custody"), grouped by date and open for up to 6 legs, collapsed above that; **Funding check** in the same table as the create page, with a warning that approval will fail if any account is short (the user can still submit); **What happens next** for the role; and an optional comment.
- **Legs table.** Grouped by settlement date (each group shows its leg count and how many face outside parties; groups with more than 6 legs start collapsed). Columns: Source, Destination, Amount, Status (a "Leaves custody" tag for outside-party legs and the red "Needs attention" tag), and the actions Edit, Duplicate and Delete. A leg that is incomplete or invalid shows a red **Needs attention** tag, "Account not set" or "Amount not set" in the affected cell.
- **Add / Edit Transfer Leg modal.** One leg per window with the fields in the table above: Source, Destination, Asset, Amount type, Amount (hidden when Unknown), Settlement date, External reference and Internal note. The whitelist selector appears only when the counterparty has more than one approved whitelist for the asset. A new leg has an **Add another leg after this one** option that keeps the source, destination, asset and date. After saving a template leg the window moves on to the next leg that still needs completing. Duplicate copies a leg and opens it in the modal.
- **Paste from spreadsheet.** Columns Source, Destination, Asset, Amount, Settlement date (an empty Amount means Unknown); accounts by name or number, counterparties by name or counterparty ID. Unmatched rows are still added and flagged **Needs attention** so the user completes them with Edit.
- **Submit.** If any leg still needs attention, Submit shows a banner with the count ("2 legs need attention. Click Edit on a flagged leg to complete it.") and does not open the review. Only complete, valid legs feed the funding check.
- **Funding.** The create page has no funding panel, chip or per-leg shortfall tag. The funding check is shown only in the review modal when the user presses Submit. The page is a single column in this order: Settlement Instruction Details (purpose and external reference side by side, internal note below), Transfer Legs, then Exit and Submit.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Internal SI with two dates | Given legs at T+0 and T+2 between two accounts When the operator submits and the checker approves Then the SI is created with two settlement positions |
| Counterparty on a leg | Given a counterparty is picked as Destination Then the leg is a send to an outside party and Source must be an internal account |
| Outside party in Phase A | Given Phase A Then counterparties are not offered in the Source and Destination pickers |
| Two counterparties | Given both Source and Destination are counterparties Then submission is blocked |
| One whitelist | Given the counterparty has one approved bank account for the asset Then no selector is shown and it is used |
| Several | Given the counterparty has two approved wallet addresses for the asset Then the operator must choose one |
| None | Given the counterparty has no approved detail for the asset Then submission is blocked with the message in FR-4 |
| Back-date | Given a settlement date before today without the permission Then submission is blocked |
| Maker-checker | Given the maker Then they cannot approve their own request |
| No earmark before approval | Given a pending request Then no balance is earmarked |

---

#### FR-2: [Submitter client] Create a Settlement Instruction — Phase A (internal), B (external)

**Requirement Details**
As a client submitter, I want to create an instruction for accounts I can access, including legs to outside parties, so that the right people can approve it.

**Main Flow**
1. Submitter opens Transactions > Settlement Instructions > Create new.
2. Submitter adds legs by picking a Source and a Destination: an accessible account, an account they cannot access (entered by account number), or in Phase B a counterparty.
3. Counterparty selection uses the client picker (`PRD - Counterparties.md`, FR-11): name, type and status only. Suspended counterparties are greyed out.
4. On Submit, the review modal shows the funding check (FR-19) for the submitter's accounts.
5. On submit the SI is created with status `awaiting_client_approval` (operator platform) / `awaiting approval` (client platform). No funds are earmarked yet.

**Design Constraints**
- Account fields: dropdown for accessible accounts (entity then account), manual account ID entry for the other side. Unified accounts only. Invalid IDs return "Invalid account ID" from the backend.
- Counterparty whitelists are never shown to the client.
- An SI containing an external leg always requires operator approval (FR-8).

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Create | Given valid legs When the submitter submits Then the SI is `awaiting_client_approval` and nothing is earmarked |
| Counterparty picker | Given a client Then only name, type and status are visible, and suspended ones cannot be selected |
| Outside leg | Given a Send to outside party leg Then the From account must be one the submitter can access |
| Permission | Given a user without the create permission Then Create is not available |

---

#### FR-3: [Individual client / Service user] Create a Settlement Instruction directly — Phase A, B

As an individual client or service user, I can create an instruction without a client approver.

**Main Flow**
1. Same form and rules as FR-2, with accounts entered by ID.
2. On submit the SI is created and the account approvals for accounts the user can access are created already approved. Earmarks for those accounts are placed immediately (FR-7).
3. If other accounts are involved, the SI stays `awaiting_client_approval` until they approve. If all accounts are covered, the SI moves to `under_review`.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Own accounts only | Given all accounts belong to the user Then the SI is created at `under_review` with all approvals recorded as automatic |
| Mixed | Given one counterparty account Then the SI stays `awaiting_client_approval` for that account |
| Audit | Given an automatic approval Then it is flagged as automatic ("approved because the submitter holds authority"), distinct from an approval given by a person |

---

#### FR-4: [System] Validate Legs — Phase A, B

**Validations** (at submission and again when the SI is created)

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Each internal party is a unified account | `INVALID_ACCOUNT_TYPE` | Only unified accounts can be used. |
| Each account exists and is active | `ACCOUNT_NOT_ACTIVE` | The account is not active. |
| Source and Destination differ | `INVALID_ARGUMENT` | Source and Destination must be different. |
| At most one counterparty per leg | `INVALID_ARGUMENT` | A leg can have only one outside party. |
| Counterparty exists and is active | `INVALID_RECORD_STATE` | The counterparty is not active. |
| Counterparty has an approved bank account (fiat) or wallet address (token) for the asset | `NO_COUNTERPARTY_WHITELIST` | The counterparty has no approved whitelists for this asset. |
| Asset exists and is active | `RECORD_NOT_FOUND` | The asset could not be found. |
| Amount greater than zero and within the asset precision, or Amount type Unknown (operator, counterparty legs only) | `INVALID_AMOUNT` | Amount must be greater than zero and match the asset precision. |
| Settlement date is a valid date, not in the past without permission | `INVALID_DATE` | The settlement date is not valid. |
| Feature flag for the asset type is enabled | `FEATURE_NOT_ENABLED` | This asset type is not enabled. |
| Account ID format valid (client manual entry) | `INVALID_ACCOUNT_ID` | Invalid account ID. |

---

### Section 2: Obligations, Approvals and Funding

#### FR-5: [System] Derive Obligations and Approvals — Phase A, B

**Requirement Details**
When an SI is created, the system derives the obligations that will be funded and settled, and one approval per account.

**Netting rules**

| **Rule** | **Detail** |
| --- | --- |
| Net per | (account, asset, settlement position). Never across accounts, assets or positions |
| Direction | The sign of the net: receives added, delivers subtracted. A net of zero produces no obligation |
| External legs | Never net. Each external leg is its own obligation, named by the counterparty and the leg |
| Amounts not fixed | Never net. A leg with an unknown amount is its own obligation |
| Postings | Always gross, one per leg. Netting decides what is settled and funded, never what is recorded |

**Approvals**
- One approval row per distinct account in the SI, with status `awaiting_approval`, `approved` or `rejected`.
- Counterparties have no approval row.
- Account approval is recorded automatically when the submitter already holds authority (FR-3, FR-1).

**Obligation fields:** account, asset, direction (deliver or receive), counterparty (or none), settlement position, amount (or none), amount fixed, settled amount, status (see Status Diagrams), completed at, the legs it was built from.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Internal netting | Given a buyer pays 10,000 and a 10 fee (both SGD, same date) Then the buyer has one obligation to deliver 10,010 |
| Net receive | Given a seller receives 10,000 and pays a 10 fee on the same date Then the seller has one obligation to receive 9,990 |
| Different dates | Given the same account and asset on two dates Then two obligations exist |
| External never nets | Given two SGD legs from one client to a fund and to a fee account Then the leg to the fund and the leg to the fee are separate obligations |
| Not fixed | Given a leg with an unknown amount Then it forms its own obligation |
| Approvals | Given five accounts Then five approval rows exist and no row for a counterparty |
| Gross postings | Given any netted obligation Then each of its legs later posts as its own ledger entry |

---

#### FR-6: [Approver client] Approve or Reject an Account's Part — Phase A, B

**Requirement Details**
As an approver, I want to approve or reject the part of an SI that involves accounts I can access, so that my accounts are only committed with my agreement.

**Main Flow**
1. Approver opens an SI at `awaiting_client_approval`. They see only the legs that involve accounts they can access, and the obligations of those accounts.
2. Approver chooses Approve or Reject. For Approve the page lists "You are approving for: Account A, Account D" with a checkbox per account. They can approve some or all.
3. Reason: optional for approve, required for reject. MFA is required.
4. For each account approved the system runs the funding check (FR-7) and earmarks. If any account fails, nothing is approved and every earmark created in this action is rolled back.
5. When every account is approved the SI moves to `under_review` (operator) / `processing` (client).
6. On reject the SI becomes `rejected` with the reason "One of the counterparties has rejected the SI". Every earmark and expected balance already placed is reversed.

**Design Constraints**
- The submitter cannot approve their own SI.
- One approver per account is enough. No four-eyes within the client.
- The approver sees the funding check result per account before confirming.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Partial approval | Given an approver with access to A, D and E When they approve A and D only Then A and D are approved and E stays awaiting |
| All approved | Given the last account is approved Then the SI moves to `under_review` |
| Insufficient funds | Given an account cannot afford the schedule Then the approval fails with the offending date, and no earmark remains |
| Reject | Given a rejection with a reason Then the SI is `rejected` and all earmarks and expected balances are reversed |
| Own SI | Given the submitter Then Approve and Reject are not available to them |
| Visibility | Given an approver Then legs and obligations of accounts they cannot access are not returned |
| MFA | Given approve or reject Then MFA is required |

---

#### FR-7: [System] Funding Check and Earmarking — Phase A, B

**Requirement Details**
At account approval the system proves that each account can fund its whole schedule, and earmarks only what it needs.

**Algorithm (per account and asset)**
1. Take the account's obligations in position order (date, then order).
2. Run a cumulative total forward: delivers subtract, receives add. Start at zero, ignoring what the account holds.
3. **Earmark = the lowest point** the cumulative total reaches, as a positive number (or zero if it never goes below zero). Earmark that amount as reserved.
4. For every receive, add the amount to expected.
5. **Check (a), net affordability:** the earmark must not exceed the account's available balance.
6. **Check (b), projection:** the account's total balance plus the cumulative total must not go below zero at any position. The rejection names the position, account, asset and the shortfall.
7. If either check fails the approval is refused and nothing is earmarked.
8. **Restate, never draw down:** each time an obligation becomes final, the system recomputes the earmark over the remaining obligations and posts only the difference. It never releases more than it posted.

**House accounts (`mayOverCommit`)**
- Reserved may exceed total (available can go negative). This is over-commitment: a promise ahead of the assets, with no ledger effect.
- Checks (a) and (b) above are not enforced for these accounts, because over-commitment is allowed. The earmark is still placed in full.
- Total may never go negative, for any account including the house.
- An obligation whose delivering account lacks the balance does not execute. It waits (FR-9).

**Execution does not re-check balance.** Sufficiency was proven here, so postings are made with the balance check bypassed.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Net only | Given a client holding 5,000, owed 4,000 at T+0 and paying 8,000 at T+2 Then 4,000 is earmarked and available becomes 1,000 |
| Fails net | Given the client pays 12,000 at T+2 with the same 4,000 receipt Then approval fails on check (a) and nothing is earmarked |
| Fails projection | Given the client pays 8,000 at T+0 and receives 4,000 only at T+2 Then approval fails on check (b), naming T+0 and a 3,000 shortfall |
| Fix by order | Given the receipt is moved to T+0 Then the check passes |
| Over-commitment | Given a house account holding 0 BTC that must deliver 0.25 BTC at T+2 Then 0.25 is reserved, available shows -0.25 and total stays 0 |
| Negative total | Given any account Then its total can never go below zero |
| Restate | Given a settled obligation Then the earmark is recomputed over what remains and only the difference is released |
| Atomic | Given one account in the SI fails the check Then no account's earmark is kept |

---

#### FR-8: [Operator] Approve an Instruction for Settlement, or Reject It — Phase A, B

**Requirement Details**
Once every account has approved, an operator decides whether the platform will settle the instruction. This gate is separate from account approval: account approval asks whether the owner agrees, operator approval asks whether we agree to process it.

**Main Flow**
1. SI is `under_review`. The operator opens it and sees obligations, approvals and the funding result.
2. Operator clicks **Approve for settlement** (replaces the old "Process" button) or **Reject**.
3. Approve for settlement: system checks all involved accounts are active (error if not), and moves the SI to `settling`. Positions then run (FR-9).
4. Reject: reason required. All earmarks and expected balances are released. SI becomes `rejected`.
5. For operator-created SIs, the maker-checker approval creates the SI at `under_review` (FR-1). It still needs this Approve for settlement step, which keeps account approval and the go-ahead to settle separate.

**Design Constraints**
- Any SI containing an external leg needs a person's approval. It is never automatic.
- Whether internal-only SIs inside a risk threshold may be approved by a rule is an open item (see Open Items 3). The shape is: a rule evaluated at creation, with its outcome and reason recorded either way.
- Once approved, no further maker-checker is needed to settle any part of it. Existing operational gates (account active, compliance, submission) still apply per movement.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Approve | Given `under_review` When the operator approves for settlement Then the SI becomes `settling` |
| Inactive account | Given an involved account is not active Then approval fails with `ACCOUNT_NOT_ACTIVE` |
| Reject | Given a rejection with a reason Then the SI is `rejected` and all earmarks and expected balances are released |
| External leg | Given an SI with an external leg Then it cannot be approved automatically |
| Maker-checker SI | Given an operator-created SI approved by the checker Then it is `under_review` until an operator clicks Approve for settlement |
| Pending request | Given a maker-checker request is pending on the SI Then action buttons are hidden and only "View request" is shown |

---

### Section 3: Settlement

#### FR-9: [System] Execute Positions and Settle Internal Obligations — Phase A, B

**Requirement Details**
Positions run in order. Internal obligations settle by posting to the ledger.

**Rules**
1. A position becomes **eligible** only when every earlier position in the same SI is final (settled or cancelled). Obligations in the same position are independent and settle in parallel.
2. Nothing across different SIs gates anything.
3. On its settlement date an eligible internal obligation executes. The system posts one gross ledger entry per leg, atomically for the position, with the balance check bypassed. The value date of the posting is the time of execution.
4. After posting, reserved and expected are adjusted and the earmark restated (FR-7).
5. **Blocked delivery:** if the delivering account lacks the balance at execution, the obligation stays eligible and does not execute (no negative totals). It executes when the balance arrives. This is shown on the page as "Waiting for funds".
6. When every obligation of the SI is final the SI becomes `completed` and `transactedAt` is set to the time of the last settlement.
7. A position scheduled for a future date stays `pending` until its date.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Order | Given positions T+0 and T+2 Then T+2 obligations do not execute until T+0 is final |
| Gross | Given a netted obligation from two legs Then two ledger entries are posted |
| Blocked | Given the house delivers 0.25 BTC it does not hold Then the obligation stays eligible and the client's receive stays expected |
| Released | Given the house later receives 0.25 BTC Then the blocked obligation executes without a new approval |
| Same date | Given two obligations at one position Then they settle independently |
| Completion | Given all obligations settled Then the SI is `completed` |
| Future date | Given a future position Then it stays pending until its date |

---

#### FR-10: [Operator / System] Settle External Obligations Through Movements — Phase B

**Requirement Details**
An external obligation is discharged by a bank or wallet transfer. The movement pipeline in the Phase 1A to 1D PRDs is reused. This requirement describes how obligations connect to it.

**Outgoing (we deliver to the counterparty)**
1. When the obligation's position is eligible, the system raises it for execution. The operator selects the **source venue** (as when approving a withdrawal) and confirms the counterparty whitelist (bank account or wallet address) that will receive it.
2. The system creates an outgoing movement (`pending`) against the obligation, snapshots the counterparty whitelist into the movement, earmarks the source venue, and runs compliance: KYT on the destination for tokens, none beyond the approved bank account for fiat.
3. The operator submits the movement (existing behaviour). The venue status updates it. On confirmation the system posts the ledger entry (`DR account / CR source venue`), releases earmarks and updates the obligation.
4. If the bank rejects or the venue fails, see FR-12.

**Incoming (the counterparty delivers to us)**
1. The account's expected balance (placed at approval) shows the pending delivery.
2. The system detects the arrival through the existing incoming pipeline. It **auto-matches** the arrival to the obligation when the sender is one of the counterparty's approved whitelists. An amount up to the undischarged amount (plus tolerance) is applied in full, so several smaller arrivals (tranches) can settle one obligation.
3. A matched arrival is linked to the obligation, confirmed, and credited to the account (`DR venue / CR account`). Expected is released.
4. An arrival from the counterparty that does not match is left `unclassified`. The operator classifies it as a **settlement**, choosing the obligation (maker-checker), through the existing classification flow.
5. An arrival larger than the undischarged amount plus tolerance is not absorbed. Only the undischarged amount is applied. The excess is left `unclassified` and goes to break resolution.

**Tolerance** applies only to obligations with a fixed amount (FR-13).

**Movement pages.** Settlement movements are the same records as on Movement Management (Incoming and Outgoing, Token and Fiat tabs). Their classification is **Settlement** (alongside Deposit, Withdrawal, Rebalance and the classifications in the Manual Movement Booking PRD). Each movement ID on an obligation links to its Movement Management detail page, and that page links back to the instruction and the obligation. Actions on a settlement movement (Confirm, Mark as failed, Classify) are the existing movement actions; Mark as failed is maker-checker (`fail_outgoing_movement`) as in the repo today.

**The link between obligation and movement** carries an amount per link and an active flag. The invariant is: active link amounts plus the settled amount must not exceed the obligation amount.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Outgoing movement | Given an eligible outgoing obligation When the operator selects a source venue Then an outgoing movement is created, linked to the obligation, and the source venue is earmarked |
| Snapshot | Given the counterparty replaced its bank account later Then the movement keeps the version it was created with |
| Confirm | Given the bank confirms Then the ledger entry is posted, earmarks are released and the obligation is settled |
| Auto-match | Given an arrival from an approved counterparty address within tolerance Then it is linked and credited without operator action |
| Unclassified | Given an arrival from the counterparty that does not match Then it stays unclassified and appears on the counterparty's Incoming tab |
| Classify | Given an operator classifies an arrival as a settlement and chooses the obligation Then it is linked after maker-checker approval |
| Excess | Given an arrival above tolerance Then the excess goes to break resolution |
| Invariant | Given a movement larger than the undischarged amount Then it is rejected |
| Suspended | Given the counterparty is suspended Then new movements to it are blocked and open obligations are flagged |

---

#### FR-11: [System] Partial Settlement — Phase B

**Requirement Details**
An obligation is an amount to discharge and can be discharged in pieces.

**Rules**
- The obligation holds `settledAmount`. Each confirmed movement link adds to it.
- While `0 < settledAmount < amount` the status is `partially_settled`.
- Expected is drawn down by the amount of each piece only.
- The obligation is `settled` when `settledAmount` meets the amount within tolerance.
- A top-up movement can be issued for the undischarged amount without a new approval.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Pieces | Given an obligation to receive 49.8 and arrivals of 0.1 and 49.7 Then it is `partially_settled` after the first and `settled` after the second |
| Expected | Given the first arrival Then expected is drawn down by 0.1 only |
| Top up | Given 1,000 of a 10,000 payment was returned Then a new movement can be issued for 1,000 |
| No re-approval | Given a top-up Then no approval is requested |

---

#### FR-12: [Operator] Failed Movements and Retry — Phase B

**Requirement Details**
A movement is the attempt. The obligation is what must be discharged. When a movement fails, the obligation does not.

**Rules**
1. A movement fails (bank rejection, venue failure, or operator marks it failed with maker-checker as in Phase 1B). Its link becomes inactive and its amount returns to the undischarged amount of the obligation.
2. The obligation stays `instructed` or `eligible`. The account's earmark does not move. No ledger entry was made, so nothing is reversed.
3. The operator chooses one of two actions:
   - **Reissue:** create a new movement for the undischarged amount, for example after the counterparty's whitelists were replaced. No re-approval of the SI.
   - **Abandon:** reject the SI if nothing has settled (FR-15), or close it out.
4. The failed movement is kept for audit and shown with a "Failed" status.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Failure | Given a bank rejection Then the movement is `failed`, the link is inactive and the obligation is unchanged |
| Earmark | Given a failed movement Then the account's earmark is unchanged |
| Reissue | Given the operator reissues Then a new movement is created without a new approval and both movements show on the obligation |
| Source venue | Given the failed movement released its source-venue earmark Then the operator may choose a different source venue |
| Abandon clean | Given nothing has settled When the operator rejects the SI Then all earmarks and expected balances are released |

---

#### FR-13: [Operator] Indicative and Unknown Amounts — Phase B

**Requirement Details**
Some amounts are not known at booking (for example fund units that depend on a NAV struck later).

**Rules**
- A leg can have Amount type `Unknown`. No amount is entered.
- The obligation is created with `amountFixed = false`. It does not net and no expected balance is posted (an expected figure would read as a commitment).
- Tolerance matching does not apply until the amount is fixed.
- When the amount becomes known the operator sets it. The obligation becomes fixed, expected is posted, and tolerance matching applies from then.
- Setting the amount does **not** send the SI back for approval. Approval attaches to the deal, not the estimate.
- Only operator-created legs may be marked unknown.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Create | Given an outside receive leg with Amount type Unknown Then the obligation has no amount and no expected balance |
| Confirm amount | Given the operator sets 49.8 Then the obligation is fixed and expected 49.8 is posted |
| No re-approval | Given the amount is set Then the SI does not return to approval |
| Client | Given a client user Then Amount type `Unknown` is rejected |

---

#### FR-14: [System] Settlement Fails — Phase B

**Requirement Details**
An obligation that is not final and is past its settlement date is a settlement fail. This is a query, not a status.

**Rules**
- No automatic timeout. The obligation stays non-terminal until a person decides.
- Overdue obligations are flagged on the SI, the counterparty page (Overview and Transactions tab) and the exceptions view (FR-18).
- A late delivery settles normally. The record then shows the contractual date and the actual completion date.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Overdue | Given an obligation past its date and not final Then it is flagged Overdue |
| No timeout | Given an overdue obligation Then no status changes and nothing is released without a decision |
| Late | Given the delivery arrives six days late Then the obligation settles and the contractual and actual dates are both shown |

---

#### FR-15: [Operator] Reject, Close Out — Phase A, B

**Requirement Details**
What an operator can do to end an instruction depends on whether anything has settled.

| **State** | **Action** | **Result** |
| --- | --- | --- |
| Nothing settled | Reject (reason required) | SI `rejected`. Every obligation cancelled. All earmarks and expected balances released. Accounts return exactly to where they started |
| At least one obligation settled | Close out (reason required) | SI `failed`. Unsettled obligations cancelled and their reservations and expected balances released. Settled obligations stand |
| At least one obligation settled | Cancel | **Not available.** A status cannot rescind a payment that really happened |

**Design Constraints**
- Recovering assets already delivered is not an SI operation. It is handled as a reversal or a claim outside the instruction.
- The close-out confirmation lists what stays settled and what will be released.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Reject | Given nothing settled When the operator rejects Then the SI is `rejected` |
| Close out | Given one obligation settled and one overdue When the operator closes out Then the SI is `failed`, the overdue obligation is cancelled and its expected balance released |
| Cancel | Given something settled Then Cancel is not offered |
| Confirmation | Given close-out Then the modal lists settled and to-be-released obligations |

---

#### FR-16: [System] Effects of Counterparty Suspend and Close — Phase B

| **Counterparty event** | **Effect** |
| --- | --- |
| Suspended | New legs to it cannot be created. New movements to it cannot be submitted. Open obligations stay and are flagged "Counterparty suspended" for an operator decision. Incoming arrivals are still recorded |
| Reactivated | Creating and submitting are available again |
| Closed | Allowed only when no obligation is open (existing rule in the Counterparties PRD) |

---

### Section 4: Views

#### FR-17: [Operator] List and View Settlement Instructions — Phase A, B

**List**

| **Column** | **Content** |
| --- | --- |
| Settlement Instruction | ID |
| External Reference | Text |
| Account | Name of the first involved account, or the first name and "+N more". A client sees only accounts they can access |
| Counterparty | Name of the outside party, or the first name and "+N more"; "-" if none |
| Next settlement | Date of the next position not yet final, or "-" |
| Progress | "n of m obligations settled", with a red "n overdue" tag when any are overdue |
| Status | Badge |

Each filter matches a column, in the same order: Settlement Instruction ID, External reference, Account (any involved account), Counterparty, Next settlement date range, Status (multi), and **Overdue only** (toggle, operators; it matches the overdue tag in Progress). The number of legs, the internal note and the created date and user are shown on the detail page only (the created date stays in the CSV export). URL-saved filters, Export CSV, default page size 10.

**Detail page: layout, top to bottom**
1. **Header:** ID, status, external reference. Actions by status (below).
2. **Overview card:** the facts and the "Needs attention" list below. It shows what needs the operator, not everything about the instruction.
3. **Tab bar** (counts in labels, selected tab kept in the URL `?tab=`): **Progress** (default), **Legs**, **Approvals**, **Postings**, **Other Details**, **Audit log**.
4. **Tab content.**

The layout matches the Counterparties page (Counterparties PRD, FR-3).

**Overview card**

Key facts: **Status** (badge) and **Obligations settled** ("n of m", with the next settlement date while open).

"Needs attention" (zero or more rows, most urgent first, each with a link to the place to act; "Nothing needs attention." when empty):

| **Condition** | **Item** |
| --- | --- |
| Rejected / Failed | Red: the reason. Failed adds that settled obligations stand and the rest were cancelled |
| Under review (operator) | Blue: "Your decision: approve for settlement, or reject." |
| Awaiting client approval | Amber if the viewer must approve ("Your approval is needed for: accounts"), otherwise grey ("Waiting for approval from: accounts") with a link to Approvals |
| Overdue obligations | Red: "N obligations are overdue." Link to Progress |
| Failed movement with no active replacement (operator) | Red: "N failed movements. Reissue from the obligation card." |
| Waiting for funds (operator) | Amber: the delivering account does not hold the asset yet |
| Counterparty suspended (operator) | Amber: open obligations are flagged and new movements are blocked |
| Unclassified arrival from a counterparty of this SI (operator) | Amber, with a link to the exceptions view |
| Pending maker-checker request | Blue, with "View request" |

Tab flags: Progress shows a red dot when obligations are overdue or a movement has failed; Approvals shows a dot when the viewer must approve.

**Progress tab**
- A vertical timeline by settlement date. Each date is a band: done, current, upcoming.
- Under each band, one card per obligation: account, direction, counterparty (tagged "outside party"), amount settled of total (progress bar), status, and flags (Overdue, Waiting for funds, Counterparty suspended).
- Operators see the obligation's movements nested in the card, each movement ID linking to its Movement Management page, (status, execution status, reference, source or destination detail and version).
- Failed movements stay visible, greyed, with their reason.

**Legs tab:** table grouped by date: Source, Destination, Asset, Amount, Settlement date, external reference, internal note. External legs tagged. Clicking a leg opens the existing leg drawer.

**Approvals tab:** one row per account: account, status, approved or rejected by and at, reason, whether automatic. Obligation net amounts in a drawer.

**Postings tab (operators only):** the gross ledger entries with the leg and obligation they settle.

**Other Details tab:** ID, status, counterparties, settlement dates, purpose, external reference, internal note, created via / by / at, transacted at, reason.

**Sidebar:** the operator sidebar is always dark; the client sidebar is always light.

**Header actions by status**
- Awaiting client approval: none for the operator (read only).
- Under review: Approve for settlement, Reject.
- Settling: no global action. Actions are on each obligation card (Select venue and submit movement, Reissue, Mark failed, Classify arrival). Close out in the header when something has settled; Reject when nothing has.
- Pending maker-checker request: hide all actions, show only "View request".

**Statuses** (see Status Diagrams): operator and client labels differ.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Summary first | Given any SI Then the header and Overview card appear before the tabs |
| Quiet when healthy | Given a settling SI with nothing overdue, failed, waiting or suspended Then the Overview shows "Nothing needs attention." |
| Default tab | Given no tab in the URL Then Progress is selected. Given `?tab=legs` Then Legs is selected |
| Timeline | Given two settlement dates Then two bands are shown in order, each with its obligations |
| Progress | Given a partly settled obligation Then the card shows settled of total and a progress bar |
| Nested movements | Given an obligation with a failed and a retried movement Then both are shown, the failed one greyed |
| Overdue filter | Given the toggle Overdue only Then only SIs with an overdue obligation are listed |
| Counterparty filter | Given a counterparty Then only SIs involving it are listed |
| Gross postings | Given a netted obligation Then the Postings section lists one entry per leg |
| Pending request | Given a pending maker-checker request Then actions are hidden |

---

#### FR-18: [Operator] Settlement Exceptions View — Phase B

**Requirement Details**
A single place for what needs attention, so operators do not hunt through instructions.

**Location:** Transaction Management > Settlement Instructions > Exceptions (tab on the list page).

**Tables (one segmented control)**

| **Tab** | **Content** | **Columns** |
| --- | --- | --- |
| Overdue | Obligations past their date and not final | SI, account, counterparty, direction, amount, due date, days overdue |
| Failed movements | Movements that failed and have not been reissued | Movement, SI, counterparty, amount, failure reason, failed at |
| Unclassified arrivals | Arrivals from counterparties not linked to a settlement | Movement, counterparty (matched), amount, received at, Classify link |
| Waiting for funds | Eligible obligations blocked because the delivering account lacks the balance | SI, account, asset, shortfall |
| Counterparty suspended | Open obligations facing a suspended counterparty | SI, counterparty, amount |

Each row links to the obligation or movement. Counts show on the tabs.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Overdue | Given an overdue obligation Then it appears on the Overdue tab with days overdue |
| Failed | Given a failed movement with no replacement Then it appears on Failed movements |
| Reissued | Given the movement is reissued Then it leaves the tab |
| Unclassified | Given an unclassified arrival from a counterparty Then it appears with a Classify link |

---

#### FR-19: [Operator, Client] Funding Check in the Review Modal — Phase A, B

**Requirement Details**
As a user submitting an instruction, I want to see whether each account can afford the schedule before I confirm, so that I can go back and fix problems.

**Behaviour**
- The **Funding check** is a section of the review modal that opens on **Submit**. It is not shown on the create page while legs are being added.
- It has one row per account and asset the user can see, with Balance, Needs set aside, Lowest balance (with its date) and a Result: "Enough funds", "Short by X on [date]" or, for a house account, "Can commit beyond balance".
- Accounts with a problem are listed first and highlighted. A warning states that approval will fail until the shortfall is fixed. The user can still submit.
- The check uses the same algorithm as FR-7. It is advisory: the authoritative check runs at approval.
- Clients see the check only for accounts they can access.
- Over-commitment on a house account is shown as a note, not an error.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| On submit | Given complete legs When the user presses Submit Then the review modal shows the Funding check |
| Not on the page | Given the create page Then no funding panel, chip or per-leg shortfall tag is shown |
| Short | Given a leg takes an account to -3,000 at T+0 Then the row says "Short by 3,000 on T+0", is highlighted and listed first |
| Fix | Given the user closes the modal, changes the date and submits again Then the check reflects the change |
| Client scope | Given a client user Then accounts they cannot access are not shown |
| House | Given a house account that over-commits Then a note explains over-commitment and no error is shown |
| Schedule | Given an account row When the user clicks it Then the day-by-day schedule is shown |
| Modal entry | Given Add Transfer Leg When the user fills the modal and saves Then the leg appears in the table, grouped under its date |
| Add another | Given "Add another leg" is ticked When a leg is saved Then the modal reopens with the type, accounts, asset and date kept |
| Duplicate | Given a leg When the user clicks Duplicate Then a copy is added below it and opens in the modal |
| Paste | Given pasted rows with an account name that cannot be matched Then the rows are added, the unmatched leg shows Needs attention, and Edit opens it in the modal |
| Template | Given the user picks Subscription to a fund Then the table starts with the cash-out and units-in legs (and a fee leg for operators) with their dates and order, and the modal opens for the first one, then the next |
| Needs attention | Given an incomplete leg When the user clicks Submit Then a banner shows the count and the review does not open |

---

#### FR-20: [Client] List and View Settlement Instructions — Phase A, B

**Visibility rules**
1. A user sees an SI only if they have access to at least one account involved.
2. A user sees a leg only if they have access to at least one account involved in it. Counterparty account IDs and entity details of other clients' accounts may be shown as in today's rule (account ID, not name, plus the owning entity's name and ID). A counterparty is shown by **name and type only**. Counterparty whitelists are never shown.
3. A user sees an obligation only if it is for an account they can access, including net amounts, settled amount, status and settlement date.
4. A client never sees movements, venues or source venues. They see the obligation status and, once settled, the settlement date.

**List:** the same columns and filters as the operator list (FR-17): Settlement Instruction, External Reference, Account, Counterparty, Next settlement, Progress, Status. Account shows only accounts the client can access; Counterparty shows the name only. Filters: Settlement Instruction ID, External reference, Account (the client's own accounts), Counterparty, Next settlement date range, Status. There is no Overdue-only toggle for clients.

**View:** instruction details, the legs they can see grouped by date, the obligations they can see with their status and progress, approvals of their accounts, and the audit-visible events.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Scope | Given an SI involving accounts A and B and a user with access to A only Then only legs and obligations involving A are returned |
| Counterparty | Given an external leg Then the client sees the counterparty name and type and not its bank or wallet details |
| No movements | Given an obligation with movements Then the client sees only the obligation status and settlement date |
| Statuses | Given status `settling` Then the client label is Processing |

---

### Section 5: Cross-cutting

#### FR-21: [System] Backward Compatibility — Phase A

**Requirement Details**
Phase A must not change how existing instructions behave.

**Rules**
1. An SI whose legs all share one date and are internal behaves as today: the operator clicks the action, everything settles together, the SI completes. The button label changes from Process to Approve for settlement.
2. Existing legs without a settlement date take the date the SI was created.
3. Existing statuses keep their meaning. The new status `settling` and the new obligation statuses appear only for new instructions or as they move through the new flow.
4. Existing account obligations are converted to account approvals plus obligations without changing their recorded decisions, approvers or timestamps.
5. Existing API fields stay. New fields are optional where possible. The single "complete" call is replaced by approve for settlement. Position execution happens in the background and by date. API consumers need a migration note.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Same date | Given an internal SI with one date When the operator approves for settlement Then all obligations settle in one step and the SI completes |
| Existing data | Given an existing SI Then it displays with its legs, approvals and statuses unchanged |
| Date default | Given a legacy leg Then its settlement date is the SI creation date |

---

## Non-Functional Requirements

- **Atomicity:** posting a position, adjusting reserved and expected balances, restating the earmark and updating obligation statuses are one transaction. A failure leaves no partial state.
- **Idempotency:** creating an SI and confirming a movement are idempotent on their keys. A confirmation applies the ledger entry once.
- **Concurrency:** one maker-checker request at a time per SI or movement. A late bank message after an operator recorded an outcome is stored and does not change the movement.
- **Scheduling:** the daily position run is idempotent and safe to restart. Time zone for settlement dates: the platform default time zone, stated on the form.
- **Performance:** the funding check responds within a second for an SI of 50 legs.
- **Security:** counterparty whitelists are never returned to clients, including in errors.
- **Audit:** every state change is recorded (see Audit Log Events).

---

## Technical Specifications

### Data Model

**SettlementInstruction** (existing; changes)

| **Field** | **Change** | **Rules** |
| --- | --- | --- |
| `status` | Add `settling`, `failed` | Values: `awaiting_client_approval`, `under_review`, `settling`, `completed`, `rejected`, `failed` |
| `purpose`, `purposeOther`, `externalRef`, `remarks` | Unchanged | |
| `createdVia` | New | `client`, `operator` |
| `transactedAt` | Unchanged meaning | Time of the last settlement |
| `closedOutAt`, `closeOutReason` | New | Set on close-out |

**TransferLeg** (existing; changes)

| **Field** | **Change** | **Rules** |
| --- | --- | --- |
| `fromAccountId`, `toAccountId` | Now nullable | One may be null when the leg is external |
| `counterpartyId` | New | FK to Counterparty. Set when the leg is external. Exactly one of the other side or the counterparty |
| `counterpartyWhitelistId` | New | FK to the approved Whitelisted Bank Account or Whitelist Address chosen for the leg. Null while auto-resolved |
| `amount` | Now nullable | Null only when not known |
| `amountIsFixed` | New | Boolean. False for unknown (Amount type Unknown) |
| `settlementDate` | New | Date |
| `sequence` | New | Integer, optional, not entered on the form. Defaults to 0 |

**AccountApproval** (new; split out of the old Account Obligation)

| **Field** | **Rules** |
| --- | --- |
| `siId`, `accountId` | One row per account per SI |
| `status` | `awaiting_approval`, `approved`, `rejected` |
| `automatic` | Boolean |
| `actionBy`, `actionAt`, `reason` | |

**Obligation** (new / evolves the old Account Obligation)

| **Field** | **Rules** |
| --- | --- |
| `siId`, `accountId`, `assetId` | |
| `direction` | `deliver`, `receive` |
| `counterpartyId` | Nullable. Set for external obligations |
| `settlementDate`, `sequence` | The position |
| `amount` | Nullable |
| `amountIsFixed` | Boolean |
| `settledAmount` | Default 0 |
| `status` | `pending`, `eligible`, `instructed`, `partially_settled`, `settled`, `cancelled` |
| `completedAt` | Set when final |
| `legIds` | The legs it was built from |

**ObligationMovementLink** (new)

| **Field** | **Rules** |
| --- | --- |
| `obligationId`, `movementId` | |
| `amount` | Amount of the movement allocated to this obligation |
| `active` | False when the movement failed |

Constraint: for each obligation, the sum of active link amounts plus `settledAmount` must not exceed `amount`.

**Account** (existing; change): `mayOverCommit` boolean, default false, set only by an operator for house accounts.

**Posting / ledger:** one entry per leg, with the leg id and obligation id for traceability.

### Status Diagrams

**SettlementInstruction.status**

| **Status** | **Operator Label** | **Client Label** | **Meaning** | **Next** |
| --- | --- | --- | --- | --- |
| `awaiting_client_approval` | Awaiting client approval | Awaiting approval | Some accounts have not approved | `under_review`, `rejected` |
| `under_review` | Under review | Processing | All accounts approved. Awaiting the operator | `settling`, `rejected` |
| `settling` | Settling | Processing | Positions are running | `completed`, `failed` |
| `completed` | Completed | Completed | Every obligation settled | none |
| `rejected` | Rejected | Rejected | Ended before anything settled | none |
| `failed` | Failed | Failed | Closed out after at least one obligation settled | none |

Operator-created SIs start at `under_review` after the maker-checker approval. The operator then clicks Approve for settlement to move them to `settling` (FR-8).

**Obligation.status**

| **Status** | **Meaning** | **Next** |
| --- | --- | --- |
| `pending` | Waiting for earlier positions or its date | `eligible`, `cancelled` |
| `eligible` | Its turn has come. Waiting to execute or for a counterparty action | `instructed`, `settled`, `cancelled` |
| `instructed` | A movement has been submitted | `partially_settled`, `settled`, `eligible` (movement failed), `cancelled` |
| `partially_settled` | Part discharged | `settled`, `cancelled` |
| `settled` | Fully discharged | none |
| `cancelled` | Closed out or the SI was rejected | none |

Overdue is derived (not final and past its settlement date), not a status.

**Movement:** existing statuses and execution statuses from the movement PRDs.

### Permissions

| **Operation** | **Client Admin** | **Submitter** | **Approver** | **Individual / Service user** | **Operator Admin** | **Operator User** | **Compliance** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Create SI (with approval) | - | Y | - | - | - | Y (maker-checker) | - |
| Create SI directly | - | - | - | Y | - | - | - |
| Approve or reject account's part | - | - | Y | Y | - | - | - |
| Approve for settlement, reject | - | - | - | - | - | Y | - |
| Close out | - | - | - | - | - | Y | - |
| Select venue, submit, reissue movement | - | - | - | - | - | Y | - |
| Classify arrival as settlement | - | - | - | - | - | Y (maker-checker) | - |
| Back-date a leg | - | - | - | - | - | Y (separate permission) | - |
| Set `mayOverCommit` | - | - | - | - | Y | - | - |
| List, view | Y | Y | Y | Y | Y | Y | Y |
| Exceptions view | - | - | - | - | - | Y | Y |

(Proposal. Confirm with the permission model owner. Client create permission and approve permission are separate, as today.)

### Audit Log Events

`settlement_instruction:create`, `:approve_account`, `:reject`, `:approve_for_settlement`, `:close_out`, `:complete`; `obligation:derive`, `:execute`, `:settle`, `:cancel`, `:set_amount`; `movement:link`, `:fail`, `:reissue`; `account:set_may_over_commit`; plus the existing balance, maker-checker and movement events. Each carries the SI, obligation and movement ids where relevant, and the actor.

### Error Codes Used

`INVALID_ACCOUNT_TYPE`, `ACCOUNT_NOT_ACTIVE`, `INVALID_ARGUMENT`, `INVALID_RECORD_STATE`, `NO_COUNTERPARTY_WHITELIST`, `RECORD_NOT_FOUND`, `INVALID_AMOUNT`, `INVALID_DATE`, `FEATURE_NOT_ENABLED`, `INVALID_ACCOUNT_ID`, `INSUFFICIENT_BALANCE` (with the offending position), `SELF_APPROVAL_NOT_PERMITTED`, `MCH_REVIEW_IN_PROGRESS`, `FORBIDDEN`.

---

## Design Notes (reuse existing patterns)

| **Need** | **Reuse** |
| --- | --- |
| List page | Existing Settlement Instruction list: URL-saved filters, Export CSV, status badges |
| Create page | New start step with template cards, then the existing legs table with the Add Transfer Leg modal (with Source and Destination pickers that include counterparties, the whitelist selector and Amount type), and a review modal on Submit that includes the funding check |
| Detail page | Overview card plus tabs, as defined in the Counterparties PRD (FR-3) |
| Obligation and leg drawers | Existing drawers, with progress, movements and counterparty added |
| Approve, reject, close-out modals | Existing reject modal pattern with reason; add the close-out confirmation listing what stays and what is released |
| Counterparty picker | Searchable select (name and type), as in the Counterparties and Whitelist PRDs |
| Maker-checker | Existing "View request" pattern. Hide action buttons while a request is pending |
| Status vocabulary | Existing operator and client labels, extended as above |

Mockups to be designed: create form with leg fields and funding check; review modal grouped by date; detail page with progress timeline and obligation cards; close-out confirmation; exceptions view.

---

## Section 6: Phase C Outline (not specified here)

- **Aggregation:** one payment or arrival discharging obligations from several instructions (for example two agency clients buying from the same broker on the same date). One movement, several obligations, with an amount per link. Partial fills need an allocation rule: pro-rata by default, operator override, never silent.
- **Delivery versus payment and securities:** an atomic pair of movements through an agent, resolved or failed together, with matching reported as a venue sub-status. Needs a securities venue model and securities settlement details.
- **Netting agreements** per counterparty, and credit limits.

---

## Open Items

1. **Phase order:** this PRD assumes Phase A, then B, then C. Phase B can start in parallel once the Counterparties and Whitelist PRDs ship. Confirm.
2. **Approval split:** converting existing account obligations into account approvals plus obligations is a migration. Confirm the approach with engineering.
3. **Operator gate rule:** whether internal-only SIs inside a risk threshold may be approved by a rule. A risk decision. External legs never auto-approve.
4. **Client external legs:** this PRD allows clients to pick counterparties on legs (FR-2). Confirm whether clients should create external legs at all, or only operators.
5. **Settlement date time zone and cut-offs:** platform default time zone is assumed. Cut-off times per rail are not specified.
6. **Tolerance:** the tolerance for matching an arrival to an obligation (an amount or a percentage, per asset) is not defined.
7. **Value date of postings:** execution time is assumed. Confirm with finance whether the settlement date should be used.
8. **Compliance by counterparty type:** which checks apply to which counterparty type (KYT on token destinations is assumed; travel rule for arrivals from counterparties is not specified).
9. **Waiting-for-funds notification:** whether blocked delivery should notify anyone.
10. **Obligation view of netting for clients:** whether clients should see the gross legs behind a netted obligation. Today they see net amounts.
11. **Counterparty single-whitelist rule:** if a counterparty has several approved whitelists for an asset, the leg creator must pick. Confirm.
12. **Back-dating permission:** name and scope.
13. **Bulk entry of legs:** CSV file import with column mapping and a downloadable template (paste from a spreadsheet is already supported). Needs validation rules and a size limit.
14. **Decided:** legs are added and edited in a modal (as in the repo today), listed in a read-only table, with a template start step, Add another, Duplicate and paste from spreadsheet. The inline editable grid was tried and dropped because the fields did not fit on one row.

---

## Appendix A: Worked Examples

**1. Exchange trade, all internal (Phase A).** Buyer pays the seller 10,000 SGD and a 10 SGD exchange fee. Seller delivers 0.25 BTC and pays a 10 SGD fee. All legs at T+0.
- Obligations: buyer delivers 10,010 SGD; seller receives 9,990 SGD (10,000 in, 10 out, netted); seller delivers 0.25 BTC; buyer receives 0.25 BTC; exchange receives 20 SGD.
- Earmarks: buyer 10,010 SGD, seller 0.25 BTC. The seller earmarks no SGD (it only rises) and still pays the fee.
- Execution: one position, one atomic step. Four legs produce four ledger entries.

**2. Principal buy through a counterparty (Phase B).** Client buys 0.25 BTC at 10,000 SGD plus a 25 SGD fee. We source from a broker at 9,950 SGD and keep the 50 spread. Two instructions:
- SI-1 (client trade): client pays 10,000 and 25 SGD at T+0; house delivers 0.25 BTC to the client at T+2.
- SI-2 (sourcing): house pays the broker 9,950 SGD at T+2 (order 1); the broker delivers 0.25 BTC to the house at T+2 (order 2).
- The house holds no BTC, so it earmarks 0.25 BTC against nothing (available -0.25, total 0). The delivery to the client waits until the broker's BTC arrives. The 50 spread is never entered: it is the difference between what came in and went out.

**1b. Exchange trade, step by step in the prototype.** SI-1007 `EXCH-BTC-0301`.
1. Operator enters four legs: Buyer to Seller 10,000 SGD; Seller to Buyer 0.25 BTC; Buyer to Exchange 10 SGD; Seller to Exchange 10 SGD. Purpose Trade settlement, all dated today.
2. Submit opens the review modal: summary, details, legs, Funding check (every row "Enough funds"), what happens next.
3. A second operator approves under Maker Checker. Each account is approved automatically because the submitter holds authority.
4. The operator approves for settlement. The instruction goes Settling, then Completed in the same step, because there is no outside party.
5. Four legs become five obligations (netted) and four gross postings. Buyer ends at 39,990 SGD and 0.25 BTC, Seller at 9,990 SGD and 0.75 BTC, Exchange at 20 SGD.
6. **No movement is created.** Nothing crosses the custody boundary.

**2b. Principal buy, step by step in the prototype.** SI-1002 `BUY-0925` and SI-1003 `SRC-0925`.
1. SI-1002 is created, approved and approved for settlement. The SGD legs settle at once (3 of 5 obligations). The BTC obligations wait for T+2.
2. Advance the demo date to T+2. SI-1003's first obligation (House pays Meridian 9,950 SGD) becomes Eligible. Its second (Meridian delivers 0.25 BTC) stays Pending because it is order 2.
3. **Outgoing movement.** The operator selects the venue and the counterparty whitelist (Meridian has two approved bank accounts, so a choice is required) and creates the movement. Submit, then the bank confirms (simulated). The obligation goes Instructed, then Settled. The movement is classified Settlement automatically.
4. The BTC obligation becomes Eligible. **Incoming movements.** BTC arrives from Meridian's whitelisted wallet in tranches (0.10, 0.10, then 0.15). Each arrival from a matching sender is linked to the obligation and classified Settlement automatically; the obligation goes Partly settled, then Settled once 0.25 is reached. The 0.10 BTC above what was owed is saved as an **unclassified** incoming movement held in Suspense, flagged on the instruction and in Exceptions, for an operator to classify (see `PRD - Manual Outgoing Movement Booking and Classification.md`, FR-4).
5. With the BTC received, the House delivers 0.25 BTC to the client with one internal posting. SI-1002 completes. No movement is needed for this step.
6. Result: Acme -10,025 SGD and +0.25 BTC; House +50 SGD; Fee Account +25 SGD.

**3. Funding projection (Phase A).** A client holds 5,000 SGD, is owed 4,000 at T+0 and pays 8,000 at T+2.
- As booked: cumulative -4,000 at T+2, so earmark 4,000. Passes both checks.
- Pays 12,000: earmark 8,000 exceeds 5,000. Fails (a).
- Pays 8,000 at T+0 and is owed 4,000 at T+2: net is the same, but 5,000 - 8,000 = -3,000 at T+0. Fails (b), naming T+0 and 3,000. Moving the receipt to T+0 passes.

**4. Failed payment (Phase B).** The bank rejects a 10,000 SGD payment for a beneficiary name mismatch. The movement fails. The obligation remains, the earmark does not move, and no ledger entry is reversed because none was made. The operator replaces the counterparty's bank account details, and issues a new movement for the same obligation without re-approval.

**5. Settlement fail (Phase B).** Cash goes out at T+0 and the tokens are due at T+3. Nothing arrives. The obligation is flagged Overdue and stays non-terminal. If the counterparty has defaulted, the operator closes the instruction out: the delivered payment stays settled, the receive obligation is cancelled and its expected balance is released, and the SI becomes `failed`. Recovery of the cash is a separate claim.

---

## Appendix B: Research and Source Notes

This PRD is based on the existing Settlement Instruction PRD (Unified Account MVP Part 3), the movement and DBS PRDs, and the settlement simulator under `Future concepts/settlement/`. The simulator's design notes (netting per position, gross postings, earmark at the lowest point, over-commitment but never negative totals, movement and obligation separation, no automatic timeout, close-out versus cancel) are carried into the requirements above. Layout choices follow the Counterparties PRD research (summary first, Overview card, tabs). No external market research was done for this PRD, and the DvP and securities parts are left to Phase C.
