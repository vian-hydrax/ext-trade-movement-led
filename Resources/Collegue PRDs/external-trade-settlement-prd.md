
## About the Document

### List of Personnel
| Role | Name |
| :--- | :--- |
| Product Manager | [TBD] |
| Tech Lead | [TBD] |
| Design | [TBD] |
| QA | [TBD] |
| Stakeholder | [TBD] |

---

## Overview

### Release Note
- Operators can manually complete external settlements in the Settlement Instruction workflow.
- Operators can add external counterparties and settlement details for token and fiat transfers.

---

### Problem Statement
Settlement Instructions only record transfers between Wallet accounts. Operators cannot include an external counterparty or its settlement details. Operators must track external receipts and deliveries outside Wallet. As a result, Wallet can credit a client before it receives the asset. Wallet can also deliver an asset externally before it receives the asset from the client.

---

### Solution Overview
1. An operator adds an external counterparty account and its settlement details.
2. An operator creates a Settlement Instruction with token or fiat legs, a settlement date, and an internal account or external counterparty account on each leg.
3. On the settlement date, the system creates obligations for the Settlement Instruction legs.
4. After all account owners approve their obligations, an operator submits the Settlement Instruction for operator maker-checker approval.
5. After an operator approves the Settlement Instruction, an operator processes the obligations for that date and manually completes the external receipt or delivery.
6. An operator classifies an incoming Movement as an external settlement or creates an outgoing withdrawal, then manually links the Movement to the Settlement Instruction.

**In scope:**
- Add an external counterparty account with a counterparty type.
- Extend Settlement Instructions so an operator can add a token or fiat leg with a settlement date.
- Allow an operator to select an external counterparty account as the source or destination of a Settlement Instruction leg.
- Allow an operator to select an unknown amount when setting up a Settlement Instruction leg and enter the amount on its obligation.
- Create obligations for Settlement Instruction legs based on the settlement date.
- Provide a Process action that an operator runs for obligations on a selected settlement date.
- Allow an operator to classify an incoming Movement as an external settlement.
- Reuse withdrawals for outgoing Movements.
- Allow an operator to manually link an incoming or outgoing Movement to an obligation when the Movement comes from or goes to the obligated account and has the obligated amount.
- Allow an operator to flag a House Account as permitted to have a negative balance for all assets.

---

### Out of Scope

| Item | Reason |
| :--- | :--- |
| Failed Movement handling, overdue obligations, and close-out | Deferred to Phase 2 |
| Automated obligation creation, Movement creation or matching, and internal posting | Deferred to Phase 3 |
| Automated external settlement processing | Operators complete external settlement manually in Phase 1 |
| Securities delivery versus payment | Deferred for later review |
| Override of an outgoing Movement | Deferred to Phase 2 |
| Settlement-fail and overdue flags in a reconciliation dashboard | Deferred to Phase 2 |
| Aggregation of obligations across Settlement Instructions | Deferred to Phase 3 |
| Partial allocation of an aggregated Movement | Deferred to Phase 3 |

---

### Actors
- **Operator**: Adds external counterparty accounts and settlement details, creates Settlement Instructions, processes daily obligations, completes external settlement by hand, and links Movements to Settlement Instructions.
- **Account owner**: Approves the obligation for their account before the settlement can proceed.
- **External counterparty**: Receives from or delivers assets to Wallet through an external route.
- **Wallet**: Creates obligations, records linked Movements, and shows pending or unsettled obligations.

---

### Assumptions & Dependencies
- **Assumed to exist:**
   - Unified Accounts and House Accounts for the internal sides of Settlement Instruction legs.
   - Account-owner approval authority for Settlement Instructions.
- **Exists, we are changing it:**
   - Settlement Instructions, including transfer legs and obligations.
   - Withdrawal workflows for outgoing Movements.
   - Incoming Movement workflows.
- **Does not exist, we are building it:**
   - An external counterparty account with a counterparty type.
   - Settlement details for an external counterparty account.
   - Settlement Instruction links to incoming and outgoing Movements.
   - A daily Process action for obligations.
   - A House Account setting that permits a negative balance.

---

### Glossary
| Term | Definition |
| :--- | :--- |
| Settlement Instruction | A record that groups one or more asset transfer legs and their approvals. |
| Transfer leg | One intended transfer of an asset between an internal account and another internal account or an external counterparty account. |
| External counterparty account | A record for a broker, fund, issuer, custodian, bank, or other party outside Wallet that sends or receives an asset. |
| Settlement details | Details that identify how an external counterparty account sends or receives an asset. |
| Obligation | A required receipt or delivery created from a Settlement Instruction leg. |
| Incoming Movement | An asset receipt into Wallet. |
| Outgoing Movement | An asset delivery from Wallet through a withdrawal. |
| House Account | A Wallet account that holds operator inventory for settlement. |

---

## Functional Requirements

## FR-1: [Operator] Create an External Counterparty

**Requirement Details:** As an Operator, when an external party will send or receive an asset for a settlement, I want to create an external counterparty so that I can select the external party on a Settlement Instruction leg.

**Preconditions:** The operator has logged in to the operator platform.

**Fields**

| Field | Format or Sample | Meaning | How it is obtained | How it is verified |
| :--- | :--- | :--- | :--- | :--- |
| Name | `Fundbridge` | External party name | Operator enters the name | 🚩 The platform cannot verify the name from the available source material. |
| Counterparty type | `broker`, `custodian`, `bank`, `exchange`, or `other` | External party category | Operator selects a type | The system checks that the value is an allowed type. |
| Internal notes | Optional free text | Internal counterparty notes | Operator enters the notes | The platform cannot verify the notes. |

**Main Flow**

1. The operator enters the external counterparty fields and submits the counterparty for approval, see Validations.
2. The system stores the external counterparty with a pending operator approval state.
3. A different operator approves the external counterparty, see Validations.
4. The system activates the external counterparty.

**Validations**

| Code | Rule | User-facing message | When checked |
| :--- | :--- | :--- | :--- |
| EXTERNAL_COUNTERPARTY_SELF_APPROVAL | The approver must differ from the operator who submitted the external counterparty. | A different operator must approve the external counterparty. | Approval |
| EXTERNAL_COUNTERPARTY_NOT_ACTIVE | The external counterparty must be active before an operator selects it on a Settlement Instruction leg. | Activate the external counterparty before selecting it. | Settlement Instruction leg submission and approval |

**Design Constraints**

- The system applies the existing maker-checker process to the external counterparty.
- The system supports activation, disabling, and closure for the external counterparty.
- The external counterparty does not hold balances or link to VenueGroups.
- An incoming settlement transfers assets to an omnibus wallet or a client deposit wallet.
- The operator manually links each incoming Movement to its Settlement Instruction and obligation.

## FR-2: [Operator] Add an External Counterparty to a Settlement Instruction Leg

**Requirement Details:** As an Operator, when I create a token or fiat Settlement Instruction leg, I want to select an external counterparty as the source or destination, enter a settlement date, and select a known or unknown amount so that each transfer leg can settle on its required date and the operator can enter an unknown amount after confirmation.

**Preconditions:** The external counterparty is active.

**Fields**

| Field | Format or Sample | Meaning | How it is obtained | How it is verified |
| :--- | :--- | :--- | :--- | :--- |
| Source | Internal account or external counterparty | Party that delivers the asset | Operator selects an endpoint | The system checks that the selected record exists and is active. |
| Destination | Internal account or external counterparty | Party that receives the asset | Operator selects an endpoint | The system checks that the selected record exists and is active. |
| Asset | Supported token or fiat asset | Asset on the transfer leg | Operator selects an asset | The system checks that Wallet supports the asset. |
| Amount type | `Known` or `Unknown` | Whether the transfer-leg amount is known during setup | Operator selects a value | The system checks that the value is allowed. |
| Amount | Exact decimal at the asset precision | Transfer amount for a known amount leg | Operator enters the amount | The system checks that the amount matches the asset precision. |
| Settlement date | `2026-10-01` | Date when the obligation settles | Operator enters the date | The system checks that the date is valid. |
| External reference | Operator-entered reference | Reference for the external settlement | Operator enters the reference | The system does not verify the reference. |
| Internal notes | Operator-entered text | Internal notes for the external settlement | Operator enters the internal notes | The system does not verify the internal notes. |

**Main Flow**

1. The operator inputs a transfer leg on a Settlement Instruction.
2. The operator selects the source and destination accounts, see Validations.
3. The operator selects the asset, see Validations.
4. The operator enters the settlement date, see Validations.
5. The operator selects the amount type, see Validations.
6. When the operator selects `Known`, the operator enters the amount, see Validations.
7. The operator enters the external reference and remarks.
8. The system saves the transfer leg, see Validations.

**Validations**

| Code | Rule | User-facing message | When checked |
| :--- | :--- | :--- | :--- |
| SETTLEMENT_LEG_ENDPOINT_INVALID | Each leg endpoint must be an active internal account or an active external counterparty. | Select an active account or external counterparty. | Submission |
| SETTLEMENT_LEG_ENDPOINTS_MATCH | The source and destination must differ. | Select different source and destination accounts. | Submission |
| SETTLEMENT_DATE_INVALID | The settlement date must be the current calendar date. | Select today's date. | Submission |
| SETTLEMENT_LEG_AMOUNT_TYPE_INVALID | The amount type must be Known or Unknown. | Select a valid amount type. | Submission |
| SETTLEMENT_LEG_AMOUNT_REQUIRED | A known amount leg must include an amount. | Enter an amount for the transfer leg. | Submission |
| SETTLEMENT_LEG_AMOUNT_NOT_ALLOWED | An unknown amount leg must not include an amount. | Remove the amount or select Known. | Submission |
| SETTLEMENT_LEG_AMOUNT_INVALID | The amount must be greater than zero and must match the asset precision. | Enter an amount greater than zero at the asset precision. | Submission |

**Design Constraints**

- The system extends Settlement Instructions by allowing an external counterparty as the source or destination.
- The system records a settlement date on each transfer leg because obligations can settle on different dates.
- The system allows a transfer-leg amount to remain unknown until the operator enters the amount on its obligation after confirmation.
- A Settlement Instruction can include more than one transfer leg with the same asset, settlement date, source, and destination.

## FR-3: [Operator] Create Obligations for an Approved Settlement Instruction

**Requirement Details:** As an operator, when all required parties and the operator checker approve a Settlement Instruction, I want the system to create obligations for its transfer legs so that I can process the obligations on their settlement dates.

**Preconditions:** The Settlement Instruction contains the transfer leg. All required parties have approved the Settlement Instruction. The operator checker has approved the Settlement Instruction.

**Main Flow**

1. When the Settlement Instruction receives all required approvals, the system records each transfer leg and its settlement date.
2. The system creates obligations for the recorded transfer legs.
3. When the transfer leg has a known amount, the system copies the leg amount to the obligation.
4. When the transfer leg has an unknown amount, the system creates the obligation without an amount.

**Design Constraints**

- The system groups created obligations by the settlement date entered on each transfer leg.
- The system keeps each created obligation pending until its settlement date.
- The system uses the existing earmark and reserved-balance process for created obligations.

## FR-4: [Operator] Enter an Unknown Obligation Amount

**Requirement Details:** As an Operator, when an incoming Movement is complete for an obligation with an unknown amount, I want to enter the obligation amount so that the system can mark the obligation as settled.

**Preconditions:** The obligation has no amount. The incoming Movement is complete. The obligation is not settled.

**Fields**

| Field | Format or Sample | Meaning | How it is obtained | How it is verified |
| :--- | :--- | :--- | :--- | :--- |
| Amount | Exact decimal at the asset precision | Amount that the obligation requires | Operator enters the amount | The system checks that the amount is greater than zero and matches the asset precision. |

**Main Flow**

1. The operator enters the obligation amount, see Validations.
2. The system stores the amount on the obligation.

**Validations**

| Code | Rule | User-facing message | When checked |
| :--- | :--- | :--- | :--- |
| OBLIGATION_AMOUNT_NOT_REQUIRED | The obligation must have an unknown amount before the operator can enter an amount. | The obligation already has an amount. | Submission |
| OBLIGATION_AMOUNT_INVALID | The amount must be greater than zero and must match the asset precision. | Enter an amount greater than zero at the asset precision. | Submission |

## FR-5: [Operator] Process Obligations for a Settlement Date

**Requirement Details:** As an Operator, when a Settlement Instruction has account-owner approval and operator maker-checker approval, I want to process its obligations separately by settlement date so that I can complete the external settlement manually.

**Preconditions:** The Settlement Instruction has account-owner approval. The Settlement Instruction has operator maker-checker approval.

**Fields**

| Field | Format or Sample | Meaning | How it is obtained | How it is verified |
| :--- | :--- | :--- | :--- | :--- |
| Settlement date | `2026-10-01` | Date of obligations to process | Operator selects a date | The system checks that the date is valid. |

**Main Flow**

1. The operator selects a settlement date and starts Process, see Validations.
2. The system displays the Settlement Instruction obligations due on the selected date.
3. When an obligation requires an incoming Movement, the operator manually links the incoming Movement to the obligation.
4. When an obligation requires an outgoing Movement, the system starts the withdrawal workflow for the obligation.
5. When the operator completes the withdrawal workflow, the system creates the outgoing Movement.

**Validations**

| Code | Rule | User-facing message | When checked |
| :--- | :--- | :--- | :--- |
| SETTLEMENT_INSTRUCTION_NOT_APPROVED | The Settlement Instruction must have account-owner approval and operator maker-checker approval. | Approve the Settlement Instruction before processing obligations. | Process |
| SETTLEMENT_DATE_INVALID | The settlement date must be a valid calendar date. | Enter a valid settlement date. | Process |

**Design Constraints**

- The Process action applies only to obligations on the selected settlement date.
- Each obligation has a `pending` or `completed` status.
- The system sets an obligation to `completed` when the linked Movement matches the obligation.
- The Settlement Instruction follows its existing status lifecycle.

## FR-6: [Operator] Classify an Incoming Movement as an External Settlement

**Requirement Details:** As an Operator, when Wallet records an incoming Movement for an external settlement, I want to classify the Movement as an external settlement so that I can link it to the obligation it settles.

**Preconditions:** The incoming Movement exists.

**Main Flow**

1. The operator selects an incoming Movement, a Settlement Instruction, and an obligation, see Validations.
2. The operator classifies the Movement as an external settlement.
3. The system records the external settlement classification and links the Movement to the selected obligation.

**Validations**

| Code | Rule | User-facing message | When checked |
| :--- | :--- | :--- | :--- |
| OBLIGATION_NOT_FOUND | The selected obligation must belong to the selected Settlement Instruction. | Select an obligation from the selected Settlement Instruction. | Submission |
| OBLIGATION_AMOUNT_REQUIRED | The obligation must have an amount before the operator links a Movement. | Enter the obligation amount before linking a Movement. | Submission |

## FR-7: [Operator] Link a Movement to an Obligation

**Requirement Details:** As an Operator, when an incoming or outgoing Movement is not linked to an obligation, I want to link the Movement to the obligation so that the system records the settlement evidence.

**Preconditions:** The obligation is available for processing. The Movement exists.

**Main Flow**

1. The operator selects an incoming or outgoing Movement and an obligation, see Validations.
2. The system checks the Movement against the obligation, see Validations.
3. The system links the Movement to the obligation.

**Validations**

| Code | Rule | User-facing message | When checked |
| :--- | :--- | :--- | :--- |
| MOVEMENT_DIRECTION_MISMATCH | An incoming Movement can link only to a receive obligation, and an outgoing Movement can link only to a delivery obligation. | Select a Movement with the required direction. | Submission |
| OBLIGATION_AMOUNT_REQUIRED | The obligation must have an amount before the operator links a Movement. | Enter the obligation amount before linking a Movement. | Submission |

**Design Constraints**

- The system must retain the Movement link on the obligation and the Settlement Instruction link through the obligation.
- An operator can link more than one Movement to an obligation.

## FR-8: [System] Permit a House Account to Have a Negative Balance

**Requirement Details:** As an Operator, when a House Account must reserve more assets than it holds for a settlement, I want to permit the House Account to have a negative available balance so that Wallet can create the required reservation for any asset.

**Preconditions:** The account is a House Account. The operator has permission to manage House Account settings.

**Main Flow**

1. The operator enables or disables the House Account permission to have a negative balance.
2. The system applies the selected permission to all assets in the House Account.

**Design Constraints**

- When the permission is enabled, the House Account can have a negative total balance, reserved balance, available balance, and expected balance for any asset.
- The backend identifies House Accounts through a configuration flag or whitelist.
- The backend configuration applies to requests for House Accounts.

---

## Non-Functional Requirements
N/A

---

## Technical Specifications

### Data Model
#### ExternalCounterparty Data Model

> Includes standard system fields: `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. These are not repeated in the table below.

| Field Name | Non-null | Mutable | Client Visible | Data Type | Field Profile | Description | Rules/Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | Y | Y | Y | string | `name_normalized` | External party name | Operator-provided value is not externally verified |
| `counterpartyType` | Y | Y | Y | enum | `enum` | counterpartyType: broker \| custodian \| bank \| exchange \| other | Allowed values only |
| `internalNotes` | — | Y | — | string | `text_multi_line` | Internal counterparty notes | Operator-provided value is not externally verified |

**Relationships:**
- `ExternalCounterparty.id` → `SettlementInstructionLeg.fromCounterpartyId` (one-to-many)
- `ExternalCounterparty.id` → `SettlementInstructionLeg.toCounterpartyId` (one-to-many)

#### SettlementInstructionLeg Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| Change | Field Name | Non-null | Mutable | Client Visible | Data Type | Field Profile | Description | Rules/Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| New | `fromCounterpartyId` | — | Y | Y | uuid | `uuid` | External source reference | Active external counterparty when present |
| New | `toCounterpartyId` | — | Y | Y | uuid | `uuid` | External destination reference | Active external counterparty when present |
| New | `settlementDate` | Y | Y | Y | date | `timestamp_tz` | Date when the obligation settles | Current calendar date at transfer-leg submission |
| New | `amountType` | Y | Y | Y | enum | `enum` | amountType: known \| unknown | `amount` required for `known` and absent for `unknown` |
| Changed | `amount` | — | Y | Y | decimal | `non_negative_amount` | Transfer amount | Greater than zero at the asset precision when `amountType` is `known` |
| Existing | `externalRef` | — | Y | Y | string | `alphanumeric` | External settlement reference | Operator-provided value is not externally verified |
| Existing | `remarks` | — | Y | Y | string | `text_multi_line` | External settlement remarks | Operator-provided value is not externally verified |

**Indexes:**
- `idx_settlement_instruction_leg_settlement_date` on `settlementDate`, obligation creation and processing by settlement date

**Relationships:**
- `SettlementInstructionLeg.fromCounterpartyId` → `ExternalCounterparty.id` (many-to-one when the source is external)
- `SettlementInstructionLeg.toCounterpartyId` → `ExternalCounterparty.id` (many-to-one when the destination is external)

#### SettlementInstructionObligation Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| Change | Field Name | Non-null | Mutable | Client Visible | Data Type | Field Profile | Description | Rules/Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| New | `settlementInstructionLegId` | Y | — | Y | uuid | `uuid` | Source transfer-leg reference | — |
| New | `accountId` | Y | — | Y | uuid | `uuid` | Account that receives or delivers the asset | — |
| New | `assetId` | Y | — | Y | uuid | `uuid` | Asset on the obligation | — |
| New | `direction` | Y | — | Y | enum | `enum` | direction: receive \| deliver | Derived from the account position on the transfer leg |
| New | `settlementDate` | Y | — | Y | date | `timestamp_tz` | Settlement date from the transfer leg | Copied from `SettlementInstructionLeg.settlementDate` |
| New | `amount` | — | Y | Y | decimal | `non_negative_amount` | Obligation amount | Greater than zero at the asset precision when present |
| New | `status` | Y | Y | Y | enum | `enum` | status: pending \| completed | `completed` when linked Movements match the obligation |

**Indexes:**
- `idx_settlement_instruction_obligation_settlement_date_status` on (`settlementDate`, `status`), obligation processing by date and status

**Relationships:**
- `SettlementInstructionObligation.settlementInstructionLegId` → `SettlementInstructionLeg.id` (many-to-one)
- `SettlementInstructionObligation.accountId` → `Account.id` (many-to-one)
- `SettlementInstructionObligation.assetId` → `Asset.id` (many-to-one)

#### ObligationMovementLink Data Model

> Includes standard system fields: `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. These are not repeated in the table below.

| Field Name | Non-null | Mutable | Client Visible | Data Type | Field Profile | Description | Rules/Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `obligationId` | Y | — | Y | uuid | `uuid` | Obligation reference | — |
| `movementId` | Y | — | Y | uuid | `uuid` | Incoming or outgoing Movement reference | One link for each Movement and obligation pair |
| `classification` | Y | — | Y | enum | `enum` | classification: external_settlement | Set when an operator classifies an incoming Movement as an external settlement |

**Indexes:**
- `uq_obligation_movement_link_obligation_movement` unique on (`obligationId`, `movementId`), one link for each Movement and obligation pair
- `idx_obligation_movement_link_movement_id` on `movementId`, Movement link lookup

**Relationships:**
- `ObligationMovementLink.obligationId` → `SettlementInstructionObligation.id` (many-to-one)
- `ObligationMovementLink.movementId` → `Movement.id` (many-to-one)

#### HouseAccountConfiguration Data Model

> Existing model. Only the fields this PRD adds or changes are listed.

| Change | Field Name | Non-null | Mutable | Client Visible | Data Type | Field Profile | Description | Rules/Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| New | `isHouseAccount` | Y | Y | — | boolean | `enum` | House Account identifier | Backend configuration flag or whitelist membership |
| New | `allowNegativeBalance` | Y | Y | — | boolean | `enum` | Permission for negative balances | Applies to every asset and to total, reserved, available, and expected balances |

**Relationships:**
- `HouseAccountConfiguration.id` → `Account.id` (one-to-one)

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
- [To be added by PM — include relevant research links, competitor analysis, design references]
