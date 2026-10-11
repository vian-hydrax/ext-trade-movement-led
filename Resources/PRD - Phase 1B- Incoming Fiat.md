# PRD \- Phase 1B: Incoming Fiat

## About the Document

### List of Personnel

| Role | Name |
| --- | --- |
| Product Manager | @Jordan Chong |
| Tech Lead | @Hossein Nasr Esfahan |
| Design | @Arfian |
| QA | @Widhi Putri |
| Stakeholder |  |

---

## Overview

### Problem Statement

The platform currently supports token asset movements but has no fiat handling capability. Fiat assets can be created in the asset table, but there is no infrastructure to track fiat custody venues, no mechanism to record incoming fiat movements, and no way to credit client accounts with fiat balances. This blocks custody clients who hold or wish to deposit fiat assets.

---

### Goals

- Operators can create and manage fiat venues (bank accounts) and fiat venue groups for asset segregation
- Operators can link client accounts to fiat venue groups
- Operators can manually book incoming fiat movements observed at bank venues, with maker-checker approval
- Operators can classify incoming fiat movements as deposits and select the destination client account, with maker-checker approval
- Operators can confirm incoming fiat movements, triggering the ledger credit to the client account
- Fiat venue balances and client account fiat balances are tracked accurately in the balance service using double-entry accounting
- Clients can view their fiat deposit transactions and balances
- The architecture uses the standard Transaction + Movement model so that future phases (VAN, auto-classification, rebalance, API integration) require no structural redesign

---

### In Scope

- Migration of existing wallet group entity to a generalised venue group entity with `assetType` field (`token`, `fiat`, `security`)
- Fiat venue group — create operation (venue group with `assetType: fiat`)
- Fiat venue (bank account type) — data model, create operation (no maker-checker), linked to fiat venue group at creation
- Account-to-fiat-venue-group linking (maker-checker, after account creation, no unlinking)
- Fiat venue balance tracking in the balance service (per-asset, same as token venues)
- Incoming fiat movement booking by operator (maker-checker) — creates unlinked movement in `detected` status, books to Deposit Suspense
- Manual classification of incoming movement as `deposit` by operator (maker-checker) — creates deposit transaction (movement-led, `processing`), links movement, sets `clientExpected`
- Movement confirmation by operator — movement `confirmed`, transaction `completed`, ledger credit `DR Deposit Suspense / CR Client Account`
- Operator API endpoints: create/list/get incoming movements, classify, confirm
- Client API endpoints: list/get fiat deposit transactions on their account
- Fiat-specific movement details in a typed `details` structure (depositor name, value date, bank reference)
- Error codes and validation rules for fiat movement handling
- Multi-currency support — each fiat currency tracked as an independent balance line

---

### Out of Scope

| Item | Reason |
| --- | --- |
| VAN issuance and auto-classification | Phase 2 — requires VAN infrastructure |
| Client-facing deposit instructions | Phase 2 — depends on VAN; deposit instructions given manually outside system for now |
| Automated depositor name verification | Phase 2 — operator manually verifies when selecting the account in Phase 1 |
| Editing an incoming movement after booking (e.g. correct typo in amount or depositor name) | Future phase |
| Operational monitoring / alerts for long-unclassified movements | Future phase |
| Fiat withdrawal (instruction-led outgoing) | Phase 1b — separate PRD |
| Fiat rebalance | Phase 3 |
| Refund handling and `unknown` classification | Phase 3 |
| DBS Bank API integration (auto-detection) | Phase 4 |
| Classification options other than `deposit` | Phase 3 — unclassified movements sit in the queue |
| Compliance checks (KYT, sanctions, name screening) | Not applicable to fiat; crypto-specific |
| Token or securities asset handling | Covered by separate PRDs |
| FX conversion between fiat currencies | Outside platform scope |
| Reporting and reconciliation tooling | Deferred to a future release |

---

### Assumptions

- Incoming fiat detection is fully manual: operators observe incoming transfers in the DBS bank portal and book them in the system
- One incoming movement maps to one bank transfer; de-duplication is enforced on bank reference (if supplied) or on venue + currency + amount + value date
- Operator manually verifies depositor identity when selecting the destination account (automated name check is Phase 2)
- Deposit instructions (VAN + bank details) are communicated to clients outside the system in Phase 1
- Fiat balances use the same double-entry ledger as token balances — no separate fiat ledger
- Multi-currency means each currency is an independent balance line; no netting across currencies
- A fiat venue (bank account) is multi-currency — it may hold balances in any fiat currency supported by the bank provider
- The `details` structure on the movement carries fiat-specific fields (depositor name, value date, bank reference, remittance info) per model design principle 3.9
- Unclassified movements that are not deposits remain in the queue indefinitely until Phase 3 adds additional classification options
- Fiat venue groups follow the same segregation model as token venue groups
- Client entities and accounts already exist in the system
- Fiat currencies are defined in the asset catalogue (fiat asset creation already built)
- Whitelisted bank accounts (WBA) module already built (used in Phase 1b, not directly relevant here)
- Maker-checker module already built and available for operator operations

---

## Functional Requirements

### Section 1: Venue Group Migration and Fiat Venue Infrastructure

Covers the migration of the existing wallet group concept to a generalised venue group model, creation of fiat venues, and linking accounts to fiat venue groups.

#### FR-1: Migrate Wallet Group to Venue Group

**Requirement Details**

As a platform architect, I want the existing wallet group entity to be generalised into a venue group entity with an asset type field so that the same segregation model can serve token, fiat, and security venues.

**Actor:** System (migration); Custody Operator (post-migration usage)

**Precondition:** The existing wallet group entity is in use for token venue segregation.

**Main Flow:**

1. The wallet group entity is renamed to venue group across the data model, API, and UI.
2. An `assetType` field is added to the venue group entity with values: `token`, `fiat`, `security`.
3. All existing wallet group records are migrated with `assetType: token`.
4. The wallet creation flow is updated: where operators previously selected a "wallet group", they now select a venue group where `assetType = token`. Behaviour is otherwise identical.
5. API endpoints are renamed from wallet-group nomenclature to venue-group nomenclature. Existing integrations are updated.

**Alternate Flows:**

**Business Rules:**

- A venue group has exactly one `assetType`. A venue group with `assetType: token` can only contain token venues; `assetType: fiat` can only contain fiat venues.
- Existing wallet group functionality is preserved — no behavioural change for token operations. Only the entity name and the addition of `assetType` changes.
- The `assetType` field is immutable after creation — it cannot be changed on an existing venue group.
- All existing references to "wallet group" in the operator UI and API are updated to "venue group".
- The existing account creation flow currently requires selecting a wallet group. After migration, this becomes selecting a venue group where `assetType = token`. Behaviour is otherwise identical.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Existing wallet groups are migrated | Given existing wallet group records exist in the system When the migration is executed Then all wallet group records are renamed to venue group records with `assetType: token` |
| Wallet creation uses venue group terminology | Given the migration is complete When an operator creates a new wallet Then the wallet creation flow presents venue groups where `assetType = token` for selection |
| Account creation uses venue group terminology | Given the migration is complete When an operator creates a new account Then the account creation flow presents venue groups where `assetType = token` for wallet group selection |
| assetType is immutable | Given a venue group exists with `assetType: token` When an operator attempts to change the `assetType` Then the system rejects the request |
| API endpoints are renamed | Given the migration is complete When an operator calls the old wallet-group API endpoints Then the system returns the updated venue-group endpoints |

**Mockups:**

**Standard Cold Wallet Omnibus**

**Omnibus Hot Wallet**

**Unified Account → Create**  
<https://www.figma.com/design/JXKBoIIDYi88AGrGl4ou1e/-FE-UI--Unified-Account--Operator-User-?node-id=2697-76761&t=IVXdi2shBSZkfGy9-1> 

**Unified Account → List & View**  
<https://www.figma.com/design/JXKBoIIDYi88AGrGl4ou1e/-FE-UI--Unified-Account--Operator-User-?node-id=2700-132013&t=IVXdi2shBSZkfGy9-1> 

---

#### FR-2: Create Fiat Venue Group

**Requirement Details**

As a Custody Operator, I want to create a venue group with `assetType: fiat` so that fiat venues can be logically grouped for asset segregation.

**Actor:** Custody Operator

**Precondition:** The venue group entity supports the `assetType` field (FR-1 complete).

**Main Flow:**

1. Operator creates a fiat venue group via the operator API, specifying: group name and `assetType: fiat`.
2. System validates that the group name is unique across all venue groups (regardless of asset type).
3. System persists the fiat venue group.

**Alternate Flows:**

- Group name already exists: system rejects with a uniqueness error. Same name with different casing is also considered the same (if it is easy to include this)
- Required fields missing: system rejects with a validation error.
- `assetType` is not a valid value: system rejects with a validation error.

**Business Rules:**

- Fiat venue groups follow the same segregation model as token venue groups — assets within a venue group are treated as fungible.
- Group name uniqueness is enforced across all asset types to avoid confusion.
- Maker-checker is not required for venue group creation in Phase 1a.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Successful fiat venue group creation | Given the operator has permission to manage venue groups When the operator creates a venue group with `assetType: fiat` and a unique group name Then the system persists the fiat venue group |
| Duplicate group name rejected | Given a venue group named "Customer Fiat" already exists When the operator creates a venue group with the name "Customer Fiat" Then the system rejects with a uniqueness error |
| Duplicate name across asset types rejected | Given a token venue group named "Customer Assets" already exists When the operator creates a fiat venue group with the name "Customer Assets" Then the system rejects with a uniqueness error |
| Invalid assetType rejected | Given the operator creates a venue group When the `assetType` is not one of `token`, `fiat`, `security` Then the system rejects with a validation error |

**Mockups:**

<https://www.figma.com/design/E50RMrPAGn2hTZ0dDD2h0a/-FE-UI--Venue-Group--Operator-User-?node-id=19-10153&t=H5DdVR3EzwFYo1x0-1>

---

#### FR-3: Create Fiat Venue

**Requirement Details**

As a Custody Operator, I want to create a fiat venue representing a bank account and assign it to a fiat venue group so that the system can track fiat asset balances held at that bank.

**Actor:** Custody Operator

**Precondition:** A fiat venue group exists (`assetType: fiat`).

**Main Flow:**

1. Operator creates a fiat venue via the operator API, specifying: venue name, venue type `bank`, venue group ID, bank provider (e.g. `dbs`), and bank-specific properties (e.g. bank account number, bank name, SWIFT/BIC code).
2. System validates that:
    - ~~The venue name is unique across all venues.~~
    - The specified venue group exists and has `assetType: fiat`.
3. System persists the fiat venue and its membership in the specified venue group.

**Alternate Flows:**

- ~~Venue name already exists: system rejects with a uniqueness error.~~
- Venue group does not exist or has a non-fiat `assetType`: system rejects with a validation error.
- Required fields missing or invalid: system rejects with a validation error.

**Business Rules:**

- Fiat venues must have venue type `bank`.
- A fiat venue is linked to exactly one venue group at creation. The venue group must have `assetType: fiat`.
- A fiat venue is multi-currency — it may hold balances in any fiat currency supported by its bank provider. No per-currency venue is needed.
- Bank-specific properties are stored in a typed `details` structure on the venue, not flattened.
- Maker-checker is not required for venue creation in Phase 1a.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Successful fiat venue creation with venue group | Given a fiat venue group exists When the operator creates a fiat venue with type `bank`, a unique name, and the fiat venue group ID Then the system persists the venue and its membership in the venue group |
| Venue group with wrong assetType rejected | Given a venue group exists with `assetType: token` When the operator creates a fiat venue specifying that venue group Then the system rejects with a validation error |
| ~~Duplicate venue name rejected~~ | ~~Given a venue named "DBS SGD" already exists~~ ~~When the operator creates a venue with the name "DBS SGD"~~ ~~Then the system rejects with a uniqueness error~~ |
| Bank-specific properties stored in details | Given the operator creates a fiat venue with bank account number and SWIFT code When the venue is persisted Then the bank-specific properties are stored in the `details` structure |

**Mockups:**

<https://www.figma.com/design/TGauoafjDX4bPaLNuC0asW/-FE-UI--Fiat-Venues-2.0--Operator-User-?node-id=2011-9413&t=qr5thYtW6RXytgzP-1>

---

#### FR-4: Link Account to Fiat Venue Group

**Requirement Details**

As a Custody Operator, I want to link a client account to a fiat venue group so that the account can hold fiat balances and receive fiat deposits from venues in that group.

**Actor:** Custody Operator (maker-checker)

**Precondition:** The account and the fiat venue group both exist; the account belongs to an active client entity.

**Main Flow:**

1. Operator (maker) links an account to a fiat venue group via the operator API, specifying: account ID and venue group ID.
2. A different operator (checker) reviews and approves the link.
3. System validates that:
    - The venue group has `assetType: fiat`.
    - The account is not already linked to the target fiat venue group.
4. System persists the account-to-venue-group link.

**Alternate Flows:**

- Checker rejects the link: no change is made.
- Account is already linked to the target venue group: system rejects with a duplicate link error.
- Account is already linked to another venue group with the same asset type: system rejects — only one venue group per asset type is permitted per account.
- Venue group does not have `assetType: fiat`: system rejects with a validation error.

**Business Rules:**

- An account may be linked to at most one venue group per asset type (e.g. one fiat venue group and one token venue group). Attempting to link a second venue group of the same asset type is rejected.
- The account-to-venue-group link determines which venues are available for deposits and withdrawals on that account.
- Linking requires maker-checker approval.
- Unlinking an account from a venue group is not supported in Phase 1a. If an incorrect link is made, a new account must be created with the correct link.
- **Note:** For token venue groups, the link is currently established at account creation (the operator selects the wallet group, now renamed to venue group, during account creation — see FR-1 in this document). This FR adds a separate post-creation linking flow for fiat venue groups. The existing token linking-at-creation behaviour is unchanged.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Successful account-to-fiat-venue-group link | Given an active account and a fiat venue group both exist When the maker links the account to the fiat venue group and the checker approves Then the system persists the account-to-venue-group link |
| Checker rejects the link | Given the maker has proposed linking an account to a fiat venue group When the checker rejects the link Then no link is created |
| Duplicate link rejected | Given an account is already linked to the target fiat venue group When the maker attempts to link the same account to the same venue group Then the system rejects with a duplicate link error |
| One venue group per asset type enforced | Given an account is already linked to a fiat venue group When the maker attempts to link the account to a different fiat venue group Then the system rejects — only one venue group per asset type is permitted |
| Non-fiat venue group rejected | Given a venue group exists with `assetType: token` When the maker attempts to link an account to that venue group via this flow Then the system rejects with a validation error |
| Unlinking not supported | Given an account is linked to a fiat venue group When an operator attempts to unlink the account Then the system rejects — unlinking is not supported in Phase 1a |

**Mockups:**

<https://www.figma.com/design/JXKBoIIDYi88AGrGl4ou1e/-FE-UI--Unified-Account--Operator-User-?node-id=2701-133360&t=IVXdi2shBSZkfGy9-1>

---

### Section 2: Incoming Fiat Movement Booking

Covers the manual booking of incoming fiat movements by operators after observing transfers in the bank portal.

#### FR-5: Book Incoming Fiat Movement

**Requirement Details**

As a Custody Operator, I want to book an incoming fiat movement observed at a bank venue so that the system records the arrival and tracks it in Deposit Suspense pending classification.

**Actor:** Custody Operator (maker-checker)

**Precondition:** A fiat transfer has arrived at a fiat venue as observed by the operator in the bank portal; no incoming movement already exists for the same transfer.

**Main Flow:**

1. Operator (maker) creates an incoming fiat movement via the operator API, supplying: venue ID, asset ID (fiat currency), amount, depositor name, `transactedAt` (the date/time the transfer actually occurred at the bank), and bank reference.
2. A different operator (checker) reviews the proposed movement details and approves or rejects.
3. On checker approval, system checks for a duplicate incoming movement at the same venue with the same bank reference.
4. System persists the incoming movement:
    - Status: `detected`
    - Direction: `incoming`
    - `transactionId`: null
    - `classification`: `unclassified`
    - Fiat-specific fields stored in the movement's `details` structure: `depositorName`, `bankReference`
    - `transactedAt` set from the operator-supplied value (the bank's value date)
        - NOTE: bank does not provide datetime, operator will give a date instead, and system can append 00:00 time. We just need to be careful that when we generate reports or display the date to the user, we remember to convert it to SGT before presenting it
5. System applies the detection balance update:
    - `DR Venue / CR Deposit Suspense`

**Alternate Flows:**

- Checker rejects the proposed movement: the movement is not persisted; no balance update occurs.
- On checker approval, duplicate movement detected (same bank reference at same venue): system rejects the creation with a duplicate error; the MCH request remains `awaiting_approval` for the maker to resolve.
- Required fields missing or invalid (e.g. negative amount, zero amount, unsupported currency, venue does not exist, venue is not of type `bank`): system rejects with a validation error.
- Asset is not a fiat currency: system rejects — only fiat assets are valid for fiat venue movements.

**Business Rules:**

- Mandatory fields: venue ID, asset ID, amount, depositor name, `transactedAt`, bank reference.
- Amount must be greater than zero.
- Asset must be a fiat currency defined in the asset catalogue.
- Venue must be of type `bank`.
- De-duplication is enforced on bank reference + venue. A duplicate is detected only at the point of checker approval (per maker-checker deferred execution — see `knowledge/06-maker-checker.md`).
- Movement creation requires maker-checker approval; the same operator may not both create and approve the movement.
- The movement is created as unlinked (`transactionId: null`, `classification: unclassified`). It remains unlinked until classified (FR-6).
- `transactedAt` is the economic effectiveness date — the date/time the transfer actually occurred at the bank (the bank's value date). This may differ from `createdAt` (when the movement was booked into the system). For example, a transfer that settled on Friday may only be booked on Monday. All balance service updates pass `transactedAt` as `value_datetime` so that balance queries reflect the correct economic date.
- The system must be designed so a future automated creation path (e.g. bank credit notification API) can create the same movement record without schema changes.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Successful movement booking | Given a fiat venue of type `bank` exists When the maker creates an incoming movement with valid fields and the checker approves Then the system persists the movement with status `detected`, classification `unclassified`, and `transactionId: null` and applies `DR Venue / CR Deposit Suspense` |
| Checker rejects the movement | Given the maker has proposed an incoming movement When the checker rejects Then no movement is persisted and no balance update occurs |
| Duplicate bank reference at same venue rejected | Given an incoming movement with bank reference "REF-001" already exists at venue "DBS-1" When the checker approves a new movement with bank reference "REF-001" at venue "DBS-1" Then the system rejects with a duplicate error and the MCH request remains `awaiting_approval` |
| Non-fiat asset rejected | Given the operator supplies a token asset ID When the maker creates an incoming fiat movement Then the system rejects — only fiat assets are valid |
| Non-bank venue rejected | Given the operator supplies a venue that is not of type `bank` When the maker creates an incoming fiat movement Then the system rejects with a validation error |
| Zero or negative amount rejected | Given the operator supplies an amount of 0 or -100 When the maker creates an incoming fiat movement Then the system rejects with a validation error |
| transactedAt is set from operator input | Given the operator supplies `transactedAt` as "2026-03-28T10:00:00Z" When the movement is persisted Then the movement's `transactedAt` is "2026-03-28T10:00:00Z" and `createdAt` reflects the current system time |
| Fiat details stored in details structure | Given the operator supplies depositor name and bank reference When the movement is persisted Then `depositorName` and `bankReference` are stored in the movement's `details` structure |

**Mockups:**

<https://www.figma.com/design/BNQK1sOo3nOz3viRCk8LNk/-FE-UI--Incoming-Fiat-Movement--Operator-User-?node-id=11-10962&t=GtLgDc44XyHYYIdD-1>

---

### Section 3: Incoming Fiat Classification and Confirmation

Covers classification of unlinked incoming movements as deposits, and confirmation that applies the ledger credit to the client account.

#### FR-6: Classify Incoming Movement as Deposit

**Requirement Details**

As a Custody Operator, I want to classify an unlinked incoming movement as a deposit and select the destination client account so that a deposit transaction is created and the client can see the expected inflow.

**Actor:** Custody Operator (maker-checker)

**Precondition:** An incoming movement exists with `classification: unclassified` and status `detected`.

**Main Flow:**

1. Operator (maker) classifies an incoming movement as `deposit` via the operator API, specifying: movement ID and destination account ID.
2. A different operator (checker) reviews the proposed classification, including the selected destination account, and approves or rejects.
3. System validates that:
    - The movement is in `detected` status with `classification: unclassified`.
    - The destination account exists, is active, and is linked to a fiat venue group that contains the movement's venue.
    - The movement's asset is a fiat currency defined in the asset catalogue.
4. System sets `classification: deposit` on the movement.
5. System creates a deposit transaction:
    - Type: `deposit`
    - Initiation mode: `movement_led`
    - Status: `processing`
    - Links the movement to the transaction (`transactionId` set on the movement).
6. System applies the expected balance update:
    - `↑ Expected Client Account` (destination account, movement asset, movement amount)

**Alternate Flows:**

- Checker rejects the proposed classification: no changes are made; movement remains `unclassified` in `detected` status.
- Movement is not in `detected` status or is already classified: system rejects with a state error.
- Destination account does not exist or is not active: system rejects with a validation error.
- Destination account is not linked to a venue group containing the movement's venue: system rejects — the account cannot receive deposits from this venue.
- Deposit transaction creation fails: movement reverts to `classification: unclassified`; no expected balance update is applied.

**Business Rules:**

- In Phase 1a, `deposit` is the only available classification option. Movements that are not deposits remain `unclassified` in the queue.
- Classification requires maker-checker approval; the same operator may not both propose and approve a classification.
- The operator manually verifies that the depositor matches the entity owning the destination account before selecting it. Automated name verification is Phase 2.
- Classification is not applied until checker approval succeeds.
- The deposit transaction is created at `processing` status (movement-led entry point per the transaction model).
- `clientExpected` is a display-only balance — it does not affect `total` or `available`.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Successful classification as deposit | Given an incoming movement with status `detected` and classification `unclassified` When the maker classifies it as `deposit` with a valid destination account and the checker approves Then the movement's classification is set to `deposit`, a deposit transaction is created with status `processing`, the movement is linked to the transaction, and `↑ Expected Client Account` is applied |
| Checker rejects classification | Given the maker has proposed classifying a movement as `deposit` When the checker rejects Then no changes are made and the movement remains `unclassified` in `detected` status |
| Already classified movement rejected | Given an incoming movement with classification `deposit` When the maker attempts to classify it again Then the system rejects with a state error |
| Destination account not linked to venue group | Given the destination account is not linked to a fiat venue group containing the movement's venue When the maker classifies the movement as `deposit` for that account Then the system rejects — the account cannot receive deposits from this venue |
| Expected balance is display-only | Given a movement has been classified as `deposit` When the client views their account balance Then the `expected` balance is visible but does not affect `total` or `available` |

**Mockups:**  
<https://www.figma.com/design/BNQK1sOo3nOz3viRCk8LNk/-FE-UI--Incoming-Fiat-Movement--Operator-User-?node-id=11-40808&t=GtLgDc44XyHYYIdD-1> 

---

#### FR-7: Confirm Incoming Fiat Movement

**Requirement Details**

As a Custody Operator, I want to confirm an incoming fiat movement so that the client account is credited and the deposit transaction is completed.

**Actor:** Custody Operator

**Precondition:** The incoming movement is linked to a deposit transaction; the movement is in `detected` status with `classification: deposit`.

**Main Flow:**

1. Operator confirms the incoming movement via the operator API, specifying: movement ID.
2. System validates that the movement is in `detected` status, has `classification: deposit`, is linked to a transaction in `processing` status and account status: active.
3. System transitions the movement to `confirmed` status.
4. System transitions the linked deposit transaction to `completed` status.
5. System applies the confirmation balance updates:
    - Journal entry: `DR Deposit Suspense / CR Client Account` (destination account, movement asset, movement amount). The movement's `transactedAt` is passed to the balance service as `value_datetime`.
    - `↓ Expected Client Account` (destination account, movement asset, movement amount)

**Alternate Flows:**

- Movement is not in the expected state (not `detected`, not classified as `deposit`, not linked to a `processing` transaction, account is not active): system rejects with a state error.
- Balance service returns an error on the journal entry: system retains the movement in `detected` status; no partial credit is applied; error is surfaced for operator investigation.

**Business Rules:**

- Confirmation requires the movement to be classified as `deposit` and linked to a `processing` transaction.
- The suspense balance established at detection (FR-5) is reversed to the client account at confirmation.
- Confirmation is a single-operator action — maker-checker is not required since classification (the consequential decision) already passed maker-checker.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Successful confirmation | Given an incoming movement with status `detected`, classification `deposit`, linked to a transaction in `processing` status When the operator confirms the movement Then the movement transitions to `confirmed`, the transaction transitions to `completed`, `DR Deposit Suspense / CR Client Account` is applied, and `↓ Expected Client Account` is applied |
| transactedAt passed as value\_datetime | Given a movement with `transactedAt` of "2026-03-28T10:00:00Z" When the operator confirms the movement Then the balance service journal entry uses "2026-03-28T10:00:00Z" as `value_datetime` |
| Movement not in expected state rejected | Given an incoming movement with status `confirmed` When the operator attempts to confirm it Then the system rejects with a state error |
| Unclassified movement rejected | Given an incoming movement with classification `unclassified` When the operator attempts to confirm it Then the system rejects with a state error |
| Inactive destination account rejected | Given the destination account is not active When the operator confirms the movement Then the system rejects with a validation error |
| Balance service error prevents confirmation | Given the balance service returns an error on the journal entry When the operator confirms the movement Then the movement remains in `detected` status, no credit is applied, and the error is surfaced for investigation |
| No maker-checker required | Given a classified incoming movement When a single operator confirms it Then the confirmation succeeds without requiring a second operator |

**Mockups:**  
<https://www.figma.com/design/BNQK1sOo3nOz3viRCk8LNk/-FE-UI--Incoming-Fiat-Movement--Operator-User-?node-id=23-70635&t=GtLgDc44XyHYYIdD-1> 

---

### Section 4: Operator Visibility

Covers operator list and view capabilities for fiat infrastructure entities, incoming movements, and deposit transactions.

#### FR-8: List and View Fiat Venues and Venue Groups

**Requirement Details**

As a Custody Operator, I want to list and view fiat venues and fiat venue groups so that I can manage fiat infrastructure and verify configuration.

**Actor:** Custody Operator

**Precondition:** At least one fiat venue or fiat venue group exists in the system.

**Main Flow:**

1. Operator queries fiat venue groups via the operator API. System returns a paginated list of venue groups where `assetType = fiat`, including: group ID, name, and count of linked venues.
2. Operator queries fiat venues via the operator API. System returns a paginated list of venues where type is `bank`, including: venue ID, name, bank provider, venue group, and `details` structure.
3. Operator selects a specific venue or venue group to view its full details.

**Alternate Flows:**

- No venues or venue groups match the applied filters: system returns an empty list.

**Business Rules:**

- Venue group list can be filtered by `assetType`.
- Venue list can be filtered by venue type and venue group ID.
- Results are sorted by `createdAt` descending by default.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| List fiat venue groups | Given fiat venue groups exist in the system When the operator queries venue groups with `assetType = fiat` Then the system returns only fiat venue groups with group ID, name, segregation purpose, and linked venue count |
| List fiat venues | Given fiat venues of type `bank` exist When the operator queries venues filtered by type `bank` Then the system returns fiat venues with venue ID, name, bank provider, venue group, and `details` structure |
| Filter venue groups by assetType | Given both fiat and token venue groups exist When the operator filters by `assetType = fiat` Then only fiat venue groups are returned |
| Empty results | Given no fiat venues exist When the operator queries fiat venues Then the system returns an empty list |

**Mockups:**  
**Venue Group Fiat - List & View**  
<https://www.figma.com/design/E50RMrPAGn2hTZ0dDD2h0a/-FE-UI--Venue-Group--Operator-User-?node-id=46-32623&t=H5DdVR3EzwFYo1x0-1> 

**Venue Group Token - List & View**  
<https://www.figma.com/design/E50RMrPAGn2hTZ0dDD2h0a/-FE-UI--Venue-Group--Operator-User-?node-id=191-3434&t=qKN1DBbO4y1fbcy7-1> 

  
**Fiat Venue - List & View**  
<https://www.figma.com/design/TGauoafjDX4bPaLNuC0asW/-FE-UI--Fiat-Venues-2.0--Operator-User-?node-id=2011-21581&t=sUcsEWPzWDpkVzKO-1> 

---

#### FR-9: List and View Incoming Fiat Movements

**Requirement Details**

As a Custody Operator, I want to list and view incoming fiat movements so that I can monitor the classification queue and track movement status.

**Actor:** Custody Operator

**Precondition:** At least one incoming fiat movement exists in the system.

**Main Flow:**

1. Operator queries incoming fiat movements via the operator API.
2. System returns a paginated list of movements matching the applied filters.
3. Operator selects a specific movement to view its full details, including: movement ID, venue, asset, amount, depositor name, bank reference, status, classification, linked transaction ID (if any), `details` structure, `createdAt`, and `transactedAt`.

**Alternate Flows:**

- No movements match the applied filters: system returns an empty list.

**Business Rules:**

- Supported filters: status (`detected`, `confirmed`), classification (`unclassified`, `deposit`), venue ID, asset ID, date range (on `createdAt` or `transactedAt`).
- Results are sorted by `createdAt` descending by default.
- The list endpoint returns summary fields; the detail endpoint returns the full movement record including the `details` structure.
- Movements in all statuses and classifications are visible to operators — no movements are hidden.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| List movements with default sort | Given multiple incoming fiat movements exist When the operator queries incoming fiat movements without specifying a sort Then the results are sorted by `createdAt` descending |
| Filter by classification | Given movements with classifications `unclassified` and `deposit` exist When the operator filters by `classification = unclassified` Then only unclassified movements are returned |
| Filter by status | Given movements with statuses `detected` and `confirmed` exist When the operator filters by `status = detected` Then only detected movements are returned |
| View movement detail | Given an incoming fiat movement exists When the operator views its full details Then the response includes movement ID, venue, asset, amount, depositor name, bank reference, status, classification, linked transaction ID, `details` structure, `createdAt`, and `transactedAt` |
| Empty results | Given no incoming fiat movements match the applied filters When the operator queries Then the system returns an empty list |

**Mockups:**  
<https://www.figma.com/design/BNQK1sOo3nOz3viRCk8LNk/-FE-UI--Incoming-Fiat-Movement--Operator-User-?node-id=11-29393&t=GtLgDc44XyHYYIdD-1> 

---

#### FR-10: Operator List and View Deposits

**Requirement Details**

As a Custody Operator, I want to list and view all deposits across all client accounts so that I can monitor deposit activity platform-wide, assist with client queries, and verify deposit processing.

**Actor:** Custody Operator

**Precondition:** At least one deposit transaction exists in the system.

**Main Flow:**

1. Operator queries the operator deposit list endpoint.
2. System returns a paginated list of all deposit transactions across all accounts (fiat and token), including summary fields and the linked fiat venue where applicable.
3. Operator applies filters: accountId, status, assetId, date range on `createdAt`.
4. Operator selects a specific deposit to view its full detail, including all client-visible fields plus: linked movement venue, depositor name, bank reference~~, and classification history~~.
5. Operator should be able to filter by asset type

**Alternate Flows:**

- No deposits match the applied filters: system returns an empty list.

**Business Rules:**

- The list endpoint is not scoped to a single account — operators see deposits across all accounts.
- `accountId` is an optional filter to narrow results to a specific account.
- Operator detail includes fields not visible to clients: linked incoming movement venue, depositor name, bank reference~~, and classification history~~.
- Supported filters: accountId, status (`processing`, `completed`), assetId, date range (on `createdAt`).
- Results are sorted by `createdAt` descending by default.
- The list endpoint returns summary fields; the detail endpoint returns the full record including operator-only fields.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Operator lists deposits across all accounts | Given deposit transactions exist across multiple client accounts When the operator queries `/deposits` without an `accountId` filter Then the system returns a paginated list of all deposits across all accounts |
| Filter by accountId | Given deposits exist across multiple accounts When the operator filters by a specific `accountId` Then only deposits for that account are returned |
| Filter by status | Given deposits with statuses `processing` and `completed` exist When the operator filters by `status = processing` Then only processing deposits are returned |
| Filter by assetId | Given deposits across multiple asset types exist When the operator filters by a specific `assetId` Then only deposits for that asset are returned |
| Filter by date range | Given deposits across multiple dates exist When the operator filters by `createdAtFrom` and `createdAtTo` Then only deposits created within the specified range are returned |
| Operator detail includes operator-only fields | Given a fiat deposit transaction exists with a linked incoming movement When the operator views the deposit detail Then the response includes venue, depositor name, bank reference~~, and classification history~~ |
| Operator detail includes all client-visible fields | Given a fiat deposit transaction exists When the operator views the deposit detail Then the response also includes transaction ID, type, status, assetId, amount, `createdAt`, and `transactedAt` |
| Empty results | Given no deposits match the applied filters When the operator queries Then the system returns an empty list |
| Default sort is createdAt descending | Given multiple deposits exist When the operator queries without specifying a sort order Then the results are sorted by `createdAt` descending |

**Mockups:**  
<https://www.figma.com/design/Xizb2ZkYYyheVUJwXIycs8/-FE-UI--Deposit-Transaction-2.0--Operator-User-?node-id=8-1099&t=zAK3N8WorzArP9L3-1> 

---

### Section 5: Client Fiat Deposit Visibility

Covers extending the existing unified deposit to include fiat deposits, so clients can see fiat inflows alongside token deposits.

#### FR-11: Fiat Deposits in Unified Deposit

**Requirement Details**

As a Custody Client, I want to see my fiat deposits in the existing unified deposit list so that I have a single view of all deposits across asset types.

**Actor:** Custody Client

**Precondition:** The unified deposit list and detail endpoints already exist and currently display token deposits. A fiat deposit transaction has been created (via FR-6 classification).

**Main Flow:**

1. Client queries the existing unified deposit list on their account via the client API.
2. System includes fiat deposit transactions alongside token deposits in the results.
3. Client selects a fiat deposit to view its details, including: transaction ID, type (`deposit`), status (`processing`, `completed`), asset (fiat currency), amount, `createdAt`, and `transactedAt`.
4. Client should be able to filter by asset type. 

**Alternate Flows:**

- No fiat deposits exist on the account: the unified deposit list shows only token deposits (existing behaviour unchanged).

**Business Rules:**

- Fiat deposits appear in the same unified deposit list as token deposits — no separate endpoint.
- Existing filters (status, asset ID, date range) apply to fiat deposits as well.
- Clients do not see internal details such as the venue, depositor name~~, classification history~~, or operator actions.
- The `expected` balance (set at classification, cleared at confirmation) is visible to the client as a pending inflow indicator on their account balance.
- Clients do not see unlinked movements — only movements linked to a deposit transaction are surfaced in the unified deposit list.

**Acceptance Criteria**

| Scenario | Acceptance Criteria (Gherkin) |
| --- | --- |
| Fiat deposit appears in unified deposit list | Given a fiat deposit transaction exists on a client's account When the client queries the unified deposit list Then the fiat deposit appears alongside token deposits |
| Fiat deposit detail view | Given a fiat deposit transaction exists When the client views its details Then the response includes transaction ID, type `deposit`, status, asset (fiat currency), amount, `createdAt`, and `transactedAt` |
| Internal details hidden from client | Given a fiat deposit transaction exists When the client views its details Then the venue, depositor name~~, classification history~~, and operator actions are not visible |
| Expected balance visible as pending indicator | Given a movement has been classified as `deposit` but not yet confirmed When the client views their account balance Then the `expected` balance is visible as a pending inflow indicator |
| Unlinked movements not visible | Given an incoming movement exists with `classification: unclassified` When the client queries the unified deposit list Then the unlinked movement does not appear |
| No fiat deposits — existing behaviour unchanged | Given no fiat deposits exist on the account When the client queries the unified deposit list Then only token deposits are shown |

**Mockups:**

<https://www.figma.com/design/7PlpSNXaEBw72UbbTLDEXl/-FE-UI--Deposit-Transaction-2.0--Client-?node-id=4-2076&t=a6DPEJam0zEyZdKx-1>

---

## Non-Functional Requirements

### Security

- NFR-1: All maker-checker operations (movement booking FR-5, classification FR-6, account linking FR-4) must enforce that the maker and checker are different operator users. The system must reject approval attempts where `makerId == checkerId`.
- NFR-2: Client API endpoints (FR-11) must enforce account-level authorisation — a client can only query transactions and balances for accounts belonging to their own client entity. Requests for other clients' accounts must return a 403 error without leaking account existence.

### Reliability

- NFR-3: The confirmation journal entry (`DR Deposit Suspense / CR Client Account`) and the expected balance decrement must be applied atomically. If either fails, neither is applied and the movement remains in `detected` status.
- NFR-4: The detection balance update (`DR Venue / CR Deposit Suspense`) must be applied atomically with the movement record persistence. If the balance update fails, the movement is not created.
- NFR-5: The wallet group to venue group migration (FR-1) must be reversible. A rollback path must exist that restores the original wallet group entity name and removes the `assetType` field without data loss.

### Compliance

- NFR-6: The double-entry ledger must maintain the accounting invariant: total debits equal total credits across all accounts at all times. Any operation that would violate this invariant must be rejected by the balance service.

---

## Technical Specifications

### Data Model

#### VenueGroup (migrated from WalletGroup)

Extends the existing WalletGroup entity. Fields marked **(new)** are added by this PRD; all other fields are carried forward from the existing WalletGroup schema.

| Field Name | Non-null | Mutable | Data Type | Field Profile | Description | Rules/Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | Y | — | UUID | `uuid` | System-generated ID | Primary Key. Must be unique. |
| `name` | Y | Y | String | `text_single_line` | Venue group name | Must be unique across all venue groups (regardless of `assetType`). |
| `assetType` **(new)** | Y | — | String | `enum` | Asset type this group supports | Allowed values: `token`, `fiat`, `security`. Immutable after creation. Existing records migrated to `token`. |
| `internalNote` | — | Y | String | `text_single_line` | Internal operator note | — |
| `createdAt` | Y | — | Timestamp | `timestamp_tz` | Creation timestamp | Auto-generated at creation. |
| `createdBy` | Y | — | UUID | `uuid` | Creator user | Auto-generated at creation. |
| `updatedAt` | Y | Y | Timestamp | `timestamp_tz` | Last update timestamp | Auto-updated on creation and any change. |
| `updatedBy` | — | Y | UUID | `uuid` | Last updater user | Auto-updated on any change. |

**Indexes:**

- `idx_venuegroup_name` on `name` — uniqueness enforcement
- `idx_venuegroup_assettype` on `assetType` — filtering by asset type

**Relationships:**

- `VenueGroup.id` → `FiatVenue.venueGroupId` (one-to-many — one venue group has many venues)
- `VenueGroup` ↔ `Account` (many-to-many via `AccountVenueGroupLink` — one account links to multiple venue groups of different asset types; one venue group links to multiple accounts)

---

#### FiatVenue

A bank account held by the custodian where fiat assets are physically held.

| Field Name | Non-null | Mutable | Data Type | Field Profile | Description | Rules/Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | Y | — | UUID | `uuid` | System-generated ID | Primary Key. Must be unique. |
| `name` | Y | Y | String | `text_single_line` | Venue display name | Must be unique across all venues. |
| `venueType` | Y | — | String | `enum` | Type of venue | Allowed values: `bank`. Immutable. |
| `venueGroupId` | Y | — | UUID | `uuid` | Parent venue group | VenueGroup must exist and have `assetType: fiat`. Immutable — set at creation. |
| `bankProvider` | Y | — | String | `enum` | Bank provider identifier | e.g. `dbs`. Used to determine bank-specific behaviour. |
| `details` | Y | Y | JSON | `json` | Bank-specific properties | Structure depends on `bankProvider` (the discriminator). See details schema below. |
| `internalNote` | — | Y | String | `text_single_line` | Internal operator note | — |
| `createdAt` | Y | — | Timestamp | `timestamp_tz` | Creation timestamp | Auto-generated at creation. |
| `createdBy` | Y | — | UUID | `uuid` | Creator user | Auto-generated at creation. |
| `updatedAt` | Y | Y | Timestamp | `timestamp_tz` | Last update timestamp | Auto-updated on creation and any change. |
| `updatedBy` | — | Y | UUID | `uuid` | Last updater user | Auto-updated on any change. |

**Indexes:**

- ~~idx\_fiatvenue\_name on name — uniqueness enforcement~~
- `idx_fiatvenue_venuegroupid` on `venueGroupId` — lookup by venue group

**Relationships:**

- `FiatVenue.venueGroupId` → `VenueGroup.id` (many-to-one)

**FiatVenue **`details`** schema:**

`bankProvider` sits outside `details` because it is the **discriminator** — the system uses it to determine which fields to expect inside `details`. Fields common to all fiat venues are top-level columns; fields specific to a bank provider go inside `details`.

For `bankProvider: dbs`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `bankName` | String | Y | Full legal name of the bank (e.g. "DBS Bank Ltd") |
| `bankAccountName` | String | Y | Name of the bank account as per the bank records |
| `bankAccountNumber` | String | Y | The custodian's bank account number at DBS |
| `beneficiaryName` | String | Y | Name of the owner of the bank account as per bank records |
| `swiftBicCode` | String | Y | SWIFT/BIC code for the bank (e.g. "DBSSSGSG") |
| `bankAddress` | String | — | Bank branch address |

---

#### AccountVenueGroupLink

Join entity linking an account to a venue group. Enforces one venue group per asset type per account.

| Field Name | Non-null | Mutable | Data Type | Field Profile | Description | Rules/Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | Y | — | UUID | `uuid` | System-generated ID | Primary Key. Must be unique. |
| `accountId` | Y | — | UUID | `uuid` | Linked account | Account must exist. |
| `venueGroupId` | Y | — | UUID | `uuid` | Linked venue group | VenueGroup must exist. |
| `createdAt` | Y | — | Timestamp | `timestamp_tz` | Creation timestamp | Auto-generated at creation. |
| `createdBy` | Y | — | UUID | `uuid` | Creator user | Auto-generated at creation. |
| `updatedAt` | Y | Y | Timestamp | `timestamp_tz` | Last update timestamp | Auto-updated on creation and any change. |
| `updatedBy` | — | Y | UUID | `uuid` | Last updater user | Auto-updated on any change. |

**Indexes:**

- `idx_accountvenuegroup_accountid_assettype` unique on (`accountId`, venue group's `assetType`) — enforces one venue group per asset type per account
- `idx_accountvenuegroup_venuegroupid` on `venueGroupId` — lookup by venue group

**Relationships:**

- `AccountVenueGroupLink.accountId` → `Account.id` (many-to-one)
- `AccountVenueGroupLink.venueGroupId` → `VenueGroup.id` (many-to-one)

---

#### IncomingFiatMovement

An incoming fiat movement record representing a bank transfer arriving at a fiat venue. Follows the Movement model from the transaction framework.

| Field Name | Non-null | Mutable | Data Type | Field Profile | Description | Rules/Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | Y | — | UUID | `uuid` | System-generated ID | Primary Key. Must be unique. |
| `venueId` | Y | — | UUID | `uuid` | Fiat venue where the transfer arrived | FiatVenue must exist and have `venueType: bank`. |
| `assetId` | Y | — | UUID | `uuid` | Fiat currency asset | Asset must exist and be a fiat currency. |
| `amount` | Y | — | Decimal | `non_negative_amount` | Transfer amount | Must be \> 0. |
| `direction` | Y | — | String | `enum` | Movement direction | Allowed values: `incoming`. Always `incoming` for this entity. |
| `status` | Y | Y | String | `enum` | Movement status | Allowed values: `detected`, `confirmed`. Default: `detected`. |
| `classification` | Y | Y | String | `enum` | Break resolution classification | Allowed values: `unclassified`, `deposit`. Default: `unclassified`. |
| `transactionId` | — | Y | UUID | `uuid` | Linked deposit transaction | Null when unlinked; set on classification (FR-6). |
| `transactedAt` | Y | — | Timestamp | `timestamp_tz` | Economic effectiveness date (bank value date) | Operator-supplied. Passed to balance service as `value_datetime`. May differ from `createdAt`. |
| `details` | Y | — | JSON | `json` | Fiat-specific movement details | Structure: `{ depositorName: string, bankReference: string }`. |
| `mchRequestId` | — | Y | UUID | `uuid` | Active maker-checker request ID | Set when an MCH request is pending; cleared on resolution. |
| `createdAt` | Y | — | Timestamp | `timestamp_tz` | Creation timestamp (when booked into system) | Auto-generated at creation. |
| `createdBy` | Y | — | UUID | `uuid` | Creator user | Auto-generated at creation. |
| `updatedAt` | Y | Y | Timestamp | `timestamp_tz` | Last update timestamp | Auto-updated on creation and any change. |
| `updatedBy` | — | Y | UUID | `uuid` | Last updater user | Auto-updated on any change. |

**Indexes:**

- `idx_incomingfiatmovement_venue_bankref` unique on (`venueId`, `details->bankReference`) — de-duplication
- `idx_incomingfiatmovement_status_classification` on (`status`, `classification`) — classification queue filtering
- `idx_incomingfiatmovement_transactionid` on `transactionId` — lookup by linked transaction
- `idx_incomingfiatmovement_venueid` on `venueId` — lookup by venue

**Relationships:**

- `IncomingFiatMovement.venueId` → `FiatVenue.id` (many-to-one)
- `IncomingFiatMovement.assetId` → `Asset.id` (many-to-one)
- `IncomingFiatMovement.transactionId` → `UnifiedDeposit.id` (many-to-one, nullable)

---

#### UnifiedDeposit (existing — changes only)

The existing UnifiedDeposit entity requires the following change to support fiat deposits:

| Field Name | Change | Detail |
| --- | --- | --- |
| `originalDepositType` | Add new allowed value | Add `incoming_fiat_movement` to the existing enum. Allowed values become: `token_deposit`, `incoming_fiat_movement`. |

### API Specifications

For API specifications, refer to the OpenAPI spec 

### Error Handling

*Pending review — error codes will be added in a subsequent update.*

### Status Diagram

#### IncomingFiatMovement — `status`

| Status | Operator Label | Client Label | Meaning | Next States | Downstream Logic |
| --- | --- | --- | --- | --- | --- |
| `detected` | Detected | — | Movement observed and booked; pending classification or confirmation | `confirmed` | On entry: `DR Venue / CR Deposit Suspense`. Movement sits in the classification queue. On classify as `deposit`: deposit transaction created at `processing`, `↑ Expected Client Account` applied. |
| `confirmed` | Confirmed | — | Venue finality confirmed; ledger credit applied | — | On entry: `DR Deposit Suspense / CR Client Account`, `↓ Expected Client Account`. Linked deposit transaction transitions to `completed`. |

---

#### UnifiedDeposit (Fiat) — `status`

Movement-led lifecycle only. The deposit transaction is created when an incoming fiat movement is classified as `deposit` (FR-6). It does not pass through `under_review` or `awaiting_client_approval` — those are instruction-led entry points.

| Status | Operator Label | Client Label | Meaning | Next States | Downstream Logic |
| --- | --- | --- | --- | --- | --- |
| `processing` | Processing | Processing | Deposit transaction created; linked movement awaiting confirmation | `completed` | On entry: movement linked, `↑ Expected Client Account` applied. Visible to client as an in-progress deposit. |
| `completed` | Completed | Completed | All movements confirmed; ledger finalised | — | On entry: `DR Deposit Suspense / CR Client Account`, `↓ Expected Client Account`. Client account balance reflects the credited amount. |

---

## Appendix

### Research References

- \[To be added by PM — include relevant research links, competitor analysis, design references\]
