# Movement-led Outgoing Prototype

Separate prototype for the PRD "Manual Outgoing Movement Booking and Classification" (`New Requirements/PRD - Manual Outgoing Movement Booking and Classification.md`). Scope is movement-led outgoing only; incoming classification is a later phase. Open `index.html`. Pure HTML, JS and CSS. Data is kept in this browser (key `mlo-si-v9`), separate from the Ext Trade Settlement prototype; **Reset demo data** starts over. Use **View as** to switch between Alice and Bob (two operators), and **Advance 1 day** to move the demo date.

Layout follows the Operator UI repo: Roboto, antd tokens, 640px single-column forms with titled sections, a Token / Fiat Type radio, a Payment rail filter and column on the Fiat list, and two-column detail pages with a grey label above a bold value.

## What is in it
| Sidebar item | What it holds |
| --- | --- |
| Approvals | Maker Checker list of movement requests (book and classify) |
| Movement Management > Outgoing Movement | Token and Fiat lists, detail, **Book Outgoing Movement**, **Classify** (two separate steps, each approved by a second operator) |
| Prototype only: Balances, Demo controls | Account and venue balances, Unclassified outgoing with the age of the oldest entry (flagged after 7 days), unknown funds awaiting refund, costs borne by the custodian, recent balance effects, and a "what to try" script |

Greyed items (Incoming Movement and the rest of the Operator UI menu) are not part of this prototype.

## Flow
1. **Detail pages** have the same sections for every outgoing movement: Details, then Payment details and To (Fiat), or Blockchain and addresses and Compliance (KYT) (Token). A booked-by-hand movement shows only what was entered and marks the rest not applicable.
2. **Book** the facts only: Venue and asset (Type radio, Venue, Asset; the venue's current balance is shown, and the bank account number, blockchain and source address fill in automatically), Amount and timing (Amount, Transacted at, Reference), Other details (payment rail ACT, FAST, MEPS or TT (choosing MEPS or TT fills in the charge bearer and a DBS charge bearer account from the System > Charge Instructions default, which can be changed), beneficiary or destination, note). No classification on the form. The review modal states the effect on the venue balance. A booking that would take the venue below zero is allowed and shows a warning to the maker and the checker.
3. A second operator approves (the approval toast has an **Open movement** button). The movement is `confirmed` and **Unclassified**; the venue drops and the amount is listed under **Unclassified outgoing**.
4. **Classify** it: Venue charges (Bank charge, Network fee, Other venue fee), Refund (of an unknown funds entry) or Others (explanation of at least 10 characters). Then who bears it: an account (balance falls, monthly statement line) or the custodian (recorded as a custodian cost). A second operator approves. If it is tied to an account, that account's balance changes and the movement appears on its monthly statement (Balances shows the statement lines); a custodian-borne classification changes no account. No separate transaction or menu is created: the classified movement is the record.
5. Booked-by-hand movements have no execution method (the repo's `manual` means a withdrawal needing manual processing); use the **Origin** filter on the outgoing lists to find them.
6. Withdrawal, Rebalance and Settlement are instruction-led and are never offered for a manual booking.

## Token specifics (checked against the repo)
- The Token list has a KYT status column, as the repo does; a hand-booked movement shows "-".
- The Blockchain and addresses card also has Amount type and External ID, as the repo's token detail does; a hand-booked movement shows them as not applicable.
- The Network fee field shows only for a venue on a chain with no fee sponsor (Bitcoin). On Ethereum a note says the sponsor pays, so no fee is booked.
- Execution method shows "Not applicable (booked by hand)" (the repo would show Automated when the field is empty).

## Venues
Two fiat venues (Bank Venue V and X, bank accounts) and three token venues, each with one blockchain and one address (Token Venue W, a Bitcoin hot wallet; Token Venue Z, an Ethereum hot wallet; Cold Wallet Y, a Bitcoin cold wallet). The booking form asks for the venue first, then fills in the blockchain and source address, then offers only the assets that venue holds. The booking offers fiat venues for Fiat and hot or cold wallets for Token; external wallets are not a source. Detail pages show **From** (the venue, with its kind) and **To** (the whitelisted destination for instruction-led, or what was typed with an "Entered by hand" tag). Balances shows each venue's type.

## Demo data
Outgoing movements, so the detail pages can be compared by type and origin:
- Instruction-led: a fiat withdrawal (OM-3007, with a whitelisted bank account, payment reference and charge bearer account) and a token withdrawal (OM-3008, with blockchain, addresses, network fee, whitelist address and KYT).
- Instruction-led in other statuses, so the lists and filters show more than Confirmed: fiat withdrawals that are Pending (manual, with a fallback reason), Submitted (processing) and Failed (rejected, beneficiary account closed); token withdrawals that are Pending (KYT in progress), Submitted (processing, with a transaction hash) and Failed (KYT failed). Their actions run from the linked withdrawal and are not simulated here.
- Booked by hand: a token network fee paid separately (OM-3003, with a note that KYT does not apply), plus the fiat movements below.

Four outgoing fiat movements (the tied 12.50 SGD fee already shows on the Acme Main Account statement): an instruction-led withdrawal (OM-3007), an unclassified 8 SGD fee (OM-3006), and two classified bank charges (one charged to an account, one borne by the custodian). One pending booking (R-1, a BTC network fee paid separately). One unknown funds entry (200 USD, `BANK-REF-2002`) waits for a Refund.

## Notes
- Audit events follow the PRD: `outgoing_movement:create_request` and `classify_request` when the maker submits, then `create` and `classify` when the checker approves. A rejection writes no business row.
- A correcting booking is just a normal booking in the opposite direction classified Others; there is no special screen. Incoming movement pages are hidden; incoming is out of scope.
- The folder started as a copy of the Ext Trade Settlement prototype. Code that nothing in this prototype can reach (settlement instructions, counterparties, whitelists, the incoming forms and the settlement approval types) has been removed, so the folder is now `index.html`, `styles.css`, `shared.js`, `shell.js` (sidebar, routing, approvals list) and `si.js` (movements, balances, approvals detail, demo data). Unused CSS was removed too.
- Simplified in the prototype, specified in the PRD: audit rows are one-line text (not the structured metadata, security fields or failure rows); only the operator role gate exists (no Compliance user); instruction-led actions (Confirm, Mark as failed, Manually process, Override KYT, BTC fee rate) are not simulated; the venue pages that embed the outgoing list, the withdrawal and rebalance links, `borneBy`, decimals and active-venue checks, and the catalogue as data are not built. There is no incoming booking or classification in the prototype. Two incoming records are only seeded so the demo has something real: IM-3001 (a confirmed 5,000 SGD deposit) and IM-3005 (200 USD of unknown funds recorded as unassigned, which the Refund demo clears). 
- The PRD section **Step-by-Step Use Cases** (UC-1 to UC-8) walks through each option with the same demo data. `Notes/Test Guide - Movement-led Outgoing Prototype.md` is the click-by-click test version.
