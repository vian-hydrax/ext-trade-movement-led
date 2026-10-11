# Repo notes: how Movement, Transactions and related pages work today

What I found by reading the Operator UI repo (`Repo/asset-management-dashboard-ui-develop`, read-only). It is the front end only: React and TypeScript with Apollo components. Behaviour that lives in the backend is inferred from the screens and types. File paths are under `src/app/pages` unless noted.

## Sidebar and navigation
- The sidebar is a flat list: Approvals, Account Management, User Management, Report Management, Venue Management, Venue Group Allocation, Movement Management (Incoming Movement, Outgoing Movement), Transaction Management (Deposit, Withdrawal, Rebalances, Settlement Instructions), Webhook Management, System, Batch Import, Audit Logs.
- Account Management is one page with tabs (Clients, Entities, Accounts, Whitelists). Whitelists has sub-tabs for addresses and bank accounts.
- Menu items live in `components/Layout/index.tsx`, with `NavPathAuditLog.ts` kept in sync.

## System menu and payment rails
- **System** (`/system-management`) is one page with four tabs: Blockchains, Assets, **Payment Rail Banks** (participating banks for FAST and MEPS) and **Charge Instructions**.
- **Charge Instructions** sets, per rail (MEPS and TT only), the default charge bearer (CRED, DEBT or SHAR) and the charge bearer account. FAST and ACT have no charge bearer.
- Outgoing rails (`components/PaymentDetails/constants.ts`): ACT, FAST (`fast_paynow`), MEPS, TT. Charge bearer applies to MEPS and TT only, which matches the manual booking form.

## Movement Management
Both Incoming and Outgoing are split by asset type: **Token**, **Fiat**, and (routes exist) **Securities**.

### Incoming movement
- **List:** filters for classification (`deposit`, `unclassified`), asset, venue, name match (`passed`, `failed`) and status (`detected`, `confirmed`); columns ID, Classification, Amount | Asset, Venue, Depositor | Bank Ref, Transacted At, Created At, Name Match, Status, Action (Classify, Confirm). Export CSV.
- **Booking exists today.** Create pages for token and fiat (`.../incoming-movement/token/create`, `.../fiat/create`).
  - Token fields: source address, destination address (auto-filled from venue), asset, amount, transaction hash, transacted at, venue.
  - Fiat fields: asset, amount, transacted at, bank reference ("used for reconciliation and audit trail"), virtual account number, sender reference, rail (FAST, PayNow, ACT, TT, MEPS), channel (instant, intraday), depositor name, depositor bank account, depositor bank (SWIFT/BIC), internal note.
  - **Import from CSV** exists for both (download template, upload, review table).
- **Detail:** Details block (movement ID, type, direction, venue, bank reference, status, classification, asset, amount, VAN, rail, transacted at, linked transaction when classified), depositor details (name, bank, account, credit event ID, name match status and failure reason). Header buttons: **Classify** (when unclassified), **Confirm** and **Reject** (when detected).
- **Classify modal:** the classification type is a locked select with one option, **Deposit**. A destination account is required (unified accounts, searchable). A warning asks the operator to check that the depositor name matches the entity that owns the account, and shows the two names side by side.
- **Maker-checker:** movements can carry a maker-checker request (`mchRequestId`). The page shows "This entry has an ongoing maker checker request" and the buttons change to "View request".
- **Banners:** unclassified ("requires operator review"), on hold when name match failed, ready to confirm, confirmed ("credited to the client account").

### Outgoing movement
- **No manual booking.** Outgoing movements are created from a withdrawal or a rebalance. There is no create page.
- **List filters:** status (`pending`, `submitted`, `confirmed`, `failed`); classification (`withdrawal`, `rebalance`, `unclassified`); execution status (`outcome_unknown`, `acknowledged`, `processing`, `settled`, `rejected`); execution method (`automated`, `manual`); for tokens, compliance status (`pending`, `passed`, `failed`, `skipped`, `overridden_to_passed`, `error`, `unsupported`).
- **Token detail:** blockchain (with `feeSponsorBy`), source and destination address and ids, **`networkFee`** (a field on the record), total received, KYT status and remarks, transaction hash, external id, whitelist address id, execution method. Actions: **Confirm**, **Mark as failed**, **Manually process**, **Override KYT status**, **BTC fee rate**.
- **Fiat detail:** from and to (whitelisted bank account fields), withdrawal amount, execution method and status, payment rail, **charge bearer account and charge bearer**, bank reference, payment reference, fallback reason, failure or rejection reason, transacted at.
- **Fail outgoing movement** is a maker-checker request type (`fail_outgoing_movement`).

## Transaction Management
- **Deposit, Withdrawal, Rebalance** pages each show a **Linked movements** table. Withdrawal offers **Generate new movement** and **Regenerate token movement** when the latest movement failed. Rebalance lists both outgoing and incoming movements with their classification.
- **Settlement Instruction (existing):**
  - List columns: Settlement Instruction, Legs, External Reference, Remarks, Status, Created At. Filters: account and status.
  - Statuses: `awaiting_client_approval`, `under_review`, `completed`, `rejected`.
  - Detail: Details, rejection reason and action by and at, transfer leg and obligation drawers, linked transaction details. Header buttons for `under_review`: **Reject** and **Process**.
  - Create: Add Transfer Leg modal, transaction purpose, external reference, internal note.

## Approvals (Maker Checker)
- Entity types today include Entity Depositor Aliases, External Wallet, Fail Outgoing Movement, Fail Rebalance, Incoming Movement, Incoming Token, Rebalance, Settlement Instruction, Unified Withdrawal, VAN Issuance, Venue Group Link, Whitelisted Address, Whitelisted Bank Account. Operations: Create, Update, Delete, Other. Statuses: Awaiting Approval, Approved, Rejected.
- There is no counterparty type yet.

## Reports and venues
- **Reports:** a Monthly Entity Statement report exists (Report Management). This is where the "monthly statement" in the manual booking notes would show.
- **Venues:** Fiat Venues (with Virtual Account Numbers) and Token Venues (hot, deposit and external wallets with a wallet balance table). Venue balances are shown on venue and wallet pages.

## Conventions that apply to anything we design (from CLAUDE.md)
No code comments. `amountFormat` for every amount. `accountNumber` instead of raw ids. `SearchInput`, `IdSearchInput` and `FilterTooltip` for filters. `OptionalText` for optional labels. `DetailsPageLayout` for detail bodies. Filters, page and sort persist in the URL. Export CSV on lists. Apollo components over raw antd.

## What this changes in our assumptions
1. Incoming booking and CSV import already exist and use maker-checker. The gap is outgoing booking and a wider classification list.
2. The classification field already exists on both directions. Incoming has Deposit and Unclassified. Outgoing has Withdrawal, Rebalance and Unclassified. Settlement is the first new value from our work.
3. The Classify modal is locked to Deposit and always needs a destination account. Classifications that are not tied to an account need that rule relaxed.
4. A network fee is already a field on the outgoing token record. Fiat already records the charge bearer. The "own record or a field" question in the notes is therefore about fees paid outside the movement.
5. Marking an outgoing movement as failed is already maker-checker.
6. Movement lists and details are split by Token, Fiat and Securities.
