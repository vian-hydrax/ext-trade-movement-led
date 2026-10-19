# Walkthrough: Token scenarios, Movement-led Outgoing Prototype

Every Token condition, step by step, in the order of the flow: book, approve, classify, approve, check. Fiat scenarios are in `Walkthrough - Fiat Scenarios - Movement-led Outgoing.md`. The full test list with Pass / Fail boxes is in `Notes/Test Guide - Movement-led Outgoing Prototype.md`.

## 0. Setup and rules

1. Open `Prototypes/Movement-led Outgoing Prototype/index.html` in Chrome.
2. Click **Reset demo data** (top right). Reset again whenever a scenario says so.
3. **View as** (top right) switches between **Alice Tan** and **Bob Lim**. The person who submits can never approve, so every request is approved by the other person. In these steps Alice is the maker and Bob the checker.
4. **Balances** (sidebar) is where you confirm the money effects. **Approvals** (sidebar) lists every request.

Token venues:

| Venue | Type | Blockchain | Assets | Network fee field |
| --- | --- | --- | --- | --- |
| Token Venue W | Hot wallet | Bitcoin | BTC | Shown |
| Cold Wallet Y | Cold wallet | Bitcoin | BTC | Shown |
| Token Venue Z | Hot wallet | Ethereum | UNIT, TOKEN | Shown (leave empty, a fee sponsor pays) |

Other items used below:

| Item | What it is |
| --- | --- |
| Acme Main Account | Customer account with BTC 0.45. It holds no UNIT |
| OM-3008 | Instruction-led token withdrawal, Confirmed, Linked transaction carries its withdrawal ID |
| WD-2042 | A withdrawal ID that matches an existing movement |

On the Token booking form always pick the **Blockchain** first (Bitcoin for Token Venue W and Cold Wallet Y, Ethereum for Token Venue Z), then the **Venue**. Use a new transaction hash for every booking (a hash can only be used once per venue and direction). Suggested: `T1`, `T2`, and so on.

---

## Part A. Booking

### A1. Valid Bitcoin booking, full path

1. As Alice: Movement Management > Outgoing Movement > **Token** > **Book Outgoing Movement**.
2. Type = **Token**. Blockchain = **Bitcoin**, then Venue = **Token Venue W** (the Venue list is disabled until a blockchain is chosen, and offers only hot and cold wallets on it). Source Address fills in (read only). The asset list shows only BTC. A **Network Fee** field appears.
3. Asset = **BTC**. A **Balance** row shows Total and Available in BTC. Amount = **0.0003**. Transacted at = keep the default. Transaction hash = **T1**.
4. Other details: Destination address = `bc1qdestination0addr`. Network fee = `0.00001`. Click **Submit**.
5. The review lists Blockchain, Destination address and Network fee, and says the venue balance drops. Confirm.
6. Toast "Movement submitted". **Balances** is unchanged. **Approvals** shows the request as Awaiting Approval.

### A2. Booking checks (errors)

Open Book Outgoing Movement > Token each time and try:

| Try | Expected |
| --- | --- |
| Amount empty, click Submit | "Enter an amount." |
| Amount = 0 | "Amount must be greater than zero." |
| Transacted at in the future | "The date cannot be in the future." |
| Reuse hash `T1` at Token Venue W after A1 is approved or pending | "A movement with this reference already exists at this venue." |
| No venue, asset or hash | The matching required-field message next to each field |

### A3. Choosing the venue

| Choose | Expected |
| --- | --- |
| Blockchain Bitcoin, then **Cold Wallet Y** | Its own source address, asset list shows BTC only, Network fee field shown |
| Blockchain Ethereum, then **Token Venue Z** | Assets UNIT and TOKEN, the optional **Network fee** field, with a hint to leave it empty when a sponsor pays |
| Change the Blockchain after choosing a venue and asset | The venue and the asset clear |

### A4. Optional fields

1. Destination address is optional. Hover the **?** tip: it says the value is checked against the original sender when the movement is classified as a Refund.
2. Book once with a destination and once without. The detail shows "-" when empty. The detail never shows the venue name as the destination.
3. Network fee is for information only. It says how much of the Amount was fee and does not change the amount or the venue balance. Leave it empty when the movement is itself the fee (a fee paid separately is booked as its own movement).

### A5. Booking that takes the venue below zero (allowed)

1. Book Token, Token Venue W, BTC, an amount larger than the wallet holds (for example **500**), hash **T-NEG**.
2. The review window shows "Warning: the venue balance will go below zero. The money has already left, so the booking is allowed..." Submit.
3. As Bob open the request. The same warning shows while it is awaiting approval. Approve.
4. Reopen the request: the warning is gone. **Balances** shows the venue below zero. This is allowed on purpose.

---

## Part B. Approving or rejecting a booking

### B1. Maker cannot approve

As Alice open her own request: there is no Approve or Reject button.

### B2. Reject

1. As Bob open the request. The preview lists type, venue, amount, hash, blockchain and destination. Approve and Reject are shown.
2. Click **Reject**, enter a reason. The request shows Rejected.
3. No movement is created and the venue balance is unchanged. The same hash can be booked again.

### B3. Approve

1. Book again with hash **T2**, then as Bob click **Approve**.
2. Toast "booked as Unclassified" with an **Open movement** button. Click it.
3. The Token detail has the same sections as an instruction-led token movement: Details, Additional Details (Blockchain and Transaction Hash only; Destination ID and External ID are hidden), Know Your Transactions, then Booking and Classification. Amount Type, Total Received, Execution Method and the KYT rows show "Not applicable (booked by hand)", and Execution Status shows Settled.
4. Tags: Confirmed, **Booked by hand**, **Unclassified**, a banner, and a **Classify** button.
5. **Balances**: Token Venue W BTC dropped by the amount. Unclassified outgoing BTC rose by the amount.
6. Audit log shows `outgoing_movement:create_request` and `outgoing_movement:create`.

---

## Part C. Classifying (each ends with Bob approving)

Open the unclassified movement as Alice and click **Classify**. The only options are Venue charges, Refund and Others.

### C0. Classify errors

| Try | Expected |
| --- | --- |
| Submit with nothing chosen | "Choose a classification." |
| Venue charges with nothing else, Submit | "Choose who bears it." (the charge type is also required) |
| Open the Charge type list | Only **Network fee** and **Other venue fee** (Bank charge is not offered on a token movement) |

### C1. Network fee charged to a customer account (Bitcoin)

*Story: a 0.0003 BTC miner fee paid separately for withdrawal WD-2042.*

1. Book Token Venue W, BTC, **0.0003**, hash **T3**, no destination, Network fee empty. Bob approves.
2. Classify: Venue charges, Charge type = **Network fee** (the other types are Bank charge and Other venue fee).
3. Charged to = **A customer account**, Account = **Acme Main Account**.
4. Click Related transaction and type `WD-2042`. The list shows only token records on the same blockchain (Bitcoin here), withdrawals first. Choose the row "WD-2042 · Withdrawal · movement OM-xxxx…". The field shows it with a **Clear** link.
5. Submit. The movement shows "ongoing maker checker request" and the button becomes **View request**.
6. As Bob: Approvals > the classify request > **Approve**.
7. Check: Venue charges · Network fee, Charged to Acme Main Account, Related transaction (chosen from the list) `WD-2042` as a link, and the note **Appears on the monthly statement**. **Balances**: Acme Main Account BTC fell by 0.0003 (0.45 to 0.4497). A statement line shows with the hash as the reference. Unclassified outgoing BTC dropped.
8. Click the `WD-2042` link. On that withdrawal, **Linked movements** lists your fee with "Booked by hand".

### C2. Venue charges paid by us

1. Book and approve a movement (Token Venue W, BTC, **0.0001**, hash **T4**).
2. Classify: Venue charges, Network fee, Related transaction `WD-2042` (required for a network fee), Charged to = **We pay it (company cost)**. The effect line says it is recorded as a company cost and no account balance changes.
3. Submit, Bob approves.
4. Check: Charged to "We pay it (company cost)". **Balances**: Company costs rose by BTC 0.0001. Unclassified outgoing dropped.

### C3. Ethereum fee: account without enough balance, then we pay it

1. Book Token Venue Z, UNIT, **3**, hash **E1**. Leave the optional Network fee empty. Bob approves. The detail shows Network Fee as "-" and Token Venue Z UNIT dropped by 3.
2. Classify: Venue charges, Network fee, Related transaction `WD-2040`, An account, Acme Main Account. Submit.
3. "The account does not have enough balance." (Acme Main Account holds no UNIT). The movement stays Unclassified.
4. Switch to **We pay it (company cost)**, submit, Bob approves.
5. Check: **Balances** Company costs shows UNIT 3.00. Unclassified outgoing clears.

### C4. No Related transaction found

1. Book and approve a new BTC movement (hash **T5**). Classify: Venue charges, Network fee, Related transaction `WD-2042`, We pay it (company cost).
2. Click Related transaction and type `WD-9999`. The list says "No transaction found for this ID." and nothing can be chosen. Leave the field empty (it is optional) and submit.
3. Bob approves. The detail has no Related transaction row and the movement is in no Linked movements table.

---

### C5. Others

1. Classify as **Others**. Charged to = We pay it (company cost). Explanation = `short`, Submit. Blocked: "An explanation of at least 10 characters is required."
2. Explanation = `Test of the catch-all classification`. Submit, Bob approves.
3. Check: Others, paid by us. Others can also be charged to an account, the same as C1.

### C6. Reject a classification

1. Classify a movement and submit.
2. As Bob open the request and **Reject** it with a reason.
3. The movement is still Unclassified with a Classify button. Unclassified outgoing is unchanged.
4. Classify it again and approve. It works normally.

---

## Part D. Refund of unknown token funds

The demo's only unknown funds (IM-3005) are fiat, so create a token one first with an incoming booking. Reset demo data before this part.

### D1. Create the unknown funds entry

1. As Alice: Movement Management > **Incoming Movement** > **Token** > **Book Incoming Movement**.
2. Token Venue W, BTC, Amount **0.01**, transaction hash **IN-1**, Source address = `bc1qsender0unknown0addr` (the field is labelled Source address on an incoming booking). Submit, confirm. Bob approves.
3. The new incoming movement is **Detected**, **Unclassified**, Booked by hand. **Balances**: Token Venue W BTC rose by 0.01 and Unclassified incoming BTC is 0.01.

### D2. Amount must match

1. Book outgoing Token, Token Venue W, BTC, **0.005**, hash **R1**. Bob approves.
2. Classify: **Refund**. "Unknown funds entry to refund" lists the new incoming entry (only entries at the same venue and in the same asset appear).
3. Choose it and submit. Blocked: "The refund must equal the unknown funds entry amount (0.01 BTC)."

### D3. Warning when the destination differs

1. Book outgoing Token Venue W, BTC, **0.01**, hash **R2**, Destination address = `bc1qsomeoneelse0addr`. Bob approves.
2. Classify: Refund, choose the incoming entry.
3. A warning shows: "Check the destination. Entered at booking: bc1qsomeoneelse0addr. Original source address of IM-xxxx: bc1qsender0unknown0addr. A refund should go back to the original sender. You can still submit."
4. Submit. Bob approves.
5. Check: the incoming entry shows **Refunded** with a link to the refund. **Balances**: Unclassified incoming and outgoing BTC both clear. Token Venue W BTC ends where it started. No customer statement line is created.

### D4. Destination left empty (sender shown)

1. Redo D1 (a new hash such as **IN-2**). Book outgoing 0.01 BTC, hash **R3**, Destination address empty. Approve.
2. Classify: Refund, choose the entry. A note says the refund will show `bc1qsender0unknown0addr` as its destination.
3. Submit and approve. On the refund's detail, **To** shows that address with the tag "From the refunded entry IM-xxxx".

### D5. Destination matches (no warning)

Redo D1 (hash **IN-3**) with Destination address = `BC1QSENDER0UNKNOWN0ADDR` (different case) on the outgoing booking. Classify as Refund. No warning appears.

### D6. Two refunds compete for the same entry

1. Book and approve two 0.01 BTC outgoing movements (hashes **R4**, **R5**) after a fresh D1.
2. Classify the first as Refund of the entry and submit, do not approve. The incoming entry shows "ongoing maker checker request".
3. Classify the second as Refund of the same entry. Blocked: "Another request is already refunding this entry."
4. Bob approves the first. The entry shows Refunded and the banner links to the refund.

### D7. Refund and Others on the same entry

1. After a fresh D1, open the incoming entry > **Classify** as **Others**, submit, do not approve.
2. Book and approve a 0.01 BTC outgoing movement, then classify as Refund.
3. The entry is not offered, because another request is already classifying it.

---

## Part E. Correcting a mistake with an incoming Others entry

1. Book an incoming Token at Token Venue W, BTC, the same amount as an earlier mistaken outgoing booking, new hash. Bob approves.
2. Classify the incoming entry as **Others**. The only option is Others (no Deposit). Credited to = **We keep it (company income)**, Explanation `Corrects OM-xxxx, booked twice`, Related transaction = the mistaken movement's ID. Submit, Bob approves.
3. Check: Confirmed, Others, "We keep it (company income)", Related transaction links to the mistaken movement. Unclassified incoming BTC clears. Company costs (net of credits) falls by the amount.
4. Classify the mistaken outgoing movement as Others, We pay it (company cost), with an explanation that names the correcting entry. The company cost rises by the same amount, so the net is back to where it started, and Unclassified outgoing clears.
5. To credit a customer instead, choose **A customer account** in step 2. The account's BTC rises and a statement line appears dated with the movement's transacted date.

Incoming checks:

| Try | Expected |
| --- | --- |
| Others with an explanation under 10 characters | "An explanation of at least 10 characters is required." |
| Incoming booking with a hash already used by another **incoming** movement at the same venue | "A movement with this reference already exists at this venue." |
| Incoming booking with the same hash as an outgoing movement at the same venue | Allowed: the duplicate check is per direction |

---

## Part F. Lists, details and balances

### F1. Lists and filters (Outgoing Movement > Token)

| Try | Expected |
| --- | --- |
| Read the list | Hand-booked rows show a **Booked by hand** tag and "-" in the KYT column |
| Classification filter | Withdrawal, Rebalance, Settlement, Venue charges, Refund, Others, Unclassified |
| Origin filter = Booked by hand | Only hand-booked movements |
| KYT status filter = Passed | Only instruction-led token withdrawals with Passed |
| Search a hash | Finds the movement |
| Set filters, then refresh | Filters and page are kept |

### F2. Hand-booked versus instruction-led detail

- Open **OM-3008** (token withdrawal): Whitelist Address tag on To, Network fee, Total received, Whitelist address ID, KYT status Passed.
- Open a hand-booked token movement: Origin "Booked by hand", To "Entered by hand" (or "-" when nothing was entered), Blockchain, Source address (the venue's own wallet), no Whitelist address ID, no Linked transaction.

### F3. Aging of unclassified outgoing money

1. **Balances > Unclassified outgoing** shows the amount and the age of the oldest entry ("0 days").
2. Click **Advance 1 day** 8 times and return to Balances. The oldest entry shows 8 days with a red **Over 7 days** tag.
3. Classify the oldest entry and approve. The row clears or ages for the next oldest.

---

## If something looks wrong

1. Click **Reset demo data** and repeat from step 1.
2. Hard refresh (Cmd+Shift+R) in case the browser kept an old copy.
3. Note the step, what you did and what you saw, and compare it with the PRD.
