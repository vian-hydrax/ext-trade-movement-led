# Walkthrough: Fiat scenarios, Movement-led Outgoing Prototype

Every Fiat condition, step by step, in the order of the flow: book, approve, classify, approve, check. Token scenarios are in `Walkthrough - Token Scenarios - Movement-led Outgoing.md`. The full test list with Pass / Fail boxes is in `Notes/Test Guide - Movement-led Outgoing Prototype.md`.

## 0. Setup and rules

1. Open `Prototypes/Movement-led Outgoing Prototype/index.html` in Chrome.
2. Click **Reset demo data** (top right). Reset again whenever a scenario says so.
3. **View as** (top right) switches between **Alice Tan** and **Bob Lim**. The person who submits can never approve, so every request is approved by the other person. In these steps Alice is the maker and Bob the checker.
4. **Balances** (sidebar) is where you confirm the money effects. **Approvals** (sidebar) lists every request.

Demo data used below:

| Item | What it is |
| --- | --- |
| Bank Venue V | Fiat venue holding SGD and USD |
| Bank Venue X | Fiat venue holding SGD (300,000) |
| Acme Main Account | Customer account used for "charged to an account" |
| OM-3006 | 8 SGD hand-booked fee, Unclassified |
| IM-3005 | 200 USD unknown funds (Detected, Unclassified) at Bank Venue V, sender "Unknown remitter" |
| WD-2041 | Withdrawal ID carried by the fiat withdrawal OM-3007 |

Use a new bank reference for every booking (a reference can only be used once per venue and direction). Suggested: `T1`, `T2`, and so on, in the examples below.

---

## Part A. Booking

### A1. Valid booking, full path

1. As Alice: Movement Management > Outgoing Movement > **Fiat** > **Book Outgoing Movement**.
2. Type = **Fiat**. Venue = **Bank Venue V**. The bank account number fills in (read only). Under the venue, "Current balance" lists SGD and USD, each as Total and Available (Bank Venue V SGD: Total 2,000,000.00, Available 1,998,500.00, because a pending withdrawal reserves 1,500).
3. Asset = **SGD** (the list only shows SGD and USD).
4. Amount = **30**. Transacted at = keep the default. Bank reference = **T1**.
5. Leave Other details empty. Click **Submit**.
6. The review window says the movement is recorded as unclassified and the venue balance drops by 30.00. Optionally add a comment. Confirm.
7. Toast "Movement submitted". **Balances** is unchanged. **Approvals** shows the request as Awaiting Approval.

### A2. Booking checks (errors)

Open Book Outgoing Movement > Fiat each time and try:

| Try | Expected |
| --- | --- |
| Amount empty, click Submit | "Enter an amount." next to the field |
| Amount = 0 | "Amount must be greater than zero." |
| Transacted at in the future | "The date cannot be in the future." |
| Reference = `DBS-FEE-0932` at Bank Venue V | "A movement with this reference already exists at this venue." |
| No venue, asset or reference | The matching required-field message next to each field |

### A3. Payment rail, charge bearer and charge bearer account

Rail is only a label here: nothing is sent. Choose each rail on the form and watch the fields below it:

| Choose | Expected |
| --- | --- |
| **MEPS** or **TT** | Charge bearer fills in as Sender Pays (DEBT). Charge bearer account fills in with a DBS venue (the System > Charge Instructions default). Both can be changed. The account list shows DBS venues only |
| Then change bearer to **Beneficiary Pays (CRED)** | The charge bearer account field disappears |
| Change bearer to **Split (SHAR)** | The account field shows again |
| **ACT** or **FAST** | Charge bearer and account both disappear and clear |

### A4. Beneficiary name (optional)

1. Enter a Beneficiary name, for example `Acme Treasury`. Hover the **?** tip: it says the value is checked against the original sender when the movement is classified as a Refund.
2. Leave it empty on another booking. Both save. The detail page shows "-" when empty.

### A5. Booking that takes the venue below zero (allowed)

1. Book Fiat, **Bank Venue X**, SGD, Amount **400000**, reference **T-NEG**.
2. The review window shows "Warning: the venue balance will go below zero. The money has already left, so the booking is allowed..." Submit.
3. As Bob open the request. The same warning shows while it is awaiting approval. Approve.
4. Reopen the request: the warning is gone. **Balances** shows Bank Venue X below zero. This is allowed on purpose.

---

## Part B. Approving or rejecting a booking

### B1. Maker cannot approve

As Alice open her own request: there is no Approve or Reject button.

### B2. Reject

1. As Bob open the request. The preview lists type, venue, amount, reference, rail and beneficiary. Approve and Reject are shown.
2. Click **Reject**, enter a reason. The request shows Rejected.
3. No movement is created and Bank Venue V SGD is unchanged. The same reference can be booked again.

### B3. Approve

1. Book again (reference **T2**), then as Bob click **Approve**.
2. Toast "booked as Unclassified" with an **Open movement** button. Click it.
3. The detail shows Confirmed, **Booked by hand**, **Unclassified**, a banner "The money has already left the venue and is waiting to be classified", Execution method "Not applicable (booked by hand)", and a **Classify** button.
4. **Balances**: the venue fell by the amount. Unclassified outgoing rose by the amount.
5. Audit log shows `outgoing_movement:create_request` and `outgoing_movement:create`.

---

## Part C. Classifying (each ends with Bob approving)

Open the unclassified movement as Alice and click **Classify**. The only options are Venue charges, Refund and Others (Withdrawal, Rebalance and Settlement are instruction-led and not offered).

### C0. Classify errors

| Try | Expected |
| --- | --- |
| Submit with nothing chosen | "Choose a classification." |
| Venue charges with nothing else, Submit | "Choose who bears it." (the charge type is also required) |
| Open the Charge type list | Only **Bank charge** and **Other venue fee** (Network fee is not offered on a fiat movement) |

### C1. Venue charges, paid by us

1. Classification = **Venue charges**. Charge type = **Bank charge** (the other types are Network fee and Other venue fee).
2. Charged to = **We pay it (company cost)**. The effect line reads "...paid by us. It is recorded as a company cost. No account balance changes."
3. **Submit for approval**. The movement shows "ongoing maker checker request" and the button becomes **View request**. The list row shows View request too.
4. As Bob: Approvals > the classify request > **Approve**.
5. Check: Venue charges · Bank charge, Charged to "We pay it (company cost)". **Balances**: Unclassified outgoing dropped. Company costs rose by the amount.

### C2. Venue charges, charged to a customer account

1. Book and approve a new movement (SGD, **15**, reference **T3**).
2. Classify: Venue charges, Bank charge, Charged to = **A customer account**, Account = **Acme Main Account**. The effect line says the balance falls and the line appears on the monthly statement.
3. Submit, then Bob approves.
4. Check: Charged to Acme Main Account and the note **Appears on the monthly statement**. **Balances**: Acme Main Account SGD is 15 lower. "Statement lines from manual bookings" has a new line.

### C3. Account without enough balance

1. Book and approve **99999** SGD.
2. Classify it as Venue charges, An account, Acme Main Account. Submit.
3. "The account does not have enough balance." The movement stays Unclassified.
4. Classify it as "We pay it (company cost)" instead. It works.

### C4. Related transaction (the link)

1. Book and approve a new SGD movement (reference **T4**). Classify: Venue charges, Bank charge, We pay it (company cost).
2. Click Related transaction and type `WD-20`. A list opens with matches (fiat records only, withdrawals first). Narrow it to `WD-2041` and choose "WD-2041 · Withdrawal · movement OM-3007 · 2,000.00 SGD". The field shows it with a **Clear** link.
3. Click **Clear** and type `WD-9999`. The list says "No transaction found for this ID." and nothing can be chosen.
4. Choose `WD-2041` again, submit, Bob approves.
5. Check: the movement shows Related transaction (chosen from the list) `WD-2041` as a link, with "Linked to OM-3007 (WD-2041)".
6. Click the link. On OM-3007, **Linked movements** lists your movement with classification, amount and "Booked by hand".
7. Classify another movement without choosing a Related transaction: the detail has no Related transaction row, and it appears in no Linked movements table.

### C5. Others

1. Classify as **Others**. Charged to = We pay it (company cost). Explanation = `short`, Submit. Blocked: "An explanation of at least 10 characters is required."
2. Explanation = `Test of the catch-all classification`. Submit, Bob approves.
3. Check: Others, paid by us. Others can also be charged to an account, the same as C2.

### C6. Reject a classification

1. Classify a movement and submit.
2. As Bob open the request and **Reject** it with a reason.
3. The movement is still Unclassified with a Classify button. Unclassified outgoing is unchanged.
4. Classify it again and approve. It works normally.

---

## Part D. Refund of unknown funds (IM-3005, 200 USD)

Before each run, **Reset demo data**, because IM-3005 can only be refunded once. In **Balances**, Unclassified incoming shows USD 200.

### D1. Amount must match

1. Book Fiat, Bank Venue V, **USD 150**, reference **R1**. Bob approves.
2. Classify: **Refund**. "Unknown funds entry to refund" lists IM-3005 (only entries at the same venue and in the same asset are listed).
3. Choose IM-3005 and submit. Blocked: "The refund must equal the unknown funds entry amount (200.00 USD)."

### D2. Warning when the beneficiary differs

1. Book Fiat, Bank Venue V, **USD 200**, reference **R2**, Beneficiary name = **Acme Treasury**. Bob approves.
2. Classify: Refund, choose IM-3005.
3. A warning shows: "Check the destination. Entered at booking: Acme Treasury. Original sender name of IM-3005: Unknown remitter. A refund should go back to the original sender. You can still submit."
4. Submit. The approval preview shows Charged to "Not applicable (clears the unknown funds entry)".
5. Bob approves.
6. Check: IM-3005 shows **Refunded** with a link to the refund. **Balances**: Unclassified incoming and outgoing USD both clear. Bank Venue V USD ends where it started. No customer statement line is created.

### D3. Beneficiary left empty (sender shown)

1. Reset. Book USD 200, reference **R3**, Beneficiary name empty. Approve.
2. Classify: Refund, IM-3005. A note says the refund will show "Unknown remitter" as its destination.
3. Submit and approve. On the refund's detail, **To** shows Unknown remitter with the tag "From the refunded entry IM-3005".

### D4. Beneficiary matches (no warning)

Reset. Book USD 200, reference **R4**, Beneficiary name = `unknown remitter` (different case). Classify as Refund of IM-3005. No warning appears.

### D5. Two refunds compete for the same entry

1. Reset. Book and approve two USD 200 movements (references **R5** and **R6**).
2. Classify the first as Refund of IM-3005 and submit, do not approve. IM-3005 now shows "ongoing maker checker request".
3. Classify the second as Refund of IM-3005. Blocked: "Another request is already refunding this entry."
4. Bob approves the first. IM-3005 shows Refunded and the banner links to the refund.

### D6. Refund and Others on the same entry

1. Reset. Go to Incoming Movement > Fiat > IM-3005 > **Classify** as **Others**, submit, do not approve.
2. Book and approve a new USD 200 outgoing movement. Classify as Refund.
3. IM-3005 is not offered, because another request is already classifying it.

---

## Part E. Correcting a mistake with an incoming Others entry

### E1. Case A: OM-3006 (8 SGD, unclassified) was booked by mistake

1. As Alice: Movement Management > **Incoming Movement** > Fiat > **Book Incoming Movement**. The form has no rail, charge bearer or network fee.
2. Bank Venue V, SGD, **8**, reference `FIX-OM-3006`, Submit, confirm. Bob approves. The review says "8.00 SGD has arrived at Bank Venue V... The venue balance rises by 8.00 SGD".
3. The new movement is **Detected**, **Unclassified**, Booked by hand. **Balances**: the venue rose by 8 and Unclassified incoming SGD is 8.
4. Open it and **Classify**. The only option is **Others** (no Deposit).
5. Others, Credited to = **We keep it (company income)**, Explanation `Corrects OM-3006, booked twice`, Related transaction (chosen from the list) `OM-3006`. Submit, Bob approves.
6. Check: Confirmed, Others, "We keep it (company income)", Related transaction links to OM-3006. Unclassified incoming SGD clears. Company costs (net) falls by 8.
7. Classify OM-3006 as Others, We pay it (company cost), Explanation `Booked twice, corrected by IM-xxxx`, approve. The company cost rises by 8 again, so the net is back to where it started. Unclassified outgoing SGD clears.

### E2. Case B: OM-3004 (12.50 SGD) charged to the wrong account

1. Book an incoming 12.50 SGD at Bank Venue V (new reference), Bob approves.
2. Classify as Others, Credited to = **A customer account**, Acme Main Account, Related transaction (chosen from the list) `OM-3004`, Explanation `Corrects OM-3004, wrong account`. Approve.
3. Check: Acme Main Account SGD rises by 12.50. The note **Appears on the monthly statement** shows. **Balances > Statement lines** shows **+12.50 SGD** next to the original **-12.50 SGD**, each dated with the movement's transacted date.

### E3. Incoming checks

| Try | Expected |
| --- | --- |
| Classify an incoming Others with an explanation under 10 characters | "An explanation of at least 10 characters is required." |
| Book an incoming movement with a reference already used by another **incoming** movement at the same venue | "A movement with this reference already exists at this venue." |
| Book an incoming movement with the same reference as an outgoing one at the same venue (for example `DBS-FEE-0932`) | Allowed: the duplicate check is per direction |

---

## Part F. Lists, details and balances

### F1. Lists and filters (Outgoing Movement > Fiat)

| Try | Expected |
| --- | --- |
| Read the columns | ID, Classification, Amount \| Asset, Venue, Account, Payment rail, Reference, Transacted at, Status \| Execution. Hand-booked rows show a **Booked by hand** tag |
| Classification filter | Withdrawal, Rebalance, Settlement, Venue charges, Refund, Others, Unclassified |
| Origin filter = Booked by hand | Only hand-booked movements. "From a withdrawal or rebalance" shows only OM-3007 and up |
| Payment rail filter | ACT, FAST, MEPS, TT |
| Search `DBS-FEE-0932` | Finds OM-3006 |
| Account column | Account name and number for a tied movement. Otherwise "We pay it (company cost)", "Cleared (refunded)" or "-" while unclassified |
| Set filters, then refresh | Filters and page are kept |

### F2. Hand-booked versus instruction-led detail

- Open **OM-3007** (fiat withdrawal): Origin "Withdrawal or rebalance", Execution method automated, **To** shows the whitelisted bank account with a Whitelist Bank tag, Payment details (MEPS, Sender Pays (DEBT), charge bearer account Bank Venue V), Linked transaction WD-2041.
- Open a hand-booked fiat movement: Origin "Booked by hand", To "Entered by hand" (or "-" when nothing was entered, or not applicable for Venue charges), Payment reference "Not applicable", a note that bank account details are not recorded, no Linked transaction.

### F3. Aging of unclassified outgoing money

1. **Balances > Unclassified outgoing** shows the amount and the age of the oldest entry ("0 days").
2. Click **Advance 1 day** 8 times and return to Balances. The oldest entry shows 8 days with a red **Over 7 days** tag.
3. Classify the oldest entry and approve. The row clears or ages for the next oldest.

---

## If something looks wrong

1. Click **Reset demo data** and repeat from step 1.
2. Hard refresh (Cmd+Shift+R) in case the browser kept an old copy.
3. Note the step, what you did and what you saw, and compare it with the PRD.
