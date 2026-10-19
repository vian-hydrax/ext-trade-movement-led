# Test guide: Movement-led Outgoing Prototype

How to test every flow of `Prototypes/Movement-led Outgoing Prototype/` against `New Requirements/PRD - Manual Outgoing Movement Booking and Classification.md`. Each test has the steps, the expected result and a Pass / Fail box to fill in.

## 1. Setup

1. Open `Prototypes/Movement-led Outgoing Prototype/index.html` in Chrome. If a page looks stale after an edit, hard refresh (Cmd+Shift+R).
2. Click **Reset demo data** (top right) before each full run. Data is saved in the browser under `mlo-si-v13`, so a reset gives every run the same starting point.
3. **View as** (top right) switches between **Alice Tan** and **Bob Lim**, the two operators. Every booking and every classification needs the *other* operator to approve it. **Advance 1 day** moves the demo date forward.
4. Approvals are under **Approvals** in the sidebar. Balances are under **Balances** (prototype only).

Tip: after approving a booking, the toast has an **Open movement** button that goes straight to the new movement.

## 2. Demo data you start with

| Item | What it is |
| --- | --- |
| Bank Venue V, Bank Venue X | Fiat venues (bank accounts). V holds SGD and USD, X holds SGD |
| Token Venue W | Bitcoin hot wallet (BTC) |
| Token Venue Z | Ethereum hot wallet (UNIT, TOKEN) |
| Cold Wallet Y | Bitcoin cold wallet (BTC) |
| OM-3002 | Hand-booked 25 SGD bank charge, already paid by us |
| OM-3003 | Hand-booked BTC network fee, already paid by us |
| OM-3004 | Hand-booked 12.50 SGD bank charge, already charged to Acme Main Account |
| IM-3005 | Unknown funds, 200 USD, reference `BANK-REF-2002` at Bank Venue V: an incoming movement that is Detected and Unclassified, waiting for a Refund (Incoming Movement > Fiat) |
| IM-3015 | Unclassified token entry, 0.01 BTC, hash `TX-IN-7731c0a9e4b2`, at Token Venue W, sender `bc1qunknown0sender8addr5x2m`: an incoming movement that is Detected and Unclassified (Incoming Movement > Token). Use it for the Classify tests and for a Bitcoin Refund (book an outgoing 0.01 BTC at Token Venue W) |
| IM-3001 | A confirmed 5,000 SGD deposit to Acme Treasury (incoming, for reference) |
| OM-3006 | Hand-booked 8 SGD fee, **Unclassified** (use it for the classify tests) |
| OM-3007, OM-3008 | Instruction-led withdrawals (fiat and token), Confirmed |
| OM-3009 to OM-3014 | Instruction-led withdrawals in Pending, Submitted and Failed states |
| R-1 | A pending booking request (BTC network fee `TX-FEE-8841`) made by Bob, waiting for Alice |

Accounts you will use: **Acme Main Account** (has SGD, BTC and USD, no UNIT), **Acme Treasury**, **Zenith Trading Main**.

## 3. Roles and rules to keep in mind

- The person who submits a request can never approve it. Their Approve button is hidden.
- A booking records facts only. A classification is a separate step with its own approval.
- A booking is **Confirmed** and **Unclassified** right after approval, and its amount is listed under **Unclassified outgoing** until classified.
- Hand-booked movements show a **Booked by hand** tag and no execution method ("Not applicable").

## 4. Flow tests

Use this order. Reset demo data first. "As Alice" means pick Alice in **View as**.

### A. Booking a fiat movement

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| A1 | As Alice: Movement Management > Outgoing Movement > **Fiat** > **Book Outgoing Movement** | Form has Type (Token / Fiat), Venue, then Bank account number (read only), then Asset, then Amount, Transacted at, Bank reference, then Other details | |
| A2 | Choose Venue = Bank Venue V | Bank account number fills in. Under the venue, "Current balance" lists each currency it holds as **Total** and **Available** (Bank Venue V SGD: Total 2,000,000.00 · Available 1,998,500.00, because a pending withdrawal reserves 1,500). Asset list shows SGD and USD only | |
| A3 | Choose Payment rail = MEPS (or TT) | Each rail shows its description. **Charge bearer** fills in as Sender Pays (DEBT) and **Charge bearer account** fills in with a DBS venue (the System > Charge Instructions default). Both can be changed. The account list shows DBS venues only. Choose Beneficiary Pays (CRED) and the account disappears. Choose ACT or FAST and both disappear | |
| A4 | Click Submit with Amount empty | Message next to the field: "Enter an amount." | |
| A5 | Amount = 0 | "Amount must be greater than zero." | |
| A6 | Reference = `DBS-FEE-0932` (already used at Bank Venue V) | "A movement with this reference already exists at this venue." | |
| A7 | Fill a valid booking: Bank Venue V, SGD, 30, reference `DBS-FEE-T1`, then Submit | A review window shows the plain-language effect ("...recorded as unclassified... The venue balance drops by 30.00") and a comment box | |
| A8 | Confirm and submit for approval | Toast "Movement submitted". Balances are unchanged. Approvals shows the request as **Awaiting Approval** | |

### B. Approving or rejecting a booking

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| B1 | As Alice open the request you just made | There is no Approve or Reject button (maker cannot approve) | |
| B2 | As Bob open it | The preview card lists type, venue, amount, reference, rail, beneficiary. Approve and Reject are shown | |
| B3 | As Bob click **Reject**, give a reason | Request shows Rejected. No new movement. Bank Venue V SGD is unchanged | |
| B4 | Repeat A7 and A8 with reference `DBS-FEE-T2`, then as Bob click **Approve** | Toast "booked as Unclassified" with an **Open movement** button | |
| B5 | Click Open movement | Detail shows tags **Confirmed**, **Booked by hand**, **Unclassified**, a banner "The money has already left the venue and is waiting to be classified", Execution method "Not applicable (booked by hand)", a **Classify** button | |
| B6 | Open **Balances** | Bank Venue V SGD dropped by 30. Unclassified outgoing SGD rose by 30 | |
| B7 | Open the movement's Audit log | `outgoing_movement:create_request` and `outgoing_movement:create` both appear | |

### C. Classifying: paid by us

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| C1 | As Alice open OM-3006 (or the movement from B4) and click **Classify** | Window shows Amount, Venue, Reference. Classification options are only Venue charges, Refund, Others | |
| C1a | Classify a **Fiat** movement as Venue charges and open Charge type | Only Bank charge and Other venue fee are offered |
| C1c | Classify a token movement as Venue charges, **Network fee**, leave Related transaction empty, submit | Blocked: "Choose the withdrawal this network fee belongs to." Related transaction is marked required only for Network fee | |
| C1b | Classify a **Token** movement (for example OM-3003's kind, a new BTC booking) as Venue charges and open Charge type | Only Network fee and Other venue fee are offered. Bank charge is not in the list |
| C2 | Submit with nothing chosen | "Choose a classification." | |
| C3 | Choose Venue charges, Submit | "Choose who bears it." (and a charge type is also required) | |
| C4 | Venue charges, Charge type = Bank charge, Charged to = **We pay it (company cost)** | The effect line reads "...paid by us. It is recorded as a company cost. No account balance changes." | |
| C5 | Submit | Movement shows the banner "ongoing maker checker request" and the button changes to **View request**. In the list the row also shows View request instead of Classify | |
| C6 | As Bob approve it | Movement is Venue charges, Bank charge, Charged to "We pay it (company cost)". No Classify button. Balances: Unclassified outgoing drops, Company costs rises by the amount | |
| C7 | Book another fiat movement (SGD, Bank Venue V), approve, then Classify: Venue charges, Bank charge, We pay it (company cost). In Related transaction click the box and type `WD-20` | A list opens with matches such as "WD-2039 · Withdrawal · movement OM-3011…", "WD-2041 · Withdrawal · movement OM-3007 · 2,000.00 SGD". Narrow it to `WD-2041` and choose the row: the field shows it with a **Clear** link |
| C7a | On a **Fiat** movement open the Related transaction list | Only fiat records (SGD and USD movements and WD or DEP IDs), withdrawals first. No BTC or other token records |
| C7b | On the token entry IM-3015 (Others) open the list | Only Bitcoin records (OM-3008, OM-3012, OM-3013 and their WD IDs, OM-3003). The Ethereum withdrawal OM-3014 and every fiat record are not listed |
| C7c | Classify a movement, choose Refund | The form shows "Unknown funds entry to refund" and **no Related transaction field**. Switch to Venue charges or Others: the field appears |
| C8 | Click **Clear**, then type `WD-9999` | The list says "No transaction found for this ID." and no row can be chosen. Submit still works with the field empty |
| C9 | Choose `WD-2041` again, submit, approve as Bob, open the movement | Related transaction shows `WD-2041` as a link with "Linked to OM-xxxx (WD-2041)" |
| C10 | Click the link, then scroll to **Linked movements** on the withdrawal | The table lists the hand-booked movement with classification, amount and the tag "Booked by hand" |
| C11 | Classify one more movement without choosing a Related transaction, approve, and open it | The detail has no Related transaction row, and the movement is in no Linked movements table |

### D. Classifying: charged to a customer account

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| D1 | Book another fiat movement (SGD, 15, new reference) and have the other operator approve it | Unclassified movement | |
| D2 | Classify: Venue charges, Bank charge, Charged to = **A customer account**, Account = Acme Main Account | Effect line says the balance falls and the line appears on the monthly statement | |
| D3 | Add Related transaction (chosen from the list) `DEP-1001` and an Explanation, submit, approve as the other operator | Movement shows Charged to Acme Main Account, the note **Appears on the monthly statement**, Related transaction and Explanation | |
| D4 | Balances | Acme Main Account SGD total is 15 lower. "Statement lines from manual bookings" has a new line with the classification, explanation and reference | |
| D5 | Book a movement bigger than the account holds (for example 99,999 SGD) and classify it to Acme Main Account | "The account does not have enough balance." The movement stays Unclassified. Classify it as custodian-borne instead and it works | |

### E. Rejecting a classification

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| E1 | Classify an unclassified movement, then as the other operator **Reject** | Request is Rejected. The movement is still **Unclassified** with a Classify button. Unclassified outgoing is unchanged | |
| E2 | Classify it again and approve | Works normally | |

### F. Others (catch-all)

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| F1 | Classify as **Others**, Charged to = We pay it (company cost), Explanation = `short` | Blocked: "An explanation of at least 10 characters is required." | |
| F2 | Explanation = `Test of the catch-all classification`, Charged to = We pay it (company cost), submit and approve | Classified as Others, shown as We pay it (company cost). Corrections of mistakes are tested in section P | |

### G. Refund of unknown funds

IM-3005 is 200 USD of unknown funds: an incoming movement at Bank Venue V that is Detected and Unclassified. Check Balances: **Unclassified incoming** shows USD 200.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| G1 | Book Fiat, Bank Venue V, **USD 150**, a new reference. Approve it | Unclassified | |
| G2 | Classify: Refund. The field "Unknown funds entry to refund" lists IM-3005 (only entries at the same venue and in the same asset are listed) | Effect line: "It clears the unknown funds entry that is waiting to be returned." | |
| G3 | Choose IM-3005 and submit | Blocked: "The refund must equal the unknown funds entry amount (200.00 USD)." | |
| G4 | Book Fiat, Bank Venue V, **USD 200**, approve, classify as Refund of IM-3005, submit | The approval preview shows Charged to "Not applicable (clears the unknown funds entry)" | |
| G4a | In G4, book with Beneficiary name **Acme Treasury** (not the sender), then classify as Refund and choose IM-3005 | Warning: "Check the destination. Entered at booking: Acme Treasury. Original sender name of IM-3005: Unknown remitter." Submit still works | |
| G4b | Repeat with Beneficiary name left empty | Note: the refund will show "Unknown remitter" as its destination. After approval, To on the detail page shows Unknown remitter with the tag "From the refunded entry IM-3005" | |
| G4c | Repeat with Beneficiary name **unknown remitter** | No warning | |
| G5 | While that request is pending, try a second 200 USD refund of the same entry | "Another request is already refunding this entry." | |
| G6 | Approve | Balances: Unclassified incoming for USD becomes empty. Unclassified outgoing USD is cleared for the 200. Bank Venue V USD ends where it started (it rose 200 when the funds arrived and fell 200 when the return was booked). IM-3005 shows status **Refunded** with a link to the refund. No customer statement line is created | |
| G6a | After approval, open the refund movement | Related transaction shows the refunded entry (IM-3005) as a link, set by the system. It was not asked on the form |

### H. Token booking: Bitcoin

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| H1 | Outgoing Movement > **Token** > Book Outgoing Movement. Choose Blockchain = **Bitcoin**, then Venue = **Token Venue W** | The Venue list is disabled until a blockchain is chosen, and offers only hot and cold wallets on it (Token Venue W and Cold Wallet Y). Source Address fills in. Asset list shows only BTC. After choosing BTC, a **Balance** row shows Total and Available in BTC. A **Network Fee** field is shown | |
| H2 | BTC, 0.0003, reference `TX-TOK-1`, Network fee 0.00001, Destination `bc1qdestination0addr`, submit, review, confirm | The review lists Blockchain, Destination address and Network fee | |
| H3 | As the other operator approve, open the movement | Token detail has the repo's sections in the repo's order: **Details** (two columns: Movement ID, Movement Type, Execution Status, Direction, Linked Transaction, Source Address, Amount, Amount Type, Transacted At, Created By, Updated By / Movement Status, Execution Method, Classification, Asset, Venue, Destination Address, Total Received, Network Fee, Created At, Updated At), **Additional Details** (Blockchain, Transaction Hash; Destination ID and External ID are hidden), **Know Your Transactions**, then **Booking and Classification**. **Amount Type, Total Received, Execution Method** and every KYT row show "Not applicable (booked by hand)". Execution Status shows Settled. KYT note: "KYT does not apply..." and no Run/Pass/Fail KYT buttons | |
| H4 | Balances | Token Venue W BTC dropped by 0.0003. Unclassified outgoing BTC rises by 0.0003 (from 0.0002 to 0.0005, because the demo data already holds one unclassified BTC movement) | |
| H5 | Classify: Venue charges, **Network fee**, An account, Acme Main Account, Related transaction (chosen from the list) `WD-2042`, approve | Acme Main Account BTC falls by 0.0003 (0.45 to 0.4497). Statement line appears with the reference | |
| H6 | Reuse the reference `TX-TOK-1` | "A movement with this reference already exists at this venue." | |
| H7 | Choose Blockchain = Bitcoin, Venue = **Cold Wallet Y** | Blockchain Bitcoin, its own source address, asset list shows BTC only | |

### I. Token booking: Ethereum (fee sponsor pays)

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| I1 | Token > Book > Blockchain = **Ethereum**, Venue = **Token Venue Z** | Only Token Venue Z is listed. Assets: UNIT and TOKEN. The optional **Network fee** field still shows, with a hint to leave it empty when a sponsor paid | |
| I2 | Book UNIT 3, reference `TX-ETH-1`, approve as the other operator | Detail shows **Network Fee** as "-". Token Venue Z UNIT drops by 3 | |
| I3 | Classify: Venue charges, Network fee, Related transaction `WD-2040`, An account, Acme Main Account | "The account does not have enough balance." (Acme Main Account holds no UNIT) | |
| I4 | Switch to We pay it (company cost), submit, approve | Company costs shows UNIT 3.00. Unclassified outgoing clears | |

### J. Below-zero warning (booking is never blocked)

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| J1 | Book Fiat, **Bank Venue X**, SGD, amount larger than its balance (for example 400,000; X holds 300,000) | The review window shows "Warning: the venue balance will go below zero. The money has already left, so the booking is allowed..." | |
| J2 | Submit, then open the request as the other operator | The same warning shows on the approval preview while it is awaiting approval | |
| J3 | Approve, then reopen the request | The warning is no longer shown. The venue balance is below zero in Balances (this is allowed on purpose) | |

### K. Lists and filters

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| K1 | Fiat list | Columns: ID, Classification, Amount \| Asset, Venue, Account, Payment rail, Reference, Transacted at, Status \| Execution. Hand-booked rows show a **Booked by hand** tag under the status | |
| K2 | Classification filter | Withdrawal, Rebalance, Settlement, Venue charges, Refund, Others, Unclassified | |
| K3 | Origin filter = Booked by hand | Only OM-3002, 3003/3004, 3006 and your new bookings appear. Origin = From a withdrawal or rebalance shows only OM-3007 and up | |
| K4 | Payment rail filter (Fiat only) | Filters by ACT, FAST, MEPS, TT | |
| K5 | Token list > KYT status filter = Passed | Only instruction-led token withdrawals with Passed. Hand-booked rows show "-" in the KYT column | |
| K6 | Search a reference such as `DBS-FEE-0932` | Finds OM-3006 | |
| K7 | Account column | Name and account number for a tied movement. Otherwise "We pay it (company cost)", "Cleared (refunded)" or "-" while unclassified | |
| K8 | Refresh the page after setting filters | Filters and page are kept (they are in the address) | |

### L. Details: instruction-led versus hand-booked

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| L1 | Open **OM-3007** (fiat withdrawal) | Origin "Withdrawal or rebalance", Execution method automated, **To** shows the whitelisted bank account with a Whitelist Bank tag, Payment Details (rail MEPS, charge bearer Sender Pays (DEBT), charge bearer account Bank Venue V), Whitelist Bank Account Details with real values, Linked Transaction WD-2041 | |
| L2 | Open **OM-3008** (token withdrawal) | Whitelist Address tag, Network fee, Total received, Whitelist address ID, KYT status Passed | |
| L3 | Open a hand-booked fiat movement | Same sections and rows as OM-3007 (Details, Payment Details, Whitelist Bank Account Details), with Execution Method "Not applicable (booked by hand)", Execution Status Settled, To "Entered by hand" or not applicable, Payment Reference and the bank account rows "Not applicable (booked by hand)", Linked Transaction "-". Origin "Booked by hand" is in the Booking and Classification section | |
| L4 | Open OM-3009 to OM-3014 | Pending, Submitted and Failed show the matching banner. The actions for them are not simulated (listed as a known limit) | |

### M. Aging of unclassified outgoing money

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| M1 | Balances > **Unclassified outgoing** | Shows the amount not yet classified and the age of the oldest entry ("0 days") | |
| M2 | Click **Advance 1 day** 8 times, return to Balances | The oldest entry shows 8 days with a red **Over 7 days** tag | |
| M3 | Classify the oldest entry and approve | The row clears or ages for the next oldest | |

### N. Balances page

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| N1 | Open Balances | Order: Unclassified outgoing, Unclassified incoming, Venues, Statement lines, Company costs (net of credits), Recent balance effects, Account balances last | |
| N2 | After each test above | The "Recent balance effects" table matches the PRD: booking = venue falls, unclassified outgoing rises. Tied = the account's balance falls, unclassified outgoing falls. We pay it = recorded as a company cost, unclassified outgoing falls. Refund = the unknown funds entry is cleared, unclassified outgoing falls. Incoming Others = the account's balance rises (or company income is recorded) and unclassified incoming falls | |

### O. Permissions and approvals list

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| O1 | Approvals list | Statuses read Awaiting Approval, Approved, Rejected. The status filter uses the same words | |
| O2 | Open an approved request | The header and the Request card show the same status | |
| O3 | Sidebar | Transaction Management has Deposit, Withdrawal, Rebalances, Settlement Instructions. **There is no Adjustments item** (by design) | |

### P. Correcting a mistake with an incoming Others entry (PRD UC-8, FR-7)

Case A: OM-3006 (8 SGD, Unclassified) was booked by mistake.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| P1 | As Alice: Movement Management > **Incoming Movement** > Fiat > **Book Incoming Movement** | Form: Type, Venue, Asset, Amount, Transacted at, Bank reference, Sender name, note. No rail, charge bearer or network fee | |
| P2 | Bank Venue V, SGD, 8, reference `FIX-OM-3006`, Submit, confirm. As Bob approve | Review says "8.00 SGD has arrived at Bank Venue V... The venue balance rises by 8.00 SGD". The movement is **Detected**, **Unclassified**, Booked by hand. Balances: the venue rose by 8.00 and Unclassified incoming SGD is 8.00 | |
| P3 | As Alice open it and **Classify** | The only option is **Others**. There is no Deposit | |
| P4 | Others, Credited to = **We keep it (company income)**, Explanation `Corrects OM-3006, booked twice`, Related transaction (chosen from the list) `OM-3006`. Submit. As Bob approve | Movement is **Confirmed**, Others, "We keep it (company income)", Related transaction links to OM-3006. Balances: Unclassified incoming SGD clears. Company costs (net of credits) falls by 8.00 | |
| P5 | Classify OM-3006 as Others, We pay it (company cost), Explanation `Booked twice, corrected by IM-xxxx`, approve | The company cost rises by 8.00 again, so the net is back to where it started. Unclassified outgoing SGD clears | |

Case B: OM-3004 charged 12.50 SGD to Acme Main Account by mistake.

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| P6 | Book an incoming 12.50 SGD at Bank Venue V (new reference), approve. Classify as Others, Credited to = **A customer account**, Acme Main Account, Related transaction (chosen from the list) `OM-3004`, Explanation `Corrects OM-3004, wrong account`, approve | Acme Main Account SGD rises by 12.50. The detail shows the note **Appears on the monthly statement**. Balances > Statement lines shows a **+12.50 SGD** line next to the original **-12.50 SGD** line | |
| P7 | Compare the dates in the Statement lines | Each line is dated with the movement's transacted date, not the date it was classified | |
| P8 | Classify Others without an explanation of 10 characters | Blocked: "An explanation of at least 10 characters is required." | |
| P9 | Book an incoming movement with a reference already used by another **incoming** movement at the same venue | "A movement with this reference already exists at this venue." | |
| P10 | Book an incoming movement with the same reference as an outgoing one at the same venue (for example `DBS-FEE-0932`) | Allowed: the duplicate check is per direction | |

### Q. Refund and Others compete for the same unknown funds entry

| # | Steps | Expected | Result |
| --- | --- | --- | --- |
| Q1 | Book a 200 USD outgoing movement at Bank Venue V, approve it. Classify it as Refund of IM-3005 and submit (do not approve) | IM-3005 shows "ongoing maker checker request" and View request instead of Classify | |
| Q2 | Book a second 200 USD outgoing movement (new reference), approve it, classify as Refund of IM-3005 and submit | Blocked: "Another request is already refunding this entry." | |
| Q3 | Approve the first Refund | IM-3005 shows status **Refunded** and the banner links to the refund | |
| Q4 | Reset. Classify IM-3005 itself as Others and submit (do not approve). Then try to classify a new 200 USD booking as Refund of IM-3005 | IM-3005 is not offered, because another request is already classifying it | |

## 5. Things that are not in the prototype (by design)

These are listed in the PRD or README and are not failures:

- The full incoming flow: Deposit classification, Confirm, name match and the other incoming classifications. Only Book Incoming Movement (simplified) and Classify as Others are simulated.
- Instruction-led actions: Confirm, Mark as failed, Manually process, Override KYT, BTC fee rate.
- A Compliance user role, the venue pages, and sorting on lists.
- Audit rows are simple text, not the full structured metadata.
- No Adjustment transaction or menu: a tied movement changes the account balance and appears on the statement from the movement itself.

## 6. If something looks wrong

1. Click **Reset demo data** and repeat the test from step 1.
2. Hard refresh the page (Cmd+Shift+R) in case the browser kept an old copy.
3. Note the test number, what you did, and what you saw, then compare with the matching FR in the PRD (FR-1 to FR-6).

## 7. Still to confirm outside the prototype

The remaining confirmations (the book and classify API, how finance books the unclassified outgoing amount and the company cost, and the network fee in the same transfer) are assumptions stated in the PRD. None of them change a test result above.
