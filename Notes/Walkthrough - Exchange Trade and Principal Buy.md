# Walkthrough: Exchange Trade and Principal Buy

Two end-to-end examples from the prototype, plus how movements that no instruction created are booked and classified (section 3) (`Prototypes/Ext Trade Settlement Prototype/index.html`), from the settlement instruction (SI) down to the incoming and outgoing movements. Every number below was read from the prototype.

Demo users: **Alice Tan** (operator, maker), **Bob Lim** (operator, checker). Click **Reset demo data** first so the ids match. Ids such as `OB-8` or `OM-3012` can shift if you do other things first; the names and amounts do not.

| | Exchange trade | Principal buy |
| --- | --- | --- |
| SI | SI-1007 `EXCH-BTC-0301` | SI-1002 `BUY-0925` plus SI-1003 `SRC-0925` |
| Parties | Buyer, Seller, Exchange (all accounts we hold) | Client Acme, our House Account, broker Meridian Capital Markets (outside party) |
| Movements | **None.** Nothing leaves custody | **Yes.** One outgoing (SGD) and three incoming (BTC) |
| Settles | All on one day (T+0) | Client pays today, gets BTC on T+2 |

---

## The flow at a glance

1. **Enter** the legs in the Add Transfer Leg modal (Source, Destination, Asset, Amount type, Amount, Settlement date, External reference, Internal note).
2. **Submit.** The review modal shows the funding check. A second operator approves; then the operator approves for settlement.
3. **Obligations** are derived. Internal ones settle at once; outside-party ones settle through movements.
4. **Movements from an instruction** are created or simulated from the obligation and classified Settlement automatically. Any extra amount arrives **Unclassified**.
5. **Movements with no instruction** are **booked** (facts only, saved as Unclassified, held in Suspense) and **classified** later. Always two separate steps, each approved by a second operator.

## Words used

| Word | Meaning |
| --- | --- |
| **Leg** | One transfer you enter: Source, Destination, Asset, Amount, Settlement date |
| **Obligation** | What the system derives from the legs: one account must deliver or receive an amount on a date. Legs between our own accounts are netted per account, asset and day |
| **Posting** | A ledger entry. Always gross, one per leg, even when the obligations are netted |
| **Movement** | Money or tokens actually leaving (outgoing) or arriving (incoming) at a venue. Only needed when an outside party is involved |
| **Earmark** | Funds set aside on an account so a later payment cannot be spent twice |
| **Unclassified** | A booked movement that nobody has said the purpose of yet. Its amount waits in Suspense |
| **Suspense** | A holding account for money we can see at the venue but cannot yet assign (section 3) |

---

# 1. Exchange trade: buyer, seller and exchange (SI-1007)

**The deal.** Atlas Capital (buyer) buys 0.25 BTC from Beacon Trading (seller) for 10,000 SGD. Each side pays the exchange a 10 SGD fee. All three hold accounts with us, so it is one position and one ledger transaction.

| Role | Account | Number |
| --- | --- | --- |
| Buyer | Atlas Capital Buyer Account | A-4410-2201-0001-7 |
| Seller | Beacon Trading Seller Account | A-5520-3302-0001-5 |
| Exchange | Orbit Exchange Fee Account | A-6630-4403-0001-3 |

Starting balances: Buyer 50,000 SGD, Seller 1 BTC, Exchange 0.

### Step 1. Operator enters the legs
Transaction Management > Settlement Instructions > **Add New**. Pick the Blank start, then **+ Add Transfer Leg** four times. Purpose: Trade settlement. External reference: `EXCH-BTC-0301`. All legs settle today.

| Leg | Source | Destination | Amount | Meaning |
| --- | --- | --- | --- | --- |
| L1 | Buyer | Seller | 10,000 SGD | Buyer pays the seller |
| L2 | Seller | Buyer | 0.25 BTC | Seller delivers the BTC |
| L3 | Buyer | Exchange | 10 SGD | Buyer's exchange fee |
| L4 | Seller | Exchange | 10 SGD | Seller's exchange fee |

### Step 2. Submit and review
Each leg is entered in the Add Transfer Leg modal, which has three groups: *Parties* (Source, Destination), *Asset and amount* (Asset, Amount type, Amount) and *Schedule and references* (Settlement date, External reference, Internal note). The create page shows no funding panel.

Press **Submit**. The review modal shows, in order: a plain summary (4 transfers stay between accounts, one settlement date), the instruction details, the legs table, the **Funding check** (Buyer 50,000 SGD covers the 10,010 needed, Seller holds the 0.25 BTC; every row says "Enough funds") and what happens next. Confirm and submit.

### Step 3. A second operator approves (maker-checker)
The request appears under **Approvals**. Bob approves it. The system creates SI-1007 and derives the approvals. Each account is approved automatically because the submitter holds authority (Approvals tab). Counterparties have no approval row; none are involved here.

### Step 4. Operator approves for settlement
Alice opens SI-1007 and approves it for settlement. The status moves to **Settling**, then immediately to **Completed**, because everything settles on today's date and no outside party is involved.

### Step 5. What the system derived (Progress tab)
4 legs became **5 obligations**. Legs are netted per account, asset and day:

| Obligation | Account | Direction | Amount | Built from |
| --- | --- | --- | --- | --- |
| OB-18 | Buyer | deliver | 10,010 SGD | L1 + L3 |
| OB-19 | Seller | receive | 9,990 SGD | L1 minus L4 |
| OB-20 | Seller | deliver | 0.25 BTC | L2 |
| OB-21 | Buyer | receive | 0.25 BTC | L2 |
| OB-22 | Exchange | receive | 20 SGD | L3 + L4 |

All five show **Settled**, "5 of 5".

### Step 6. Ledger postings (Postings tab)
Postings are **gross**, one per leg. Netting decides what must be settled and funded; it never decides what is recorded.

| # | What happened | Debit | Credit | Amount |
| --- | --- | --- | --- | --- |
| 1 | L1 buyer pays the seller | Buyer | Seller | 10,000 SGD |
| 2 | L2 seller delivers BTC | Seller | Buyer | 0.25 BTC |
| 3 | L3 buyer's fee | Buyer | Exchange | 10 SGD |
| 4 | L4 seller's fee | Seller | Exchange | 10 SGD |

### Step 7. Balances (Balances page)

| Account | SGD before | SGD after | BTC before | BTC after |
| --- | --- | --- | --- | --- |
| Buyer | 50,000 | **39,990** | 0 | **0.25** |
| Seller | 0 | **9,990** | 1 | **0.75** |
| Exchange | 0 | **20** | 0 | 0 |

### Movements for this trade
**None.** No venue, no bank and no wallet is touched. Incoming Movement and Outgoing Movement do not change. This is the case "all held here". The next example shows the case where an outside party is involved.

### Counterparty data added for this trade
The exchange is also registered as the counterparty **Orbit Exchange Ltd** (type Exchange) with an approved SGD bank account and BTC deposit wallet in Whitelist Management. It would be used the day a leg pays the exchange outside custody. This trade does not need it.

---

# 2. Principal buy: client, House Account and broker (SI-1002 and SI-1003)

**The deal.** Acme (client) buys 0.25 BTC. We do not have BTC, so the House Account sells it to Acme at 10,000 SGD (plus a 25 SGD fee) and, separately, buys the BTC from the broker Meridian for 9,950 SGD. The House earns 50 SGD.

It is **two instructions**:

| SI | Purpose | Legs |
| --- | --- | --- |
| **SI-1002** `BUY-0925` (client side) | Sell BTC to the client | L3 Acme pays House 10,000 SGD; L4 Acme pays Fee Account 25 SGD (both today); L5 House delivers 0.25 BTC to Acme on **T+2** |
| **SI-1003** `SRC-0925` (sourcing side) | Buy BTC from the broker | House pays Meridian 9,950 SGD (**position 1**); Meridian delivers 0.25 BTC to House (**position 2**), both on **T+2** |

Accounts: Acme Main Account `A-2345-6789-0123-9`, House Account `A-1000-0000-0001-4` (may over-commit), Fee Account `A-1000-0000-0002-2`. Whitelists used: Meridian `LP SGD bank (DBS)` for the payment and `LP BTC wallet` for the arrival.

## Part A. The client side (SI-1002)

### Step 1. Create, approve, approve for settlement
Alice creates SI-1002, Bob approves it under Approvals, Alice approves it for settlement. Status: **Settling**. The Funding check passes: Acme needs 10,025 SGD set aside and has it. The House Account is marked "can promise more than it holds", so its checks are skipped: it may promise the BTC before it has it.

### Step 2. Obligations (Progress tab)

| Date | Obligation | Account | Direction | Amount | Status |
| --- | --- | --- | --- | --- | --- |
| Today | OB-3 | Acme | deliver | 10,025 SGD | Settled |
| Today | OB-4 | House | receive | 10,000 SGD | Settled |
| Today | OB-5 | Fee Account | receive | 25 SGD | Settled |
| **T+2** | OB-6 | House | deliver | 0.25 BTC | Pending |
| **T+2** | OB-7 | Acme | receive | 0.25 BTC | Pending |

The two SGD legs are internal, so they settle at once with two postings: Acme to House 10,000 SGD and Acme to Fee Account 25 SGD. The Overview shows **3 of 5 settled (next: T+2)**. The BTC side must wait for the real BTC.

## Part B. The sourcing side (SI-1003)

### Step 3. Advance the demo date
Demo controls > **Advance 1 day** twice (today becomes the T+2 date). SI-1003's first obligation turns **Eligible**; the BTC receive stays **Pending** because it is position 2 and must wait for position 1 to be final.

| Obligation | Account | Direction | Counterparty | Amount | Status |
| --- | --- | --- | --- | --- | --- |
| OB-8 | House | deliver | Meridian | 9,950 SGD | Eligible |
| OB-9 | House | receive | Meridian | 0.25 BTC | Pending |

External obligations are never netted. They settle through movements.

### Step 4. Outgoing movement: pay the broker (SGD)
On SI-1003 press **Select venue and create movement** next to OB-8.
- Source venue: **Bank Venue V**.
- Counterparty whitelist: Meridian has two approved bank accounts, so you must choose one (here **LP SGD bank (DBS)**).

The movement **OM-3012** is created as **Pending** (9,950.00 SGD, Venue to the whitelist). The whitelist is snapshotted onto the movement.

| Action | Button | Result |
| --- | --- | --- |
| Submit | **Submit** | OM-3012 becomes **Submitted / processing** with a bank reference (for example `DBS-REF-8639`). OB-8 becomes **Instructed**. |
| Bank reports | **Simulate bank confirmation** (confirm the amount) | OM-3012 becomes **Confirmed / settled**. OB-8 becomes **Settled** |

Other buttons on the same card: **Simulate bank rejection** (the failure and retry path), **Mark failed**.

Posting: `OM-3012 confirmed`, debit House Account, credit Bank Venue V, 9,950 SGD. The classification of OM-3012 is **Settlement** (outgoing, linked to the House Account).

### Step 5. Incoming movements: the broker delivers the BTC
OB-8 is final, so OB-9 turns **Eligible** and a **Simulate arrival** button appears. In the product the chain reports this; here you simulate it.

The dialog asks for the Sender (**LP BTC wallet v1 (matches this counterparty)** or **Unknown sender**) and the Amount. "Undischarged: 0.25 BTC. Smaller amounts are tranches. Above the tolerance the excess becomes unclassified."

| Arrival | Incoming movement | OB-9 | Posting |
| --- | --- | --- | --- |
| 0.10 BTC | IM-3013, classified **Settlement** automatically, Confirmed | **Partly settled** 0.10 / 0.25 | Token Venue W to House Account, 0.10 BTC |
| 0.10 BTC | IM-3014, Settlement, Confirmed | Partly settled 0.20 / 0.25 | 0.10 BTC |
| 0.15 BTC | IM-3015, Settlement, Confirmed, **0.05 BTC** (what was still owed) | **Settled** 0.25 / 0.25 | 0.05 BTC |
| the extra 0.10 BTC | **IM-3016**, **Unclassified**, status **Detected** | not applied | none until classified |

Because the sender matched the counterparty's whitelisted wallet, the system linked each arrival to the open obligation by itself. The excess does not settle anything. It waits in Incoming Movement (Token) with a **Classify** action. Classifying it is a separate step that needs a second operator (see section 3). SI-1003 also shows "Needs attention: 1 unclassified arrival from a counterparty of this instruction" and the item appears in Exceptions.

An **Unknown sender** arrival never matches. It lands directly as Unclassified.

### Step 6. SI-1003 completes
Both obligations are Settled. Status **Completed**. The House Account now really holds 0.25 BTC.

## Part C. The client gets the BTC (SI-1002 completes)

### Step 7. Automatic delivery to the client
As soon as OB-9 is settled, the House Account has the BTC. The pending BTC obligations on SI-1002 (OB-6 and OB-7) settle, with one posting: `L5 settles`, debit House Account, credit Acme Main Account, 0.25 BTC. SI-1002 shows **5 of 5 settled** and **Completed**.

No movement is needed for this step. The BTC never left custody; it only moved between two internal accounts.

### Step 8. Balances after the whole flow

| Account | SGD change | BTC change |
| --- | --- | --- |
| Acme Main Account | -10,025 | **+0.25** |
| House Account | +10,000 - 9,950 = **+50** | +0.25 - 0.25 = 0 |
| Fee Account | **+25** | |
| Bank Venue V | -9,950 | |
| Token Venue W | | +0.35 (0.25 for the trade, 0.10 unclassified), on top of the 0.05 BTC arrival already in the demo |

---

# 3. Movements no instruction created: book first, classify later

Some movements have no settlement instruction behind them: a bank fee, a network fee, the extra 0.10 BTC from the principal buy. They are handled in **two separate steps**, each approved by a second operator. This is the same pattern as incoming booking in the repo today.

| Step | What the operator does | What the books show |
| --- | --- | --- |
| **1. Book** | Records the facts only: venue, asset, amount, when, reference. No classification on the form | Movement is **Unclassified**. The amount sits in **Suspense** |
| **2. Classify** | Says what it is for and who bears it | The amount leaves Suspense for its final place |

**Suspense** is a holding account for money we can see at the venue but cannot yet assign. Outgoing money that left before we know why goes to **Suspense (paid out)**. Incoming money goes to **Suspense**. It keeps our books equal to the bank while the movement is unexplained.

## 3A. Outgoing: a 30 SGD bank fee charged to a client

**Step 1. Book.** Movement Management > Outgoing Movement > Fiat > **Book Outgoing Movement**. The page has three groups, each with a one-line description:

| Group | Fields |
| --- | --- |
| Venue and asset | Type (Fiat, fixed), Venue (Bank Venue V), Asset (SGD) |
| Amount and timing | Amount (30), Transacted at, Bank reference (`BANK-FEE-777`) |
| Other details | Payment rail, Internal note (both optional) |

Press **Submit**. The review modal says "30.00 SGD has left Bank Venue V. It is recorded as unclassified and held in Suspense (paid out) until an operator classifies it. One ledger entry is posted: DR Suspense / CR Bank Venue V."

**Step 2. Approve the booking.** Another operator approves under **Approvals**. The movement appears as **OM-30xx, Unclassified**, with a **Classify** button. Balances now show:

| Where | Change |
| --- | --- |
| Bank Venue V (SGD) | -30 |
| Suspense (paid out) | +30 |
| Acme Main Account | no change yet |

**Step 3. Classify.** On the movement press **Classify**. The modal has titled groups:

| Group | What you choose |
| --- | --- |
| What is it for? | Classification: **Venue charges** (outgoing choices are Venue charges, Refund, Others). Charge type: **Bank charge** |
| Who bears it? | **An account** and pick Acme Main Account, or **Borne by the custodian** |
| Notes | Related transaction, note |

An effect line updates as you choose: "30.00 SGD is classified as venue charges (bank charge), charged to Acme Main Account. That account balance falls and the line appears on its monthly statement. One ledger entry is posted: DR Acme Main Account / CR Suspense (paid out)."

**Step 4. Approve the classification.** Another operator approves it. Result:

| Where | Change |
| --- | --- |
| Suspense (paid out) | back to its earlier amount (the 30 leaves) |
| Acme Main Account (SGD) | 14,962.50 to **14,932.50** |
| Monthly statement | one new line for Acme |
| Custodian expense | no change (it would rise by 30 if you chose Borne by the custodian instead) |

If the classification is rejected, the movement stays Unclassified and the 30 stays in Suspense (paid out).

## 3B. Incoming: the extra 0.10 BTC from the principal buy

In the principal buy, the broker sent 0.10 BTC more than was owed. It was saved as **IM-3016, Unclassified**, with the amount held in **Suspense**. Nothing needed booking by hand. It only needs classifying.

1. Movement Management > Incoming Movement > Token. Press **Classify** on IM-3016.
2. Choose what it is. For this case the sensible choices are:

| Choice | Effect |
| --- | --- |
| **Unknown funds** | Stays in Suspense until it is refunded to the broker. No account changes |
| **Others** (explanation required) | Credited to an account or kept as custodian income |
| **Airdrop** or **Interest** | Only if it really was one of those |

3. A second operator approves it. For **Unknown funds**, return the BTC by booking an outgoing movement (3A, step 1), then classify that movement as **Refund** and select the unknown funds entry it returns. The refund clears the same amount from Suspense, and both Suspense balances return to zero.

The booking form for incoming movements is the same three groups as outgoing, with Depositor name or Source address in Other details.

---

# 4. Where the two examples differ

| | Exchange trade | Principal buy |
| --- | --- | --- |
| Outside party | None | Meridian (broker) |
| Obligations | All between our accounts, netted, settle together | Internal ones settle at once; external ones wait for a movement |
| Funding check | Runs on the Buyer and Seller | Runs on Acme; House skipped because it may over-commit |
| Outgoing movement | None | OM-3012 9,950 SGD to the broker's whitelisted bank account |
| Incoming movements | None | IM-3013 / 3014 / 3015 tranches plus IM-3016 unclassified excess |
| Needs a movement because | | Assets cross the custody boundary |
| Time | One day | T+2: SGD today, BTC two days later |
| Movements booked by hand | None | The extra 0.10 BTC arrives unclassified and is classified later (section 3) |
| Ledger | 4 gross postings | Internal postings, plus one per movement |

## Where to look for each thing

| You want to see | Go to |
| --- | --- |
| The approval request | Approvals (Maker Checker list) |
| Legs, obligations, postings | Transaction Management > Settlement Instructions > the SI > Legs, Progress, Postings |
| The outgoing movement | Movement Management > Outgoing Movement > Fiat |
| The incoming movements and the unclassified excess | Movement Management > Incoming Movement > Token |
| Booking and classifying by hand | Movement Management > Outgoing or Incoming Movement > Book, then the Classify action |
| Suspense balances | Balances (Deposit Suspense and Suspense (paid out)) |
| Balances and the ledger | Balances (prototype only) |
| The counterparty and its whitelists | Counterparty Management > Meridian Capital Markets Pte Ltd; Whitelist Management |
| Date control | Demo controls (Advance 1 day) |

## Prototype simplifications

- Bank confirmations, rejections and arrivals are simulated with buttons. In the product they come from the bank or the chain.
- Approving a classification also confirms the incoming movement and posts the ledger entry (the real flow has a separate Confirm).
- Booking and classifying each need a second operator. A booked movement can sit Unclassified for as long as you like.
- Counterparties are identified by a UUID only; accounts by account number.
