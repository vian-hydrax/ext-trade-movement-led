# Ext Trade Settlement Prototype

One prototype for the whole flow: open `index.html`. Pure HTML, JS and CSS. Data is kept in this browser; **Reset demo data** starts over. Use **View as** (top right) to switch between two operators and three client users, and **Advance 1 day** to move the demo date.

Specs, in `New Requirements/`: `PRD - Counterparties.md`, `PRD - Whitelist Bank Account and Address - Counterparty Scope.md`, `PRD - Settlement Instruction - External Settlement.md` and `PRD - Manual Outgoing Movement Booking and Classification.md`.

A step-by-step read of the two demo trades is in `Notes/Walkthrough - Exchange Trade and Principal Buy.md`.

Movement-led outgoing booking and classification now also has its own prototype: `Prototypes/Movement-led Outgoing Prototype/`.

## What is in it
| Sidebar item (operator) | What it holds |
| --- | --- |
| Approvals | One Maker Checker list for counterparty, whitelist, settlement instruction, movement booking and classification requests |
| Whitelist Management | Whitelist Addresses and Whitelist Bank Accounts (Who is this for? Client or Counterparty) |
| Counterparty Management | Counterparties (broker, exchange, issuer, fund, other): list, create, edit, suspend, close, and the page with Overview and tabs (Whitelists, Transactions, Other Details, Audit log). A counterparty has no account number, only a UUID (the Counterparty ID filter needs the full UUID) |
| Transaction Management > Settlement Instructions | List (filters match the columns), Exceptions, Add New, detail with Overview and tabs |
| Movement Management > Incoming Movement, Outgoing Movement | Token and Fiat lists, details, **Book** and **Classify** as two separate steps (see below), Mark as failed through Maker Checker |
| Prototype only: Balances, Demo controls | Account and venue balances, Deposit Suspense and Suspense (paid out), the custodian ledger, statement lines, recent ledger entries, and a "what to try" script |

## Settlement instruction flow
1. **Add New.** Pick a template (or Blank). Add each transfer in the **Add / Edit Transfer Leg** modal, in three groups: Parties (Source, Destination), Asset and amount (Asset, Amount type Known or Unknown, Amount), Schedule and references (Settlement date, External reference, Internal note). Source and Destination are one picker each: internal accounts or outside counterparties.
2. **Submit.** The review modal shows a summary, the details, the legs and the **Funding check** (one row per account: Balance, Needs set aside, Lowest balance, Result). The create page itself shows no funding panel.
3. **A second operator approves** under Approvals. Then the operator approves for settlement.
4. **Obligations are derived** from the legs. Internal ones are netted and settle at once on their date. Outside-party ones never net and settle through movements (below).
5. **Postings are gross**, one per leg, whatever the netting.

## Movements
**Created by a settlement instruction** (an obligation with an outside party):
- Outgoing: *Select venue and create movement*, *Submit*, then *Simulate bank confirmation*. Classified Settlement automatically.
- Incoming: *Simulate arrival* from the counterparty's whitelisted wallet or bank account. A matching sender is linked to the obligation and classified Settlement automatically. Amounts above what is owed are saved as an **unclassified** movement.

**That no instruction created** (a bank fee, a network fee, an unexplained arrival). Always two separate steps, as in the repo, each approved by a second operator:
1. **Book** the facts only, on a single-column form like the repo's create page: Venue and asset (with a **Token / Fiat radio**), Amount and timing, Other details (outgoing: beneficiary name or destination address, rail). There is no classification on the form. A booking that would take the venue below zero is allowed and shows a warning to the maker and the checker. The movement is saved as **Unclassified** and its amount is held in Suspense (incoming) or **Suspense (paid out)** (outgoing), so the books match the bank.
2. **Classify** it later with the **Classify** action: what it is for, who bears it, notes. Outgoing choices: Venue charges, Refund, Others. Incoming choices: Deposit, Settlement, Airdrop, Interest, Withdrawal reversal, Unknown funds, Others. A tied classification changes the account balance and adds a monthly statement line; an untied one goes to custodian expense or income.

## Demo data
| Item | What it shows |
| --- | --- |
| SI-1001 `SUB-FB-0412` | Fund subscription with an overdue delivery |
| SI-1002 `BUY-0925` and SI-1003 `SRC-0925` | Principal buy: client side and broker sourcing side |
| SI-1004 `ACME-ZEN-77` | Client instruction awaiting approvals |
| SI-1005 `LEGACY-0900` | Existing single-date internal instruction |
| SI-1006 `SUB-CF-0301` | Completed fund subscription with movements both ways |
| SI-1007 `EXCH-BTC-0301` | Exchange trade: Atlas Capital (buyer), Beacon Trading (seller), Orbit Exchange (exchange). All internal, completed, no movements |
| Counterparties | Meridian Capital Markets (broker), Crestline Opportunities Fund (fund), Sterling Digital Securities (suspended), Ridgeway Liquidity Partners (closed), Aurelia Digital Asset Fund, Orbit Exchange Ltd (exchange) |
| Movements | Two unclassified incoming arrivals (0.05 BTC and 25 TOKEN) and one unclassified outgoing 8 SGD fee are waiting to be classified |

## How the parts are connected
- A counterparty's approved whitelists are what a settlement instruction leg can pay or receive with. Add one on the counterparty page and it is available in the leg pickers straight away.
- Suspend a counterparty and its open obligations are flagged on the instruction and in Exceptions; new movements are blocked.
- The counterparty's Transactions tab and the "Open settlements" counts are read from the settlement instructions.
- Clients see their instructions and a client Whitelists page. Counterparty records are never shown to them.

## Notes
- Layout follows the Operator UI repo: Roboto, antd tokens, 640px single-column forms with titled sections, and detail pages with a grey label above a bold value. Balances shows the age of the oldest unclassified entry in Suspense (paid out), flagged after 7 days.
- Audit events follow the PRD: `<direction>_movement:create_request` and `classify_request` when the maker submits, then `create` and `classify` when the checker approves. A rejection writes no business row.
- Not in the prototype: the reversal pattern (PRD open item 4), and the repo's extra incoming fields (VAN, channel, depositor bank).
- Prototype simplification: approving a classification of an **incoming** movement also confirms it and posts the ledger entry (the real flow has a separate Confirm). Outgoing manual movements are already confirmed when booked, so their classification posts at approval.
- `cp.js` holds counterparties, whitelists and approval detail. `si.js` holds settlement instructions and movements. `shell.js` is the sidebar, top bar and routing. The two modules talk through `CPApp` and `SIApp`.
- Account and Entity whitelists (client side) work as today and are not simulated.
- Bank confirmations, rejections and arrivals are simulated by buttons.
- Demo state is saved under the browser keys `ets-cp-v3` and `ets-si-v5`. Reset demo data clears them.
