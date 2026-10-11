# PRD \- Phase 1A: Asset Type and Whitelist bank account

# About the Document

## List of Personnel

| **Written By** | - Product Manager: @Jordan Chong |
| --- | --- |
| **Designed By** | - Designer: @Arfian |
| **Implemented By** | - Developer: - QA: |

## Related Documents

|  | **Document** | **Link** |
| --- | --- | --- |
| 1 |  |  |
| 2 |  |  |

# Overview

## Summary

Ops needs to be able to record incoming / outgoing assets of **different asset types**.

Where we are today and what is planned:

- For token assets
    - We have token deposits and token withdrawal (requests + transactions). This is automated via BEM.
    - There is no robust manual process for token deposits / withdrawals for unified accounts and for handling edge cases.
    - This will later be refactored into incoming\_token and outgoing\_token, as part of enhancing view only wallet for unified accounts.
- For fiat assets
    - We planned to build fiat deposit + withdrawal (including VAN support, DBS integration etc)
    - This will be renamed to incoming\_fiat and outgoing\_fiat
    - Day 1 will be manual (ie no bank integration)
- For security assets
    - We planned to build security deposit + withdrawal (including broker integration, etc)
    - This will be renamed to incoming\_security and outgoing\_security
    - Day 1 will be manual (ie no broker integration)

| **Asset** | **Unified Deposit is created by** | **Unified Withdrawal is processed by** |
| --- | --- | --- |
| Token | Token Deposit \*later refactored to incoming\_token | Token Withdrawal Request + Token Withdrawal Transaction\*later refactored to outgoing\_token |
| Fiat TO BUILD | Incoming Fiat | Outgoing Fiat |
| Security TO BUILD | Incoming Security | Outgoing Security |

## Out of Scope

## Glossary

| **Term** | **Definition** |
| --- | --- |
|  |  |
|  |  |

## Solution Overview

1. Feature Flags
2. Operator create assets 
3. Whitelisted bank account
4. Operator create venue entry
5. Operator create manual deposit
6. Operator allocate manual deposit
7. Client create unified withdrawal for fiat/ security
8. Operator process unified withdrawal via manual withdrawal

### Incoming Asset Handling

```
@startuml
title Incoming Asset Handling

start

partition "Detection" {
  #pink:Detect incoming funds\n(token via blockchain / fiat via bank / manual via ops);
  if (Duplicate?) then (yes)
    :Do not create new IAE;
    stop
  else (no)
  endif
  :Create Incoming Asset Event (IAE)\n(incoming_token / incoming_fiat / incoming_security);
  #yellow:Balance update (detection)\n* DR Venue (wallet/bank account/venue)\n* CR Suspense account;
}

partition "Classification" {
  :Auto classify using destination + mappings;

  switch (Classification outcome)
    case (deposit)
      :IAE.classification = deposit\nIAE.status = pending_confirmation;
      :System selects client account (UD.account_id);
      partition "UD Creation" {
        :Create Unified Deposit (UD)\nUD.status = under_review;
        #yellow: Balance update (deposit pending confirm)\n* ↑ Expected Client acccount;
        if (Create UD success?) then (yes)
        else (no)
          :IAE.classification = unclassified\nIAE.status = pending_classification;
        endif
      }

    case (rebalance)
      :IAE.classification = rebalance\nIAE.status = pending_link;
      :System selects rebalance to link to;
      partition "Rebalance Linking" {
        :Link IAE to rebalance\nTry to confirm unified rebalance;
        if (Link rebalance success?) then (yes)
          :IAE.status = linked;
          #yellow:Balance update (rebalance)\n* DR Suspense account\n* CR In-Transit;
          stop
        else (no)
          :IAE.classification = unclassified\nIAE.status = pending_classification;
        endif
      }

    case (unclassified)
      :IAE.classification = unclassified\nIAE.status = pending_classification;
  endswitch
}

' Single visual entry-point back into routing after any manual classification
(B)
switch (IAE.status?)

  case (pending_confirmation\n)

    partition "Compliance Checks" {
      #pink:Perform asset-specific checks on IAE (not on UD)\n(automated and/or manual);
    }

    if (Checks result?) then (IAE confirm)
      partition "Confirmation" {
        :IAE.status = confirmed;
        :UD.status = confirmed;
        #yellow:Balance update (confirm)\n* DR Suspense account\n* CR Client account;
      }
    else (IAE reject)
      partition "Reject" {
        #pink:Operator rejects the IAE\nOperator selects next step;
        switch (next step)
          case (to be re-classified)
            :IAE.classification = unclassified\nIAE.status = pending_classification;
            :UD.status = rejected;
            #yellow:Balance update (reject deposit)\n* ↓ Expected Client acccount;
            #pink:(R)
            detach
          case (to be refunded)
            :IAE.classification = unknown\nIAE.status = pending_refund;
            :UD.status = rejected;
            #yellow:Balance update (reject deposit)\n* ↓ Expected Client acccount;
            :Refund Handling section;
            detach
        endswitch
      }
    endif

  case (pending_refund)
    if (operator reclassify?) then (yes)
      #pink:(R)
      detach
    else (no)
    endif
    partition "Refund Handling" {
      #pink:Operator performs refund (out of scope);
      #pink:Operator marks IAE as refunded;
      #yellow:Balance update (refund)\n* DR Suspense account\n* CR Venue;
      :IAE.status = refunded;
    }

  case (pending_classification)
    #pink:(R)
    detach

endswitch

stop

'---------------------------------------
' Manual classify
'---------------------------------------
partition "Manual Classify" {
  #pink:(R)
  #pink:Operator classifies IAE;
  #pink:* For deposit, operator selects client account (UD.account_id)\n* For rebalance, operator selects rebalance entry to link;
  #pink:Maker-checker approval before proceed;

  switch (New classification?)
    case (deposit)
      :IAE.classification = deposit\nIAE.status = pending_confirmation;
      partition "UD Creation" {
        :Create Unified Deposit (UD)\nUD.status = under_review;
        #yellow: Balance update (deposit pending confirm)\n* ↑ Expected Client acccount;
        if (Create UD success?) then (yes)
        else (no)
          :IAE.classification = unclassified\nIAE.status = pending_classification;
        endif
      }

    case (rebalance)
      :IAE.classification = rebalance\nIAE.status = pending_link;
      partition "Rebalance Linking" {
        :Link IAE to rebalance\nTry to confirm unified rebalance;
        if (Link rebalance success?) then (yes)
          :IAE.status = linked;
          #yellow:Balance update (rebalance)\n* DR Suspense account\n* CR In-Transit;
          stop
        else (no)
          :IAE.classification = unclassified\nIAE.status = pending_classification;
        endif
      }

    case (unknown)
      :IAE.classification = unknown\nIAE.status = pending_refund;
  endswitch

  (B)
}

@enduml
```

# Functional Requirements

## Function 1: \[BE and UI\] Company and Environment level feature flags

**Ticket: **[AM-2302](https://team-1602221989898.atlassian.net/browse/AM-2302)

### Details

**Context:**

1. We are building the custody product for 3 different companies. Currently, each company is only allowed to support selected asset classes. This could change in the future.

| **Company** | **Token (DPT - Crypto / Stablecoins)** | **Token (STO)** | **Token (Others)** | **Fiat** | **Securities** |
| --- | --- | --- | --- | --- | --- |
| Config Name | FEATURE\_CONFIG\_DPT | FEATURE\_CONFIG\_STO | - (not needed) | FEATURE\_CONFIG\_FIAT | FEATURE\_CONFIG\_SECURITIES |
| HDA |  |  |  |  |  |
| EXN |  |  |  |  |  |
| JADA |  |  |  |  |  |

1. Based on the above, we need to introduce feature flag capabilities to ensure that certain features are not accessible for certain deployments.

**Requirement:**

1. Come up with a standard on how we can implement these feature flags, across BE and UI. Suggestion that feature flags can be set as T/F depending on:
    1. Company: HDA / EXN / JADA
    2. Environment: DEV / UAT / PROD
        1. \*note that dev env is shared so should be the same across companies
2. Feature flags can be used for:
    1. preventing user from accessing entire workflows (e.g. JADA cannot access all fiat modules)
    2. limit dropdown options (e.g. JADA cannot create asset with type = fiat)
    3. ~~releasing unfinished code (e.g. a new feature will take \> 1 month to build and needs to be hidden until it is ready)~~
3. IMPORTNAT NOTES
    1. The feature flag should be implemented on both API and UI. 
    2. If we only hide on the UI, it is still an issue if user can call API directly
    3. If we block on the API but not on the UI, it will cause a lot of user confusion and will lead to auditor / regulatory questioning.
4. Document all the feature flags we have, to keep track, in this format:

| **Name** | **Description** | **ENV** | **HDA** | **EXN** | **JADA** |
| --- | --- | --- | --- | --- | --- |
| Feature Flag 1 |  | DEV | ENABLED |  |  |
| UAT | DISABLED | DISABLED | DISABLED |  |  |
| PROD | DISABLED | DISABLED | DISABLED |  |  |
| Fiat Support | Includes all workflows relating to fiat support | DEV | ENABLED |  |  |
| UAT | ENABLED | ENABLED | DISABLED |  |  |
| PROD | ENABLED | ENABLED | DISABLED |  |  |

## Function 2: \[Operator\] Allow create / list / view assets to include fiat and security

**Ticket: **[AM-2303](https://team-1602221989898.atlassian.net/browse/AM-2303)

### Details

**Feature Flag**

| **Name** | **UI Impact (if False)** | **API Impact (if False)** |
| --- | --- | --- |
| Fiat Support | Asset Type dropdown does not include fiat | Cannot create asset with type = fiat |
| Security Support | Asset Type dropdown does not include security | Cannot create asset with type = security |
| Crypto Support | Token Category dropdown does not include Crypto / Stablecoin | Cannot create token asset with token category = Crypto / Stablecoin |
| STO Support | Token Category dropdown does not include Security Token | Cannot create token asset with token category = Security Token |

**Data Model**

| **Field Name** | **Non-null** | **Mutable** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | Y | N | UUID | uuid | System-generated ID | Primary Key. Must be unique. |
| `assetName` | Y | Y | String | text\_single\_line | Name of the asset |  |
| `assetSymbol` | Y | Y | String | text\_single\_line | Symbol of the asset |  |
| `assetDisplay` | N | N | String | text\_single\_line | Derived display name for the asset | **Derived field**. Computed from `assetName` + `assetSymbol` |
| `assetType` | Y | Y | String | enum | Type of asset | Allowed values: Token, Fiat, Security |
| `decimal` | Y | Y | Number | integer | Number of decimals supported by the asset | Must be from 0 to 18 |
| `displayDecimal` | Y | Y | Number | integer | Number of decimals to display before rounding | Must be ≤ decimal |
| `assetValuation` | N | Y | String | enum | Valuation code of the asset |  |
| `minimumDepositAmount` | N | Y | Number | non\_negative\_amount | Minimum deposit amount |  |
| `minimumWithdrawalAmount` | N | Y | Number | non\_negative\_amount | Minimum withdrawal amount |  |
| `status` | Y | Y | String | enum | Status of the asset | Allowed values: Active, Disabled |
| `blockchainId` | N | Y | UUID | uuid | Reference to blockchain | Required if assetType = Token; Blockchain must exist |
| `nativeAsset` | N | Y | Boolean | - | Whether the asset is native | Only for Token assets |
| `tokenStandard` | N | Y | String | enum | Token standard | - Allowed values: ERC-20, SPL, Others - Hidden if nativeAsset = true |
| `contractAddress` | N | Y | String | text\_single\_line | Contract address of the token | Hidden if nativeAsset = true |
| `tokenType` | N | Y | String | enum | Type of token | Allowed values: Crypto / Stablecoin, Security Token, Others; Only for Token assets |
| `supportedWalletType` | N | Y | Array \[String\] |  | Supported wallet types | Only for Token assets |
| `supportedOnElliptic` | N | Y | Boolean |  | Supported on Elliptic | Only for Token assets |
| `isinCode` | N | Y | String | alphanumericMust be 12 chars | ISIN code | Only for Security assets (or Token with tokenCategory = Security Token) |
| `securityType` | N | Y | String | enum | Security type | Only for Security assets (or Token with tokenCategory = Security Token)Allowed values: E, C, D, R, O, F, S, H, I, J, K, L, T, M (ISO 10962) |
| `createdAt` | Y | N | Timestamp | timestamp\_tz | Creation timestamp | Auto-generated at creation. |
| `updatedAt` | Y | Y | Timestamp | timestamp\_tz | Last update timestamp | Auto-updated on any change. |

Changes to data model

| **Field** | **Change** | **Details** |
| --- | --- | --- |
| Display Decimal | New | - For existing data,      - If the `Decimal` is less than or equal to 8, copy over the data in the `Decimal` fieldc     - If `Decimal`is above 8, fill in with `8` |
| Status | New (?) | - active or disabled |
| Metadata | Removed |  |
| Token Type | New | - Only when asset type = token - Options are:     - Crypto / Stablecoin     - Security Token     - Others |
| ISIN Code | New | - Only when asset type = security or asset type = token AND token type = security token - ALPHANUMERIC string, max 12 characters |
| Security Type | New | - Only when asset type = security or asset type = token AND token type = security token - For list of options, see table below |

List of security types:

| **Code**This should be the enum on the BE, it follows ISO 10962 | **Name**This should be the display on the UI |
| --- | --- |
| E | Equities |
| C | CIVs |
| D | Debt instruments |
| R | Entitlement (rights) |
| O | Listed options |
| F | Futures |
| S | Swaps |
| H | Non-listed and complex listed options |
| I | Spot |
| J | Forwards |
| K | Strategies |
| L | Financing |
| T | Referential instruments |
| M | Others (miscellaneous) |

---

**List and View assets** 

- should be as per UI mockup

### Mockups

**Add New Asset - Token**  
<https://www.figma.com/design/uLjH0JRLRj1suGlkT3JQcQ/-FE-UI--Asset-Management--Operator-User-?node-id=68-57565&t=3czRkPEwPZMjz4J9-1> 

**Add New Asset - Fiat**  
<https://www.figma.com/design/uLjH0JRLRj1suGlkT3JQcQ/-FE-UI--Asset-Management--Operator-User-?node-id=68-59496&t=3czRkPEwPZMjz4J9-1> 

**Add New Asset - Security**  
<https://www.figma.com/design/uLjH0JRLRj1suGlkT3JQcQ/-FE-UI--Asset-Management--Operator-User-?node-id=68-71650&t=3czRkPEwPZMjz4J9-1> 

**List & View Asset **  
<https://www.figma.com/design/uLjH0JRLRj1suGlkT3JQcQ/-FE-UI--Asset-Management--Operator-User-?node-id=68-37302&t=3czRkPEwPZMjz4J9-1>   

---

## Function 3: Whitelisted bank account reliance

**Ticket:**[AM-2304](https://team-1602221989898.atlassian.net/browse/AM-2304)

### Details

**Context:**

1. For certain clients (usually regulated clients), we have a KYC reliance in place with them. This means that there are some checks that we can skip. 
    1. For example, for most clients when they whitelist bank accounts, we need to check the details first. But for a regulated market operator like SDAX, we have an agreement in place that we can skip checking of bank account details, since SDAX already did the checks. 
    2. Another example is for onboarding. Depending on the KYC reliance in place with the client, there could be a simplified KYC process or the KYC process could be skipped entirely as well. In the case that the onboarding is entirely skipped, we could auto-activate the entities created under that client for example.
    3. The arrangement for each client can differ, it is possible to have a reliance agreement for WBA but not for onboarding KYC. 

**Requirement:**

1. When operator creates a client, add a Reliance Agreements section with the following field:
    1. Whitelisted bank account reliance: T/F
    2. Tooltip: 

Set to true if a reliance agreement with the client exists for whitelisting bank accounts.

If true, clients need not provide a bank statement to whitelist a bank account, and whitelisted accounts bypass operator approval.

If false, clients must provide a bank statement to whitelist a bank account, and an operator must approve it before use.

1. This is a required field during client creation. Default on UI: false

### Mockups

**Add New Client**  
<https://www.figma.com/design/l6wLh73Nugqt2K476PlYpK/-FE-UI--Clients--Operator-User-?node-id=68-20695&t=hhj0AhG3g4zjAxy1-1> 

**List & View Client**  
<https://www.figma.com/design/l6wLh73Nugqt2K476PlYpK/-FE-UI--Clients--Operator-User-?node-id=68-32507&t=hhj0AhG3g4zjAxy1-1> 

## Function 4: Whitelisted bank account

**Ticket: **[AM-2305](https://team-1602221989898.atlassian.net/browse/AM-2305)

### Details

**Context:**

1. To withdraw fiat, the client first needs to whitelist their bank account. The workflow is similar to “Whitelisted Address”
2. There are 3 ways to create a WBA:
    1. client create: 
        1. client user creates a WBA with status: awaiting\_client\_approval
        2. must be approved by another client user before status becomes under\_review / approved
        3. can also be rejected by another client user
    2. client create direct
        1. client user creates a WBA which skips approval from another client user
        2. status will be under\_review / approved
    3. operator create
        1. operator creates on behalf of the client, this requires maker checker
        2. status will be under\_review / approved
3. The workflow differs slightly, depending on whether the client has whitelisted bank account reliance in place. 
    1. If they have reliance in place, 
        1. bank account statement is not needed for the the WBA creation
        2. WBA is auto-approved on the operator side
    2. If there is no reliance in place,
        1. bank account statement is needed for the WBA creation
        2. WBA requires operator approval

**Flow:**

**Feature Flag: Fiat Support**

- If Fiat Support = False: 
    - UI: user should not see any menus for whitelisted bank accounts
    - API: user should not be able to call these APIs, it should be as if these APIs do not exist (if possible, otherwise as long as we return error is also ok)

#### Data Model

|  | **Field Name** | **Non-null** | **Mutable** | **Data Type** | **Field Profile** | **Description** | **Rules/Constraints** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `id` | Y | N | UUID | uuid | ID of the whitelisted bank account | Primary Key. Must be unique. |
| 2 | `scope` | Y | N | String | enum | Whether whitelist applies to account or entity | Allowed values: `entity`, `account` |
| 3 | `accountId` | C | N | UUID | uuid | Account that the whitelist can be used for | Required when scope = `account`. Account must exist. |
| 4 | `entityId` | C | N | UUID | uuid | Entity that the whitelist can be used for | Required when scope = `entity`. Entity must exist. |
| 5 | `label` | Y | N | String | text\_single\_line | Label assigned by client |  |
| 6 | `assetId` | Y | N | UUID | uuid | Asset of whitelisted bank account | Must be existing asset. Asset must have type = `fiat`. |
| 7 | `bankCountryCode` | Y | N | String | country\_code | Country where the bank is based | On UI, user selects from dropdown; FE converts to Alpha-2 before sending to BE. |
| 8 | `swiftCode` | Y | N | String | alphanumeric\[max=11\] | SWIFT code of the bank | Must be exactly 8 or 11 characters. |
| 9 | `bankAccountNumber` | Y | N | String | alphanumeric\[max=34\] | Bank account number to be whitelisted |  |
| 10 | `intermediaryBankSwiftCode` | N | N | String | alphanumeric\[max=11\] | Intermediary bank SWIFT code | Must be exactly 8 or 11 characters if provided. |
| 11 | `routingCode` | N | N | String | alphanumeric\[max=31\] | Routing code, relevant for telegraphic transfers |  |
| 12 | `beneficiaryName` | Y | N | String | swift\_data\[max=140\] | Name of the beneficiary | Enter exactly as it appears on the bank account. |
| 13 | `beneAddrFloorNumber` | N | N | String | swift\_data\[max=70\] | Floor number in beneficiary address |  |
| 14 | `beneAddrRoomNumber` | N | N | String | swift\_data\[max=70\] | Room number in beneficiary address |  |
| 15 | `beneAddrBuildingNumber` | N | N | String | swift\_data\[max=16\] | Building number in beneficiary address |  |
| 16 | `beneAddrBuildingName` | N | N | String | swift\_data\[max=35\] | Building name in beneficiary address |  |
| 17 | `beneAddrStreetName` | N | N | String | swift\_data\[max=70\] | Street name in beneficiary address |  |
| 18 | `beneAddrTownCity` | Y | N | String | swift\_data\[max=35\] | Town/City in beneficiary address |  |
| 19 | `beneAddrPostalCode` | N | N | String | swift\_data\[max=16\] | Postal code in beneficiary address |  |
| 20 | `beneAddrCountryCode` | Y | N | String | country\_code | Country in beneficiary address |  |
| 21 | `status` | Y | Y | String | enum | Status of the whitelisted bank account | Allowed values: `awaiting_client_approval`, `under_review`, `approved`, `rejected` |
| 22 | `bankStatement` | C | N | Document | - | Bank statement document to prove ownership | Bank Statement is required if there is no whitelisted bank account reliance for the client. PDF or JPEG only, max 10MB, must scan for malware. |
| 23 | `createdAt` | Y | N | Timestamp | timestamp\_tz | Creation timestamp | Auto-generated at creation. |
| 24 | `createdBy` | Y | N | UUID | uuid | Creator | Must be existing user. |
| 25 | `updatedAt` | Y | Y | Timestamp | timestamp\_tz | Latest update timestamp | Auto-updated on any change. |
| 26 | `updatedBy` | N | Y | UUID | uuid | Latest user that updated the entry | Must be existing user. |

**Status**

```
@startuml
hide empty description

state KYC_RELIANCE_DECISION <<choice>>
note right of KYC_RELIANCE_DECISION
KYC reliance check
end note

[*] --> awaiting_client_approval : client.create
[*] --> KYC_RELIANCE_DECISION : client.create_direct
[*] --> KYC_RELIANCE_DECISION : operator.create


awaiting_client_approval --> KYC_RELIANCE_DECISION : client.approve
awaiting_client_approval --> rejected : client.reject

KYC_RELIANCE_DECISION --> approved : [kyc_reliance]
KYC_RELIANCE_DECISION --> under_review : [no_kyc_reliance]

under_review --> approved : operator.approve
under_review --> rejected : operator.reject

approved --> [*]
rejected --> [*]

@enduml
```

| **Status** | **Operator Label** | **Client Label** | **Meaning** | **Next States** | **Downstream Logic** |
| --- | --- | --- | --- | --- | --- |
| `awaiting_client_approval` | Awaiting Client Approval | Awaiting Approval | Client-created bank account pending approval by another client user | `under_review`, `approved`, `rejected` | Not usable for withdrawalsClient user with permission can approve / reject |
| `under_review` | Under Review | Processing | Pending operator review | `approved`, `rejected` | Not usable for withdrawalsOperator with permission can approve/reject |
| `approved` | Approved | Approved | Bank account approved and usable | — | Withdrawals allowed; selectable as destination |
| `rejected` | Rejected | Rejected | Bank account rejected by client or operator | — | Not usable for withdrawals |

**Operations**

| **Actor** | **Operation** | **Input** | **Validation** | **System Behaviour** | **MC Required** | **Audit Log Event** |
| --- | --- | --- | --- | --- | --- | --- |
| `operator` | `create` | See below + - action comment | Remarks optional | - Assign default values - Assign status:     - status = under\_review (if client has **NO **KYC reliance in place)     - status = approved (if client has KYC reliance in place) | Y | `whitelisted_bank_account.create` |
| `operator` | `list` | See below | - | - | N | - |
| `operator` | `view` | id | - | - | N | - |
| `operator` | `approve` | - id - action comment | - Status must be under\_review | - Update status to approved | N | `whitelisted_bank_account.approve` |
| `operator` | `reject` | - id - reason code\* - action comment\* | - Status must be under\_review | - Update status to rejected Possible reason codes: - Client requested (`CLIENT_REQUESTED`) - Name mismatch (`NAME_MISMATCH`) - Invalid bank details (`INVALID_BANK_DETAILS`) - Ownership cannot be verified (`OWNERSHIP_NOT_VERIFIED`) - Other (`OTHER`) | N | `whitelisted_bank_account.reject` |
| `client` | `create` | See below + - action comment | - MFA required (except service user) | - Assign default values - Assign default values:     - status = awaiting\_client\_approval (for create)     - status = approved (for create\_direct and client has KYC reliance in place)     - status = under\_review (for create\_direct and client has NO KYC reliance in place) | - | `whitelisted_bank_account.create` |
| `client` | `list` | See below | - | - | - | - |
| `client` | `view` |  | - | - | - | - |
| `client` | `approve` | - id - action comment | - Status must be awaiting\_client\_approval - MFA required (except service user) | - Update status     - status = under\_review (if client has **NO **KYC reliance in place)     - status = approved (if client has KYC reliance in place) | - | `whitelisted_bank_account.client_approve` |
| `client` | `reject` | - id - action comment\* | - Status must be awaiting\_client\_approval - MFA required (except service user) | - Update status to rejected | - | `whitelisted_bank_account.client_reject` |

| **Field** | **Create** | **List filter** | **List output** | **View output** |
| --- | --- | --- | --- | --- |
| `id` | - | text, partial match | Y | Y |
| `scope` | Required | dropdown, single select | Y | Y |
| `accountId` | Required | reference, single select | Y | Y |
| `entityId` | Required | reference, single select | Y | Y |
| `label` | Required | text, partial match | Y | Y |
| `assetId` | Required | reference, single select | Y | Y |
| `bankCountryCode` | Required | - | Y | Y |
| `swiftCode` | Required | text, partial match | Y | Y |
| `bankAccountNumber` | Required | - | Y | Y |
| `intermediaryBankSwiftCode` | Optional | - | Y | Y |
| `routingCode` | Optional | - | Y | Y |
| `beneficiaryName` | Required | - | Y | Y |
| `beneAddrFloorNumber` | Optional | - | - | Y (operator only) |
| `beneAddrRoomNumber` | Optional | - | - | Y (operator only) |
| `beneAddrBuildingNumber` | Optional | - | - | Y (operator only) |
| `beneAddrBuildingName` | Optional | - | - | Y (operator only) |
| `beneAddrStreetName` | Optional | - | - | Y (operator only) |
| `beneAddrCity` | Required | - | - | Y (operator only) |
| `beneAddrPostalCode` | Optional | - | - | Y (operator only) |
| `beneAddrCountryCode` | Required | - | - | Y (operator only) |
| `status` | - | enum, multi select | Y | Y |
| `bankStatement` | Conditional | - | - | Y (operator only) |
| `createdAt` | - | - | Y | Y |
| `createdBy` | - | - | Y | Y |
| `updatedAt` | - | - | Y | Y |
| `updatedBy` | - | - | Y | Y |

**Operator Permissions**

| **Operation** | **Operator Admin** | **Operator User** | **Compliance** |
| --- | --- | --- | --- |
| `create` | - | Y | - |
| `list` | - | Y | Y |
| `view` | - | Y | Y |
| `approve` | - | Y | - |
| `reject` | - | Y | - |

**Client Permissions**

| **Operation** | **Client Admin** | **Submitter** | **Approver** | **Whitelist Manager** | **Viewer** | **Individual Client** | **Service User** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `create` | - | - | - | Y | - | Y (create\_direct) | Y (create\_direct) |
| `list` | Y | Y | Y | Y | Y | Y | Y |
| `view` | Y | Y | Y | Y | Y | Y | Y |
| `approve` | - | - | - | Y | - | Y | Y |
| `reject` | - | - | - | Y | - | Y | Y |

**Audit Log**

|  | **Event** | **Metadata** | **internalMetadata** | **Visibility Scope** |
| --- | --- | --- | --- | --- |
| 1 | `whitelisted_bank_account.create` |  |  | CLIENT |
| 2 | `whitelisted_bank_account.approve` |  |  | CLIENT |
| 3 | `whitelisted_bank_account.reject` |  |  | CLIENT |
| 4 | `whitelisted_bank_account.client_approve` |  |  | CLIENT |
| 5 | `whitelisted_bank_account.client_reject` |  |  | CLIENT |

**Mockups**  
  
**CLIENT UI**  
  
**Submit Whitelist Bank Account - Scope Account**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=25-83888&t=GOf1f7XL7CtP7Xph-1> 

**Submit Whitelist Bank Account - Scope Entity**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=51-49663&t=GOf1f7XL7CtP7Xph-1> 

**Approve Whitelist Bank Account Request**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=46-19198&t=GOf1f7XL7CtP7Xph-1> 

**Reject Whitelist Bank Account Request**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=33-33437&t=GOf1f7XL7CtP7Xph-1> 

  
**List & View - Awaiting Approval**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=28-8654&t=GOf1f7XL7CtP7Xph-1> 

**List & View - Under Review**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=51-73379&t=GOf1f7XL7CtP7Xph-1> 

  
**List & View - Approved**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=51-78078&t=GOf1f7XL7CtP7Xph-1> 

  
**List & View - Rejected**  
<https://www.figma.com/design/r4KWdIls69MDi1nUVBHhLU/-FE-UI--Whitelist-Bank-Account-V2--Client-User-?node-id=51-75222&t=GOf1f7XL7CtP7Xph-1> 

---

  
**OPERATOR UI**  
  
**Add New Whitelist Bank Account - Scope Account**  
<https://www.figma.com/design/o52gcYizQa3HDeCbQSvyC7/-FE-UI--Whitelist-Bank-Account-V2--Operator-User-?node-id=14-18857&t=dxMZVGWSAu3F4dia-1> 

**Add New Whitelist Bank Account - Scope Entity**  
<https://www.figma.com/design/o52gcYizQa3HDeCbQSvyC7/-FE-UI--Whitelist-Bank-Account-V2--Operator-User-?node-id=52-12548&t=dxMZVGWSAu3F4dia-1> 

**List & View - Under Review**  
<https://www.figma.com/design/o52gcYizQa3HDeCbQSvyC7/-FE-UI--Whitelist-Bank-Account-V2--Operator-User-?node-id=19-17369&t=dxMZVGWSAu3F4dia-1> 

**List & View - Auto Approve (KYC Reliance)**  
<https://www.figma.com/design/o52gcYizQa3HDeCbQSvyC7/-FE-UI--Whitelist-Bank-Account-V2--Operator-User-?node-id=21-26785&t=dxMZVGWSAu3F4dia-1> 

**List & View - Approve Whitelist**  
<https://www.figma.com/design/o52gcYizQa3HDeCbQSvyC7/-FE-UI--Whitelist-Bank-Account-V2--Operator-User-?node-id=19-17370&t=dxMZVGWSAu3F4dia-1> 

**List & View - Reject Whitelist**  
<https://www.figma.com/design/o52gcYizQa3HDeCbQSvyC7/-FE-UI--Whitelist-Bank-Account-V2--Operator-User-?node-id=19-19644&t=dxMZVGWSAu3F4dia-1> 

---

# Non-functional Requirements

**What**: Defines how a system should behave rather than what it does. These cover  measurable qualities that support the functional requirements, such as performance, scalability, reliability, security, compliance, and accessibility

**Why**: Non-functional requirements help engineering teams make architectural decisions and trade-offs.

**Examples of what to include**:

- System/application performance requirements
    - E.g. to achieve at least 5 TPS
- Capacity/Expected Load forecast
    - E.g. System needs to support 10k accounts, with 500 DAU on day 1
    - E.g. Estimated 2k daily transactions by end of first year
    - E.g. Estimated user base and daily transactions increase by 15% each year for first 3 years
- Resiliency requirements:
    - Backup scope: e.g. Transactional and customer data
    - Recovery expectations: e.g. Recovery point objective of less than 1 minute. Downtime less than 30 mins in a year.
    - IT DR requirements: e.g. IT DR testing results to be shared annually.
- Security requirements: (in consultation with Cyber Security rep)
    - Vulnerability assessment: e.g. annual testing by external party. \<Can the client accept internal?\>
    - Penetration testing: e.g. annual testing by external party. \<Can the client accept internal?\>
    - User authentication controls: \<...\>
    - Encryption controls: \<…\>
    - Data segregation controls: \<...\>
    - To list out existing technology controls that are or will be in place to address client and/or regulatory requirements/expectations e.g. data security concerns, security requirements of clients, data access matrix controls, etc.
- Applicable compliance/legal/regulatory requirements:
    - E.g. EU-GDPR, SG-PDPA, US-CCPA, UK-PRA, CN-CBRC, MAS-TRM, HKMA-TRM
- Any others

# References

<https://www.dbs.com.sg/personal/support/bank-overseas-funds-transfer-countries.html> 

[https://uniservices1.uobgroup.com/secure/forms/business/BIBPlus\_clearing\_codes.html?&adobe\_mc=MCMID%3D00490117533326115571952726613996069062%7CMCORGID%3D116168F454E6DA2A0A4C98A6%2540AdobeOrg%7CTS%3D1767762010](https://uniservices1.uobgroup.com/secure/forms/business/BIBPlus_clearing_codes.html?&adobe_mc=MCMID%3D00490117533326115571952726613996069062%7CMCORGID%3D116168F454E6DA2A0A4C98A6%2540AdobeOrg%7CTS%3D1767762010) 

[https://www.sc.com/en/uploads/sites/66/content/docs/sc-cib-tb-ISO-20022–CBPR-Address-guidelines-H2H-and-API-sept-2025.pdf](https://www.sc.com/en/uploads/sites/66/content/docs/sc-cib-tb-ISO-20022%E2%80%93CBPR-Address-guidelines-H2H-and-API-sept-2025.pdf)

<https://www.iban.com/country-codes> 

<https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html#scrollTo=cfi-code> 

---
