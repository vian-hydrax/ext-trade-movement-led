# Manual Movement Booking and Classification: Source Notes

Source notes supplied by the team, kept as written (light formatting only). They describe two gaps in today's Movement feature: outgoing movements that no instruction created, and incoming movements that are not a deposit or a rebalance. A short section at the end connects them to the Settlement Instruction work. That section is mine, not part of the source.

Related: `New Requirements/PRD - Settlement Instruction - External Settlement.md` (FR-10 already adds a "settlement" classification for incoming arrivals).

---

## Part 1: Movement-led outgoing

### Problem

Currently, the only outgoing movement supported by the system is instruction-led outgoing movement (ie withdrawal request / rebalance instruction is created first, then outgoing movement is generated).

However, if there are any outgoing movement at the venue that do NOT come from instructions, then there is no way to record these movements. For example, if the bank charges a bank charge, the venue balance will be out of sync with the bank.

### Proposed solution

Operator should be able to manually book outgoing movement then classify those movements to a transaction (eg bank charge, network fee, etc).

Note: currently, EVM and SOL chains use fee sponsor. But BTC and more chains in the future will not use fee sponsor. We should consider whether the network fee should be its own outgoing movement record, or just another field in an existing outgoing token record.

Some of these may be:

- **Tied to an account.** For example, if the bank charges an incoming TT fee, that is linked to someone's deposit, that fee may be deducted from their balance.
  - Note: if the adjustment affects customer account balance, it should reflect on their monthly statement.
- **NOT tied to an account.** For example, if the bank charges a monthly bank account maintenance fee, it is borne by the custodian.

### Manual vs auto

Start with manual booking of these movement-led outgoing. When ops notices a discrepancy (either from regular checking / from recon failure), they can manually book it.

Automate only if frequent and feasible.

- **Frequency.** Eg withdrawal fees that are incurred PER withdrawal are frequent: if we have 100 withdrawals per day, ops can't manually book the fee 100 times a day. Whereas monthly maintenance fees are low frequency: ops can manually book that once a month.
- **Feasibility.**
  - Some of these fees may be available via API. Eg some DBS fees may only be available via new API integration:
    - https://drive.google.com/file/d/19L0ZrE4tjS8wPsuBtLrrftOelRBFDQtI/view?usp=drive_link
    - https://drive.google.com/file/d/1_4alXhftCtHPahT_SfY-11F5YSyzFsbs/view?usp=drive_link
  - Some on-chain fees may be available via dfns or via a more direct blockchain integration (eg crypto APIs).
  - Some may not be available via API at all (eg banks or brokers with no API capability). This may require a workaround where ops uploads a PDF statement / excel sheet, then an OCR tool extracts the details, and calls the book incoming / outgoing movement APIs.

### Suggestion

- Identify what are all the possible movement-led outgoing.
- Then, try to see if there are umbrella terms (eg something like "venue charges" could be an umbrella term for any bank charges / on-chain fees). These can be your classification / transaction.
- For anything that doesn't fall under the umbrella terms, try to have a catch-all classification / transaction (eg "Others") so that if anything unexpected happens, the system can still support. Make sure the catch-all allows the operator to key in extra information.

---

## Part 2: Movement-led incoming

### Problem

Today, we only support 2 incoming transactions: deposit, rebalance. But there are many more transaction types (eg airdrop of tokens, interest credited by bank, unknown funds that need to be refunded, withdrawals that were reversed).

### Proposed solution

Operator should be able to book incoming movement and classify into more transaction types.

Some of these may be:

- **Tied to an account.** For example, if a customer's withdrawal was reversed, we would want to re-credit the customer.
  - Note: if the adjustment affects customer account balance, it should reflect on their monthly statement.
- **NOT tied to an account.** For example, if unknown funds are received, it is not attributable to any accounts.

### Suggestion

- Same as for movement-led outgoing: identify all possible scenarios.
- Then, try to identify umbrella terms for the most common types. Create a new classification / transaction for those. For less common types, just use a catch-all.

---

## How this connects to the Settlement Instruction work (added by Claude)

- **Same idea, same place.** The Settlement Instruction PRD already adds one new incoming classification, **Settlement** (an arrival is linked to an obligation). Part 2 widens the same classification list. Part 1 does the equivalent for outgoing.
- **Classification list today and proposed.**

  | Direction | Today | From the settlement work | From these notes (candidates) |
  | --- | --- | --- | --- |
  | Incoming | Deposit, Rebalance | Settlement | Airdrop, Interest, Reversal of a withdrawal, Unknown funds to refund, Others |
  | Outgoing | Withdrawal, Rebalance | Settlement | Venue charges (bank charge, network fee), Others |

- **Account link is the key attribute.** Each classification is either tied to an account (it changes a customer balance and must appear on the monthly statement) or not tied (borne by the custodian, or unattributed).
- **Manual first.** Operators book a movement by hand when they notice a gap, from a check or a reconciliation failure. Automation comes later and only where it is frequent and feasible (per-withdrawal fees, API or OCR sources).
- **Open questions to settle before a PRD:**
  1. Is a network fee its own outgoing movement or a field on the token movement (BTC and future chains have no fee sponsor)?
  2. Which classifications are tied to an account, and what ledger entry does each post?
  3. Who can book and who approves (maker-checker or not)?
  4. What evidence is required (reference, statement upload) and what does "Others" need to capture?
  5. Statement impact: which classifications appear on the customer's monthly statement and how.
  6. How a booked movement is matched against a bank or chain record during reconciliation, to avoid double booking.
