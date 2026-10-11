# PRD \- Phase 1C: Cold Wallet

## About the Document

### List of Personnel

| **Role** | **Name** |
| --- | --- |
| Product Manager | \[TBD\] |
| Tech Lead | \[TBD\] |
| Design | \[TBD\] |
| QA | \[TBD\] |
| Stakeholder | \[TBD\] |

---

## Overview

### Release Note

- Cold wallets are created through the same one step flow already used for hot wallets. The operator supplies a name, a blockchain and a venue group, and the wallet is ready to use.
- Operators no longer register keys, key access groups, key storage facilities or derivation paths, and no longer scan QR codes to sign a transfer.
- Every cold wallet is a shared omnibus wallet. The segregated cold wallet option, and the standard, bespoke and view-only cold wallet variants, are removed.
- Moving assets out of a cold wallet now follows the same outgoing pipeline as every other token venue, so operators work with one set of screens and one status model.

---

### Problem Statement

The cold wallet is the last token venue still running on in-house key management. Creating one takes an operator through a multi step setup: register a key storage facility, register a key access group, register keys with their derivation paths, attach those keys to the wallet with a quorum, then run a separate deploy step that derives the on-chain address. Moving assets out takes an offline signing ceremony in which operators exchange QR codes between the platform and hardware security modules to collect two of three signatures.

This is slow, needs specialised hardware and trained operators, and is a distinct code path from the hot and deposit wallets that already run on the Dfns provider. It also carries variants nobody uses: segregated per-account cold wallets alongside omnibus ones, and standard alongside bespoke cold wallets.

---

### Solution Overview

1. An operator creates a cold wallet by supplying a name, a blockchain and a venue group.
2. The System opens a balance account for the wallet, creates the wallet at Dfns, and records the returned address.
3. The cold wallet appears alongside the other custody venues. Operators list it, view it, edit its label and remarks, and see its balances and movements.
4. When assets leave the cold wallet, an operator approves and submits the outgoing movement in the standard outgoing pipeline, the same way as for a hot wallet.
5. Dfns evaluates the transfer against the policies configured in its own console.
6. When a policy holds the transfer, the nominated approvers decide on it in Dfns, and the platform shows the movement waiting on that policy.
7. When the approvers approve, or when no policy holds the transfer, Dfns signs and broadcasts it, and the platform tracks the execution status Dfns reports.
8. On-chain confirmation confirms the movement, and balances settle through the standard outgoing pipeline.
9. When an approver rejects the transfer, the movement fails and the operator regenerates it in the standard outgoing pipeline.
10. The legacy Gnosis Safe path and its key management entities are removed.

**In scope:**

- Cold wallet creation reuses the hot wallet creation path at Dfns.
- A single cold wallet type. The `standard_cold_wallet`, bespoke and `view_only_cold_wallet` variants, their records and their operator surfaces are removed, and so is the cold wallet type selector.
- Omnibus only cold wallets. A cold wallet belongs to a venue group, it cannot be created against a single account, and the segregated versus omnibus selector is removed.
- Operator management of cold wallets: list, view, edit label and remarks, delete.
- A cold wallet is selectable as the source venue of an outgoing movement and as a leg of a rebalance.
- Incoming movements to a cold wallet (rebalance arrivals) detected through the same on-chain monitoring already used for Dfns hot and deposit wallets.
- Removal of the deploy step that derived a multisig address from registered keys.
- Removal of the other transactions feature, which recorded a manual balance adjustment against a cold wallet.
- Removal of the platform default account that a cold wallet address and a hot wallet address were recorded against, and of the `unified_account_wallet` wallet type.
- Removal of the in-house key management surfaces and their records: keys, key access groups, key storage facilities, cold wallet keys, derivation paths and signing requests, including their operator screens and endpoints.
- Removal of the wallet as a service feature, which derived one address per client and swept those addresses into a central wallet, and of the gas top-up transfers that funded those addresses. Their wallets, derived addresses, sweep tasks, gas records, wallet type values, source and operator surfaces go.
- Hard cutover. Existing cold wallet records and key management records are dropped rather than migrated.

---

### Out of Scope

| **Item** | **Reason** |
| --- | --- |
| External view-only wallet as a custody venue, with manual booking of movements | Delivered in Token Standardisation Phase 1D |
| Sweeping or transferring balances off the existing Gnosis Safe cold wallets | Current cold wallets hold no assets |
| Changes to the outgoing movement lifecycle, execution status tracking, earmark mechanics, mark-as-failed or regeneration | Delivered in Token Standardisation Phase 1B and reused unchanged |
| Configuration of the Dfns approval policies, their approver membership and which transfers they hold | Held in the provider's own console, outside the platform |
| Display of who has approved a held transfer at Dfns and who is still outstanding | The platform tracks only the execution status Dfns reports |
| Database migration of existing cold wallet and key management records | Existing data is pilot and UAT only, so a hard cutover needs no backfill |

---

### Actors

- **Custody Operator:** creates and manages cold wallets, selects a cold wallet as the source venue for an outgoing movement, and approves and submits that movement in the standard outgoing pipeline.
- **Cold Wallet Approver:** a person nominated in a Dfns approval policy. When a policy holds a transfer out of a cold wallet, this person approves or rejects it in the provider's console. A rejection fails the movement.
- **System:** opens the balance account, creates the wallet at Dfns and records its address, submits transfers to Dfns, tracks the execution status from Dfns webhooks, and confirms the movement on on-chain confirmation.
- **Custody Client:** has no direct visibility of cold wallets. Clients see accounts, balances and transactions, and the venue holding their assets is never exposed to them.

---

### Assumptions & Dependencies

- Token Standardisation Phase 1B has shipped. The outgoing movement entity, its execution status tracking from Dfns responses and webhooks, and the rebalance outgoing leg all exist, so this phase supplies a new venue behind an unchanged pipeline.
- Dfns supports a policy that holds a transfer for approval before signing, and reports that hold to the platform as an execution status. Which policies exist, and which transfers they hold, is configured by the operations team in the provider's console. The platform holds no policy configuration of its own.
- Existing cold wallets hold no assets, so no balance moves as part of this change.
- Removing keys and key access groups affects operator user records that reference a key access group. Those references are cleared as part of this change.

---

### Glossary

| **Term** | **Definition** |
| --- | --- |
| Cold wallet | A custody venue holding tokens for long-term storage. |
| Omnibus wallet | A venue that holds assets for many accounts together. Ownership is tracked per account in the ledger, not by a separate wallet per account. |
| Venue group | A logical grouping of venues used for asset segregation. Accounts are linked to a venue group rather than to an individual venue. |
| Dfns | The wallet provider that already backs hot and deposit wallets. Creates wallets, holds transfers for policy approval, signs and broadcasts them, and reports status back by webhook. |
| Execution status | A field on an outgoing movement recording how far Dfns has progressed with the transfer. The platform sets it from the Dfns response and webhooks. |

---

## Functional Requirements

### Section 1: Cold Wallet Provisioning and Management

#### FR-1: \[Operator\] Create a Cold Wallet

**Requirement Details**

As a Custody Operator, I want to create a cold wallet for a venue group and a blockchain so that the platform holds tokens in long-term storage under that venue group.

**Precondition:** The operator is signed in to the Operator Platform and holds the permission to create a cold wallet. At least one active blockchain and one venue group exist.

**Main Flow:**

1. The operator opens the create cold wallet form.
2. The system offers the active blockchains whose supported wallet types include `cold_wallet`.
3. The operator enters a name, selects a blockchain, selects a venue group, and optionally enters an `internalNote`.
4. The operator submits the form (see Validations).
5. The system opens a balance account for the cold wallet under the selected venue group.
6. The system asks Dfns to create a wallet on the selected blockchain under the cold wallet key store, then reads the returned provider wallet identifier and address.
7. The system records the address against the selected blockchain.
8. The system records the cold wallet with its name, blockchain, venue group, address, wallet provider, provider wallet identifier and balance account.
9. The system displays the cold wallet with its name, blockchain, venue group and address.

**Validations:**

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Selected blockchain exists | `RECORD_NOT_FOUND` | The selected blockchain does not exist. |
| Selected blockchain is active | `BLOCKCHAIN_NOT_ACTIVE` | The blockchain is not active. |
| Supported wallet types of the selected blockchain include `cold_wallet` | `INVALID_ASSET_TYPE` | The blockchain does not support cold wallets. |
| Selected venue group exists and is not deleted | `VENUE_GROUP_NOT_FOUND` | The venue group does not exist. |

**Design Constraints:**

- The system writes the balance account, the address record and the cold wallet record in one transaction, so a failure at any step leaves no partial cold wallet and a recorded cold wallet is usable at once.
- The system passes the cold wallet identifier to Dfns as the external reference of the wallet it creates.
- The platform reads the Dfns key store identifiers from configuration and holds two: one for cold wallets, and one that hot wallets and deposit wallets share.
- The create cold wallet call passes the cold wallet key store identifier. The create hot wallet call and the create deposit wallet call both pass the shared hot wallet key store identifier, which the hot wallets and deposit wallets the platform already holds use.
- Dfns holds one key per cold wallet, the same as it holds one key per hot wallet.
- One wallet record and one set of wallet endpoints serve cold wallets and hot wallets, and each record carries the wallet type it holds.

- The balance account of a cold wallet carries `DEBIT` nature.
- The blockchain of a cold wallet is fixed once the wallet is created.
- The blockchain list accepts a supported wallet type filter, and the create cold wallet form, the create hot wallet form and the create deposit wallet form each pass their own wallet type to that filter.

**Audit Log**

**Originating event:** `cold_wallet:create` · **Actor:** `operator`

**NOTE:** Hot wallet and deposit wallet creation writes no audit row today. Add the rows below to those two creation flows as well.

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `cold_wallet:create` (new constant) | `internal_business` | — | `name`, `vendor`, `providerId`, `blockchainId`, `venueGroupId`, `addressId`, `balanceAccountId`, `balanceNature`, `internalNote` | — | `clientIp`, `userAgent`, `browser` |
| `cold_wallet:create` (failure, new constant) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

**Mockups:**  
<https://www.figma.com/design/zOzC5MioQ9t1deERhBeGbg/-FE-UI--Token-Venues--Operator-User-?node-id=56-5388&t=qU2RwXVeLudKvilu-1> 

---

#### FR-2: \[Operator\] List and View Cold Wallets

**Requirement Details**

As a Custody Operator, I want to list cold wallets and open one so that I can see where the platform holds tokens in long-term storage and what each wallet holds.

**Precondition:** The operator is signed in to the Operator Platform and holds the permission to view cold wallets.

**Main Flow:**

1. The operator opens the cold wallet list.
2. The operator applies filters (see Filters) and submits the search.
3. The system returns the matching cold wallets with their name, blockchain, venue group, address and `createdAt`.
4. The operator opens one cold wallet from the list.
5. The system displays the cold wallet detail, adding the `internalNote`, `createdBy`, `updatedBy`, `updatedAt`, the balance held per asset, and the movements recorded against the wallet.

**Filters:**

| **Filter** | **Type** | **Allowed Values** |
| --- | --- | --- |
| Name | text (partial match) | — |
| Blockchains | id reference (multi) | any blockchainId |
| Venue Groups | id reference (multi) | any venueGroupId |
| Address | text (exact match) | — |
| Created At | date range (datetime) | — |

**Mockups:**  
<https://www.figma.com/design/zOzC5MioQ9t1deERhBeGbg/-FE-UI--Token-Venues--Operator-User-?node-id=233-56227&t=qU2RwXVeLudKvilu-1> 

---

#### FR-3: \[Operator\] Edit a Cold Wallet Label and Remarks

**Requirement Details**

As a Custody Operator, I want to edit the name and the `internalNote` of a cold wallet so that the wallet carries the label the operations team recognises.

**Precondition:** The operator is signed in to the Operator Platform and holds the permission to edit a cold wallet.

**Main Flow:**

1. The operator opens a cold wallet and selects the edit action.
2. The operator changes the name, the `internalNote`, or both.
3. The operator submits the edit.
4. The system stores the new values together with `updatedBy` and `updatedAt`.
5. The system displays the cold wallet with its new name and `internalNote`.

**Audit Log**

**Originating event:** `cold_wallet:update` · **Actor:** `operator`

**NOTE:** Hot wallet and deposit wallet update writes no audit row today. Add the rows below to those two update flows as well.

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `cold_wallet:update` (new constant) | `internal_business` | — | `name`, `internalNote` | — | `clientIp`, `userAgent`, `browser` |
| `cold_wallet:update` (failure, new constant) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

MOckups:  
<https://www.figma.com/design/zOzC5MioQ9t1deERhBeGbg/-FE-UI--Token-Venues--Operator-User-?node-id=233-63588&t=qU2RwXVeLudKvilu-1> 

---

### Section 2: Cold Wallet Movements

#### FR-4: \[Operator\] Select a Cold Wallet as a Rebalance Venue

**Requirement Details**

As a Custody Operator, I want to select a cold wallet as the source venue or the destination venue of a rebalance so that I can move assets into and out of long-term storage.

**Precondition:** The operator is signed in to the Operator Platform and holds the permission to create a rebalance. At least one cold wallet exists.

**Main Flow:**

1. The operator opens the create rebalance form and selects the asset and the amount.
2. The operator selects the source venue and the destination venue from the venue lists, which offer the cold wallets alongside the hot and deposit wallets.
3. The operator submits the rebalance for approval (see Validations).
4. A second operator approves the rebalance (see Validations).
5. The system creates the rebalance and its outgoing movement in the standard outgoing pipeline.

**Validations:**

Every check runs at the submission step and again at the approval step, except the available balance check, which runs at the approval step only.

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Selected cold wallet exists and is not deleted | `VENUE_NOT_FOUND` | The selected venue does not exist. |
| Rebalance asset is supported on the blockchain of the selected cold wallet | `INVALID_SOURCE_VENUE` | The selected venue does not accept this asset. |
| Source cold wallet holds sufficient available balance for the rebalance amount | `VENUE_INSUFFICIENT_BALANCE` | Insufficient available balance at the selected venue. |

**Design Constraints:**

- The rebalance creation flow, its approval gate, its earmarks and its expected balance work the same way for a cold wallet venue as for a hot wallet venue.
- Both legs of a rebalance that names a cold wallet run through FR-5.

**Audit Log**

**Originating event:** `mch_request:create` · **Actor:** `operator` (maker)

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `rebalance:create` | `internal_business` | — | `mchRequestId`, `sourceVenueId`, `sourceVenueType`, `destinationVenueId`, `assetId`, `amount`, `idempotencyKey` | — | — |
| `outgoing_movement:create` | `internal_business` | — | `mchRequestId`, `amount`, `assetId`, `venueId`, `classification`, `type`, `kytStatus` | — | — |
| `mch_request:create` (failure, new row) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

**Originating event:** `mch_request:reject` · **Actor:** `operator` (checker)

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `mch_request:reject` | `internal_business` | — | `mchRequestId`, `sourceVenueId`, `destinationVenueId`, `assetId`, `amount`, `idempotencyKey` | — | — |

**Mockups:**  

---

#### FR-5: \[Operator / System\] Move Assets Into and Out of a Cold Wallet

**Requirement Details**

As a Custody Operator, I want an outgoing movement from a cold wallet and an arrival at a cold wallet to run the same path as a hot wallet so that the cold wallet carries no movement handling of its own.

**Precondition:** A cold wallet exists (FR-1). An outgoing movement carries the cold wallet as its source venue, or a rebalance carries it as its destination venue (FR-4).

**Main Flow:**

1. The operator submits the outgoing movement, and the system resolves the cold wallet as a Dfns hosted venue and creates the transfer against its provider wallet.
2. The system records the `externalId` Dfns returns and sets the `executionStatus` from the Dfns webhooks until the transfer reaches a terminal outcome.
3. On an on-chain confirmation the system confirms the movement and settles the balances.
4. On a rejection by a policy approver or a processing failure at Dfns, the system fails the movement and releases the cold wallet earmark.
5. The system detects an arrival at the cold wallet address from the Dfns webhook, creates the incoming movement, and books `DR Venue / CR Deposit Suspense` for the cold wallet, the asset and the amount.
6. When the arrival carries the `txHash` of an open rebalance whose destination venue is the cold wallet, the system classifies the movement `rebalance`, links it to that rebalance, and confirms it.

**Alternate Flows:**

- When no rebalance outgoing leg matches the arrival, the movement stays at `detected` with `classification: unclassified` and waits for an operator to classify it.

**Design Constraints:**

- A cold wallet is an accepted venue kind for an outgoing movement, for both legs of a rebalance, and for an arrival.
- Once the system resolves the cold wallet as a Dfns hosted venue, the rest of each step above keeps the `executionStatus` values, the webhook route, the earmark handling, the failure and regeneration path, the dedup key, the suspense entry and the rebalance match a hot wallet venue already uses.
- The expected venue balance the rebalance outgoing leg applied on the cold wallet clears when the arrival is confirmed.

**Audit Log**

**Originating event:** `outgoing_movement:submit` · **Actor:** `operator`

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `outgoing_movement:submit` | `internal_business` | `amount`, `assetId`, `venueId`, `classification` | `movementId`, `externalId`, `executionStatus` | — | `clientIp`, `userAgent`, `browser` |
| `outgoing_movement:submit` (failure) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

**Originating event:** `outgoing_movement:update_execution_status` · **Actor:** `system_user`

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `outgoing_movement:update_execution_status` | `internal_business` | `amount`, `assetId`, `venueId`, `classification` | `movementId`, `executionStatus`, `txHash` | — | — |
| `outgoing_movement:fail` (only when the reported execution status is `failed` or `rejected`) | `internal_business` | `amount`, `assetId`, `venueId`, `classification` | `movementId` | — | — |
| `outgoing_movement:update_execution_status` (failure) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

**Originating event:** `outgoing_movement:confirm` · **Actor:** `system_user`

Withdrawal from a cold wallet:

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `outgoing_movement:confirm` | `internal_business` | `amount`, `assetId`, `venueId`, `classification` | — | — | — |
| `unified_withdrawal:complete` | `external_business` | `amount`, `assetId`, `accountId` | — | — | — |
| `outgoing_movement:confirm` (failure) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

Rebalance outgoing leg from a cold wallet:

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `outgoing_movement:confirm` | `internal_business` | `amount`, `assetId`, `venueId`, `classification` | — | — | — |
| `unified_rebalance:complete` (only when the arrival leg is already confirmed) | `internal_business` | — | `rebalanceId`, `movementId` | — | — |
| `outgoing_movement:confirm` (failure) | `internal_business` | — | `type`, `code` | — | `code`, `message` |

**Originating event:** `incoming_movement:detect` · **Actor:** `system_user`

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `incoming_movement:detect` | `internal_business` | — | `venueId`, `venueKind`, `assetId`, `amount`, `type`, `status`, `classification`, `transactedAt`, `details`, `idempotencyKey` | — | — |
| `incoming_movement:detect` (failure) | `internal_business` | — | `errorCode`, `errorMessage`, `movement` | — | — |

**Originating event:** `incoming_movement:classify` · **Actor:** `system_user` (auto-match)

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `incoming_movement:classify` (new row) | `internal_business` | — | `venueId`, `assetId`, `amount`, `classification`, `transactionId`, `kytStatus`, `travelRuleStatus` | — | — |

**Originating event:** `incoming_movement:confirm` · **Actor:** `system_user`

| **Operation** | **Scope** | `externalMetadata` | `internalMetadata` | `externalSecurityMetadata` | `internalSecurityMetadata` |
| --- | --- | --- | --- | --- | --- |
| `incoming_movement:confirm` (new row) | `internal_business` | — | `venueId`, `assetId`, `amount`, `status`, `transactionId`, `transactedAt` | — | — |
| `unified_rebalance:complete` (only when the outgoing leg is already confirmed) | `internal_business` | — | `rebalanceId`, `movementId` | — | — |
| `incoming_movement:confirm` (failure) | `internal_business` | — | `errorCode`, `errorMessage`, `movement` | — | — |

---

### Section 3: Legacy Cold Wallet, Key Management and Unused Wallet Retirement

#### FR-6: \[Developer\] Remove the Legacy Cold Wallet Types and Records

**Requirement Details**

As a Developer, I want to delete the legacy cold wallet records and collapse the cold wallet type and segregation options into one so that every cold wallet is a single Dfns backed omnibus venue.

**Precondition:** The Dfns backed cold wallet creation path is live (FR-1). The cold wallet records the platform holds were created for pilot and user acceptance testing, and no client holds a balance in one.

**Main Flow:**

1. The developer deletes every cold wallet record together with its address record and its balance account.
2. The developer removes the addresses of those cold wallets from on-chain monitoring.
3. The developer rewrites the supported wallet types of every blockchain and every asset, replacing `standard_cold_wallet`, `bespoke_cold_wallet` and `view_only_cold_wallet` with `cold_wallet` (FR-1).
4. The developer removes the translation that presented the legacy cold wallet values to client users as one `cold_wallet` value.
5. The developer removes the view-only cold wallet screens and their endpoints from the Operator Platform.
6. The developer removes the account reference that marked a cold wallet as segregated, so a cold wallet carries a venue group only.
7. The developer removes the cold wallet type selector and the segregated versus omnibus selector from the cold wallet creation and list surfaces.
8. The developer removes the omnibus filter from the cold wallet list.
9. The developer deletes the other transaction records, each of which held a manual balance adjustment recorded against a cold wallet.
10. The developer removes the other transaction endpoints, their service and their operator screens.

**Design Constraints:**

- A blockchain or an asset that carried more than one legacy cold wallet value carries `cold_wallet` once after the rewrite.
- A client user reading a blockchain or an asset sees one `cold_wallet` value before and after the rewrite.

---

#### FR-7: \[Developer\] Remove the Key Management Records and the Signing Ceremony

**Requirement Details**

As a Developer, I want to delete the key management records and remove the offline signing ceremony so that Dfns alone signs a transfer out of a cold wallet.

**Precondition:** The legacy cold wallet records are deleted (FR-6). Outgoing movements from a cold wallet run through Dfns (FR-5).

**Main Flow:**

1. The developer deletes the key, key access group, key storage facility and cold wallet key records, each of which carries the derivation path, the public key and the storage facility of one registered key.
2. The developer clears the key access group reference on every operator user record that holds one.
3. The developer removes the two quorum fields from the cold wallet record.
4. The developer removes the status field from the cold wallet record (FR-1).
5. The developer removes the key registration, key access group, key storage facility and key ceremony screens and their endpoints from the Operator Platform.
6. The developer removes the key related validation errors from the cold wallet creation and update paths.

**Design Constraints:**

- Clearing the key access group reference leaves the rest of the operator user record and the operator's other permissions unchanged.

---

#### FR-8: \[Developer\] Remove the Signing Request Flow from the Withdrawal Path

**Requirement Details**

As a Developer, I want to delete the signing request records and remove the actions that served them so that no path builds an unsigned transaction or waits for an offline signature.

**Precondition:** The key management records and the signing ceremony are removed (FR-7). Outgoing movements from a cold wallet run through Dfns (FR-5). No withdrawal in a non-terminal status holds a signing request.

**Main Flow:**

1. The developer deletes the signing request records together with the link each one holds to a withdrawal.
2. The developer removes the actions that listed a signing request, read one, marked one ready to sign, and recorded a returned signature, together with their endpoints.
3. The developer removes the action that derived a cold wallet address from the registered keys, so no path calls the address derivation service.
4. The developer removes the signing request screens and the QR code surfaces from the Operator Platform.
5. The developer removes the signing request status values.

**Design Constraints:**

- The execution status values an outgoing movement holds are unchanged by the removal, because a signing request never set one (FR-5).
- The withdrawal status values are unchanged by the removal.

---

#### FR-9: \[Developer\] Remove the Wallet as a Service, Sweep and Gas Top-Up Feature

**Requirement Details**

As a Developer, I want to remove the wallet as a service, sweep and gas top-up code and delete their wallet type values so that the platform holds tokens in cold, hot and deposit wallets only.

**Precondition:** The platform holds no wallet as a service wallet, derived address, sweep deposit, sweep task, gas request, gas top-up or gas balance record.

**Main Flow:**

1. The developer removes the scheduled sweep job that generated a sweep task from pending deposits, reserved gas for it and raised a gas top-up withdrawal.
2. The developer removes the sweep deposit, sweep task, gas request, gas top-up and gas balance code, together with the `pending_sweep` deposit status.
3. The developer removes the withdrawal branch that resolved a wallet as a service derived address, so a withdrawal resolves a cold, hot or deposit wallet only.
4. The developer removes the withdrawal side effect that marked a sweep task or a gas top-up as received when a withdrawal arrived on chain.
5. The developer removes the wallet as a service endpoints: create a wallet, list wallets, add a supported blockchain, add a derived address, and list derived addresses.
6. The developer removes the wallet as a service screens from the Operator Platform.
7. The developer removes `waas` and `gas_tank` from the wallet types the platform accepts, leaving `cold_wallet`, `hot_wallet` and `deposit_wallet` (FR-1).
8. The developer removes `waas` and `gas_tank` from the wallet type filters and columns on the withdrawal and movement list surfaces.

**Design Constraints:**

- A deposit wallet is a separate venue and is unchanged by the removal. It keeps its own address, balance account and venue group.

---

#### FR-10: \[Developer\] Remove the Default Account and the Unified Account Wallet Type

**Requirement Details**

As a Developer, I want to remove the default account and the `unified_account_wallet` wallet type so that a platform owned wallet address carries no account and the wallet types hold only the kinds the platform uses.

**Precondition:** The legacy cold wallet records are deleted (FR-6). No path reads the `unified_account_wallet` wallet type.

**Main Flow:**

1. The developer removes the default account lookup from the cold wallet creation path and the hot wallet creation path, so the address of a cold wallet and the address of a hot wallet carry no account.
2. The developer removes the default account configuration value.
3. The developer removes `unified_account_wallet` from the wallet types the platform accepts.
4. The developer removes `unified_account_wallet` from the supported wallet types of every blockchain record and every asset record.
5. The developer removes `unified_account_wallet` from the wallet type filters on the blockchain endpoints and the asset endpoints.

**Design Constraints:**

- A deposit wallet address keeps the account of the client the wallet was issued to.
- After this removal and the removal of `waas` and `gas_tank` (FR-9), the wallet types the platform accepts are `cold_wallet`, `hot_wallet` and `deposit_wallet`.

---

## Non-Functional Requirements

N/A

---

## Technical Specifications

### Data Model

#### ColdWallet Data Model

> Existing model. Only the fields this PRD adds or changes are listed. The cold wallet record and the hot wallet record merge into one wallet record carrying a wallet type field (FR-1).

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New | `vendor` | Y | — | — | enum | `enum` | Wallet provider holding the wallet. `vendor: dfns` | — |
| New | `providerId` | Y | — | — | alphanumeric | `alphanumeric` | Wallet identifier Dfns returns at creation | Unique |
| Changed | `venueGroupId` | Y | — | — | uuid | `uuid` | FK → VenueGroup, the venue group the wallet belongs to | Was optional |
| Changed | `balanceAccountId` | Y | — | — | uuid | `uuid` | FK → balance account opened for the wallet | Unique. Was optional |
| Changed | `balanceNature` | Y | — | — | enum | `enum` | Accounting nature of the balance account. `balanceNature: DEBIT` | Was `CREDIT` |
| Changed | `internalNote` | — | Y | — | text | `text_multi_line` | Operator note on the wallet | Renamed from `remarks` |
| Changed | `walletType` | Y | — | — | enum | `enum` | Wallet kind the record holds: `cold_wallet` \| `hot_wallet` | Legacy cold wallet values removed by FR-6 |
| Removed | `accountId` | — | — | — | uuid | `uuid` | Held the account a segregated cold wallet was bound to | Removed by FR-6 |
| Removed | `status` | — | — | — | enum | `enum` | Held the provisioning status of the wallet | Removed by FR-7 |
| Removed | `mQuorum` | — | — | — | integer | `non_negative_amount` | Held the number of signatures a transfer required | Removed by FR-7 |
| Removed | `nQuorum` | — | — | — | integer | `non_negative_amount` | Held the number of registered keys | Removed by FR-7 |

#### Blockchain Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Changed | `supportedWalletTypes` | Y | Y | Y | enum\[\] | `enum` | Wallet types the blockchain supports: `cold_wallet` \| `hot_wallet` \| `deposit_wallet` | `standard_cold_wallet`, `bespoke_cold_wallet` and `view_only_cold_wallet` collapse to `cold_wallet`; `waas` and `gas_tank` removed (FR-9); `unified_account_wallet` removed (FR-10); each value appears once |

#### Asset Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Changed | `supportedWalletTypes` | Y | Y | Y | enum\[\] | `enum` | Wallet types that hold the asset: `cold_wallet` \| `hot_wallet` \| `deposit_wallet` | `standard_cold_wallet`, `bespoke_cold_wallet` and `view_only_cold_wallet` replaced by `cold_wallet`; `waas` and `gas_tank` removed (FR-9); `unified_account_wallet` removed (FR-10); each value appears at most once |

#### OutgoingMovement Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Changed | `venueKind` | Y | — | — | varchar | `enum` | Kind of the source venue the movement leaves, discriminating the `venueId` FK target. Values: `cold_wallet`, `hot_wallet`, `deposit_wallet`, `standard_venue`. | Adds `cold_wallet` (FR-4, FR-5). Drops `waas` and `gas_tank` (FR-9). |

#### IncomingMovement Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Changed | `venueId` | Y | — | — | uuid | `uuid` | FK → Venue. Custody venue at which the asset arrived. | Accepted venue wallet types: `cold_wallet`, `hot_wallet`, `deposit_wallet` (FR-5); `cold_wallet` added |

#### Rebalance Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Changed | `sourceVenueType` | Y | Y | — | enum | `enum` | Venue kind holding `sourceVenueId`: `cold_wallet` \| `hot_wallet` \| `deposit_wallet` | `cold_wallet` added; `waas` and `gas_tank` removed. Venue must accept the rebalance asset |
| Changed | `destinationVenueType` | Y | — | — | enum | `enum` | Venue kind holding `destinationVenueId`: `cold_wallet` \| `hot_wallet` \| `deposit_wallet` | `cold_wallet` added; `waas` and `gas_tank` removed. Venue must accept the rebalance asset |

**Relationships:**

- `Rebalance.sourceVenueId` → `ColdWallet.id` (many-to-one; when `sourceVenueType` is `cold_wallet`)
- `Rebalance.destinationVenueId` → `ColdWallet.id` (many-to-one; when `destinationVenueType` is `cold_wallet`)

#### Withdrawal Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| **Change** | **Field Name** | **Non-null** | **Mutable** | **Client Visible** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Changed | `walletType` | Y | — | — | enum | `enum` | Wallet the withdrawal resolves: `cold_wallet` \| `hot_wallet` \| `deposit_wallet` | `waas` and `gas_tank` removed from the allowed values (FR-9) |
| Changed | `unsignedTx` | — | — | — | text | `text_multi_line` | Unsigned transaction built for the offline signing ceremony | No path writes it (FR-8). 🚩 **REVISIT:** Confirm whether the column is dropped with the signing request records or kept for the withdrawals that already hold one |

---

### Status Diagram

N/A

---

### API Specifications

For API specifications, refer to the OpenAPI spec on Apidog.

---

### Error Handling

N/A

---

## Appendix

### Research References

- \[To be added by PM — include relevant research links, competitor analysis, design references\]
