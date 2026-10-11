# Unified Account MVP Part 3\- PRD

# About the Document

## List of Personnel

| **Written By** | - Product Manager: @Jordan Chong |
| --- | --- |
| **Designed By** | - Designer: @Arfian |
| **Implemented By** | - Developer: @Hossein Nasr Esfahan@Peter Poon - QA: @Widhi Putri |

## Related Documents

|  | **Document** | **Link** |
| --- | --- | --- |
| 1 |  |  |
| 2 |  |  |

# Overview

## Summary

This document discusses the implementation of Unified Account MVP Part 3. In this part, the focus is to implement omnibus cold wallets, unified rebalance and settlement instruction (incl. sweep rebalance, hot rebalance and cold rebalance). 

- Unified rebalance allow operators to move assets from 1 wallet to another (no movement on the accounts)
- Settlement instructions would allow clients to perform multiple transfers at once, each transfer will transfer assets from 1 unified account to another (no movement on the wallets/venues)

Functions within scope:

1. Operator create/ list/ view omnibus cold wallet  
2. Operator create/ list/ view a unified rebalance (with maker checker)
3. Operator processes a token withdrawal request and auto creates pending token deposit
4. BEM confirms token withdrawal request and updates unified rebalance entry
5. BEM confirms token deposit linked to unified rebalance
6. Operator generate new token withdrawal request/ fail the unified rebalance  
7. Update token withdrawal request generation process (for unified withdrawal)  
8. Operator create/ list/ view settlement instruction
9. Submitter client create settlement instruction
10. Approver client / service user approves / rejects settlement instruction
11. Individual user / service user creates settlement instruction
12. Client list/ view settlement instruction
13. Operator process/ rejects settlement instruction  

## Out of Scope

1. Unified Rebalance is manually initiated. Auto-sweeping and the ability to automatically track the hot-cold ratio and initiate an auto-rebalance will be added in a later feature.
2. If there are any transfers that cross wallet groups, there is currently no method to auto-detect that a unified rebalance must be initiated. This will be added in a later feature.
3. Currently, we allow rebalance from any wallet to any wallet. In the future, we can add restrictions of which rebalance paths are allowed.

## Glossary

| **Term** | **Definition** |
| --- | --- |
| Unified Rebalance | Unified Rebalance allows the custody operator to move assets from 1 venue to another venue, without affecting the balances of unified accounts. It is called “unified” because it can be used to move different asset types (e.g. token, fiat, etc) |
| Settlement Instructions (SI) | SI is a grouping of 1 or transfer legs and are executed simultaneously. |
| Transfer leg | A transfer leg is a movement of a particular amount of asset, from 1 unified account to another unified account |
| Account Obligation | The net obligation of an account to deliver and/or receive assets as part of a settlement instruction. |

## Solution Overview

Unified Rebalance Workflow

Settlement Instruction:

# Functional Requirements

## Function 1: \[Operator\] Create/ list/ view/ edit omnibus cold wallet

**Ticket: **[AM-1965](https://team-1602221989898.atlassian.net/browse/AM-1965)

### Details

**Context:**

1. Omnibus cold wallet stores up to 90% of all custodised assets for security purposes
2. Today, we have standard and view only cold wallet, which are used for segregated accounts. Now, we are re-using them, but for omnibus purposes. So we can have 2 types of omnibus cold wallets:
    1. standard cold wallet (omnibus)
    2. view only cold wallet (omnibus)
3. Each omnibus cold wallet is linked to a single blockchain. Each wallet group can have 1 or more cold wallets of the same blockchain.
4. Each omnibus cold wallet can only be linked to a single wallet group. This is determined in the creation of the cold wallet and can be edited.
5. Each omnibus cold wallet will have 1 address.
6. The omnibus cold wallet is internal, so only operator can see these information.

**Flow:**

**Create Omnibus Cold Wallet:**

1. **REMOVE** the Metadata and Key Ceremony fields from the cold wallet creation (for **ALL** types of wallets)
    1. If needed, include a script to remove these columns from DB so that this can be implemented on UAT and PROD too.
2. Operator can create omnibus cold wallet, almost the same way as the standard / view only cold wallet except:
    1. When creating a standard / view only cold wallet, the operator can choose to create segregated or omnibus.
    2. All omnibus cold wallets are linked to a fixed HydraX account (same as omnibus hot wallet)
        1. ~~This is not shown on the UI, it is handled on the BE.~~
    3. The omnibus cold wallet is linked to a wallet group
3. Operator has to fill in:
    1. Type
    2. Name
    3. Blockchain
    4. Wallet Group
    5. Key details (including derivation path details)
4. After submission, the process of deploying the wallet on-chain is exactly the same as the current method.

**List Omnibus Cold Wallets:**

1. Operator can list omnibus cold wallet with the following details:
    1. UUID
    2. Name
    3. Blockchain
    4. Type
    5. Wallet Group
    6. Address
2. Operator should be able to filter by:
    1. Name (allow multiple, partial match)
    2. Blockchain ID (allow multiple, exact match)
    3. Wallet Group ID (allow multiple, exact match)
    4. Address (allow multiple, partial match)
        1. address value, not address ID
    5. is Omnibus

**View Omnibus Cold Wallet:**

1. Operator can view cold wallets with the following details:
    1. Note, follow the order in the UI mockup, the fields below are not in order

| **Fields** | **Standard Cold Wallet (Segregated)** | **Standard Cold Wallet (Omnibus)** | **View Only Cold Wallet (Segregated)** | **View Only Cold Wallet (Omnibus)** |
| --- | --- | --- | --- | --- |
| - UUID - Name - Blockchain - Type - Status (\*status includes: `initialised` and `completed`) - Address - Remarks - Created By/ Created At - Updated By/ Updated At |  |  |  |  |
| - Wallet Group |  |  |  |  |
| - Account |  |  |  |  |
| - M Quorum - N Quorum |  |  |  |  |
| - Metadata - Key Ceremony |  |  |  |  |

1. Under the omnibus cold wallet, the operator can view the following. This is the same as what we have now for other cold wallet types.
    1. cold wallet balances
    2. cold wallet transactions 

**Edit Omnibus Cold Wallet:**

1. The user can edit the following details of the omnibus cold wallet:
    1. Name
    2. Remarks
    3. Wallet Group
2. The user can edit at any time, regardless of the cold wallet status

**Deploy Omnibus Cold Wallet:**

1. The process is similar to the existing deployment of standard cold wallets.

**View Wallet Group:**

1. In the view wallet group page, the operator should be able to see the list of omnibus cold wallets under the wallet group. The user should see:
    1. UUID
    2. Name
    3. Blockchain
    4. Address

### Mockup  
  
Create Omnibus Cold Wallet 

<https://www.figma.com/design/ZI1KexAxMFf6Xz21j0i8ry/-FE-UI--Omnibus-Cold-Wallet--Operator-User-?node-id=2011-136704&t=thjuyGPYAg4SGyWf-1> 

###   
List, View and Edit Omnibus Cold Wallet 

#### a. Status - Initialised

<https://www.figma.com/design/ZI1KexAxMFf6Xz21j0i8ry/-FE-UI--Omnibus-Cold-Wallet--Operator-User-?node-id=2062-38786&t=nDGgHSKPfRoppYDD-1> 


#### b. Status - Completed

<https://www.figma.com/design/ZI1KexAxMFf6Xz21j0i8ry/-FE-UI--Omnibus-Cold-Wallet--Operator-User-?node-id=2062-58745&t=thjuyGPYAg4SGyWf-1> 


### Wallet Group Details Update

<https://www.figma.com/design/zYlt4RdwB9ROFgudgBoqHy/-FE-UI--Wallet-Groups--Operator-User-?node-id=529-41431&t=sw6ljIzpEmPlhtpQ-1>   

## Function 2: \[Operator\] creates a unified rebalance (with maker checker)

**Ticket: **

### Details

**Context:**

1. Unified rebalance allows the operator to move assets from 1 venue to another venue. A venue is a place of custody for an asset.
    1. For example, a wallet or an crypto exchange account is a venue for tokens, a bank account is a venue for fiat, and a securities account is a venue for securities
2. For now, we will **only focus on unified rebalancing for tokens**. 
3. NOTE: it is possible to rebalance across wallet groups. There should be no restriction for rebalancing across wallet groups.
4. NOTE: The source CAN sometimes be the same wallet as the destination. This is especially important for UTXO consolidation like in BTC.

**Flow:**

**Create unified rebalance:**

1. The operator can create a unified rebalance with the following details:

| **Section** | **Field** | **Details** |
| --- | --- | --- |
| Asset Details | Asset Type | - On FE, auto**-**fill with `token` and don’t allow user to edit it. In the future, we will convert this to a dropdown. - On BE, only accept `token` for now. We can add other options in the future |
| Source Venue | Source Venue Type | - User can select deposit wallet, omnibus hot wallet, omnibus cold wallet |
| Account | - If user selects type: **deposit wallet**, user need to provide:     - Account + Blockchain → this will help the user to find the deposit wallet     - Deposit wallet → can be displayed based on the account + blockchain selected |  |
| Blockchain |  |  |
| Deposit Wallet |  |  |
| Omnibus Hot Wallet | - If the user selects type: **omnibus hot wallet**, user will need to select the omnibus hot wallet |  |
| Omnibus Cold Wallet | - If the user selects type: **omnibus cold wallet**, user will need to select the omnibus cold wallet |  |
| Rebalance Details | Asset | - User can select from the assets with available balance in the selected venue |
| Amount | - User can enter up to the available balance for that asset. Otherwise, there should be error: Insufficient available balance |  |
| Destination Venue | Destination Venue Type | - User can select deposit wallet, omnibus hot wallet, omnibus cold wallet - NOTE: we do not restrict the destinations for now |
| Account | - If user selects type: **deposit wallet**, user need to provide:     - Account + Blockchain → this will auto display the deposit wallet |  |
| Blockchain |  |  |
| Deposit Wallet |  |  |
| Omnibus Hot Wallet | - If the user selects type: **omnibus hot wallet**, user will need to select the omnibus hot wallet |  |
| Omnibus Cold Wallet | - If the user selects type: **omnibus cold wallet**, user will need to select the omnibus cold wallet |  |

1. The unified rebalance creation requires maker checker. Once the checker has approved, following will happen:
    1. The system verifies that there is sufficient available funds in the source wallet.
    2. The unified rebalance entry is created with status: `processing`. 
    3. The system creates a linked token withdrawal request (See details below)
    4. The system updates the balance service, to earmark the funds from the source wallet
    5. NOTE: if there are any issues in any of the above steps, DTM will roll back everything. This means that the checker will not be able to approve the MCH Request
2. The Create API should also have an idempotency key to prevent duplicates.

**Details for the creation of linked token withdrawal request**

1. Based on the selected wallet, the system should create a token withdrawal request with the following details:
    1. wallet type: depends on the source wallet’s type
        1. For example if the source wallet is a deposit wallet/ omnibus hot wallet, the token withdrawal request just needs to be sent to the WaaS Vendor for processing. If the source wallet is an omnibus cold wallet, then the token withdrawal request will require the 2-of-3 HSM signing before broadcast
    2. from wallet: source wallet
    3. address destination type: wallet\_address
    4. address destination id: destination wallet
    5. amount: same as unified rebalance
    6. asset: same as unified rebalance
    7. status: under review
    8. kyt\_status: skipped
        1. KYT can be skipped here since the source and destination address are both internal addresses.
2. Upon creation of the token withdrawal request, the balance of the from wallet should be earmarked. If there is insufficient balance, the token withdrawal request creation should fail.
3. There is no need for KYT for this since both source and destination are wallets within our ecosystem.


**List unified rebalance:**

1. If the user clicks on the Unified Rebalances tab, they will see a table with the following columns:
    1. ID
    2. Source Venue
    3. Destination Venue
    4. Asset
    5. Amount
    6. Status
    7. Transacted At
        1. This is the timestamp when the on-chain transaction **actually **occurred and will be filled only after completion of the rebalance.
2. Filters:
    1. ID (partial search)
    2. Asset
    3. Amount
    4. Status
    5. Source Venue Type
    6. Source Venue Value 
    7. Destination Venue Type
    8. Destination Venue Value

**View unified rebalance**

1. If the user clicks into a single unified rebalance, they will see:
    1. ID
    2. Source Venue
    3. Destination Venue
    4. Asset
    5. Amount
    6. Status
    7. Transacted At
    8. Created At/ Created By/ Updated At/ Updated By
2. User can also see the following tables:
    1. Linked token withdrawals
    2. Linked token deposits

### Mockups

### Create Unified Rebalance

#### a. Source Venue - Deposit Wallet

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=242-34208&t=SnGC6dn8ygmCrmIG-1> 

#### b. Source Venue - Omnibus Hot Wallet

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=420-67505&t=SnGC6dn8ygmCrmIG-1> 

#### c. Source Venue - Omnibus Cold Wallet

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=420-72251&t=SnGC6dn8ygmCrmIG-1> 


### List & View Unified Rebalance

#### a. Status - Processing

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=252-35214&t=SnGC6dn8ygmCrmIG-1> 

## Function 3: \[Operator\] processes a token withdrawal request and auto creates pending token deposit

**Ticket: **[AM-1967](https://team-1602221989898.atlassian.net/browse/AM-1967)

### Details

**Context:**

1. The processing of a token withdrawal request (for omnibus cold wallet and for deposit/hot wallet) is the same as current implementation. EXCEPT with an additional step of creating a pending token deposit.
2. Since the withdrawal sends assets to another wallet within our custody, we can create a pending token deposit to indicate we are expecting the assets to come back in. 

**Flow:**

**Process token withdrawal request (from omnibus cold wallet)**

\*same as current

1. When the token withdrawal request status is `under review`, the operator can click “Generate unsigned transaction”. This will:
    1. generate the signing requests for HSM to sign
    2. status is updated to `awaiting signatures`
2. The operator can proceed to signing the transaction as per normal
3. Once there are enough signatures, the status should update to `ready for broadcast`
4. User can click the Broadcast button which will update the status to `broadcasted` if it was successful
5. The transaction hash is updated to the withdrawal request

**Process token withdrawal request (from deposit / omnibus hot wallet)**

\*same as current

1. When the token withdrawal request status is `under review`, the operator can click “Process” button. This will:
    1. send an API to the WaaS vendor to process the withdrawal request
    2. If it is successful, the status updates to `broadcasted`
    3. If the vendor returns an error, the status ~~updates to failed and the earmark on the source wallet is removed ~~ remains as `under review`. 
    4. If there are any unresolvable issues or if the on-chain transaction is broadcasted but fails, the operator has an option to mark the token withdrawal request as `failed` (see [Unified Account MVP Part 2 - PRD](<https://team-1602221989898.atlassian.net/wiki/spaces/AM/pages/2510454807/Unified+Account+MVP+Part+2+-+PRD#Function-12%3A-%5BOperator%5D-marks-token-withdrawal-request-as-failed-(with-maker-checker)>) )
2. The transaction hash is updated to the withdrawal request

**New step of creating token deposit (regardless of wallet type)**

1. This additional step is only for token withdrawal requests that are **linked to a unified rebalance**
2. After updating the transaction hash to the token withdrawal request, the system should create a new token deposit with the following data:
    1. address source: address of the from wallet of the withdrawal
    2. address destination: address destination of the withdrawal
    3. KYT status: skipped
    4. Travel Rule status: skipped
    5. asset: same as withdrawal
    6. amount: same as withdrawal
    7. txn hash: same as the withdrawal
    8. status: pending confirmation
3. When creating the pending token deposit, system will
    1. add an “expected” balance into the destination wallet.

### Mockups

### Process Token Withdrawal - From Omnibus Cold Wallet

#### a. Generate Signing Request

<https://www.figma.com/design/VL1bIdSfIy0KK0ES7J2uIw/-FE-UI--Token-Withdrawal-Request--Operator-User-?node-id=2218-26369&t=7kQ9J1DB2MNXnj4J-1> 

####   
  
b. Broadcast Request

<https://www.figma.com/design/VL1bIdSfIy0KK0ES7J2uIw/-FE-UI--Token-Withdrawal-Request--Operator-User-?node-id=2225-80958&t=7kQ9J1DB2MNXnj4J-1> 

### Process Token Withdrawal - From Deposit/Omnibus Hot Wallet

<https://www.figma.com/design/VL1bIdSfIy0KK0ES7J2uIw/-FE-UI--Token-Withdrawal-Request--Operator-User-?node-id=2293-54913&t=7kQ9J1DB2MNXnj4J-1> 

### Pending Confirmation Token Deposit

<https://www.figma.com/design/da0bsxzcbFciumCti5PfCM/-FE-UI--Token-Deposit--Operator-User-?node-id=329-47595&t=rA083DXo8d63LoQx-1> 

## Function 4: \[BEM\] confirms token withdrawal request and updates unified rebalance entry

**Ticket: **[AM-1968](https://team-1602221989898.atlassian.net/browse/AM-1968)

### Details

**Context: **

1. Upon on-chain confirmation, BEM picks up the transaction automatically. BEM should receive 2 webhooks:
    1. The webhook for outgoing asset (asset leaving the source wallet)
    2. The webhook for incoming asset (asset entering the destination wallet)
2. Since we cannot anticipate when each webhook will come in first, we need to prepare for either order, and treat each webhook separately.
3. We need BOTH webhooks to be processed before we can mark the unified rebalance as completed.

**Flow:**

1. When BEM picks up the **outgoing** funds webhook confirmation, the system will perform the existing workflow:
    1. find the token withdrawal request with the same txn hash
    2. update the token withdrawal requests status to completed
    3. create a token withdrawal transaction
    4. remove the earmark from the source wallet
    5. credit the source wallet balance and debit a balance account called “in transit”
        1. The value date should also be sent to the balance service. The value date should be based on the onchain transaction timestamp
2. Now, if the token withdrawal request is linked to a unified rebalance, we should also try to update the unified rebalance status.
    1. If the unified rebalance has a linked token deposit with status = confirmed, then we can set the unified rebalance status to completed.
        1. At this step, the `Transacted At` of the unified rebalance should be filled based on the timestamp of the onchain transaction.
    2. Otherwise, if the deposit status is still pending confirmation, that means we cannot update the rebalance status yet.

### Mockups

N/A

## Function 5: \[BEM/Operator\] confirms / fails token deposit linked to unified rebalance

\*Updated sections highlighted in green

**Ticket: **[AM-1970](https://team-1602221989898.atlassian.net/browse/AM-1970)

### Details

**Context:**

1. Upon on-chain confirmation, BEM picks up the transaction automatically. We should receive 2 webhooks:
    1. The webhook of outgoing asset (asset leaving the source wallet)
    2. The webhook of incoming asset (asset entering the destination wallet)
2. Since we cannot anticipate when each webhook will come in first, we need to prepare for either order, and treat each webhook separately.
3. We need BOTH webhooks to be processed before we can mark the unified rebalance as completed.
4. In case that BEM fails to confirm, the operator also has the ability to manually confirm the deposit.
5. In case that there is an on-chain failure, the operator has the ability to mark this token deposit as failed.

**Flow:**

1. When BEM picks up the **incoming** funds webhook confirmation, the system will check if there is an existing token deposit with the same txn hash.
    1. if there is, check the status first
        1. if the status is under review / confirmed, that means this webhook is a duplicate and can be ignored
        2. if the status is pending confirmation, that means this webhook needs to be processed. The next steps will focus on how to do this processing.
    2. if there is no existing deposit, this likely means this is a new deposit, and the BEM will generate a token deposit + unified deposit (covered in UA Part 1)
2. If the system needs to process the webhook, it will do:
    1. update the token deposit requests status from pending confirmation to completed
    2. remove the expected balance from the destination wallet
    3. debit the destination wallet balance and credit a balance account called “in transit”
        1. The value date should also be sent to the balance service. The value date should be based on the onchain transaction timestamp
3. Now, if the token deposit is linked to a unified rebalance, we should also try to update the unified rebalance status.
    1. If the unified rebalance has a linked token withdrawal request with status = completed, then we can set the unified rebalance status to completed.
        1. At this step, the `Transacted At` of the unified rebalance should be filled based on the timestamp of the onchain transaction.
    2. Otherwise, if the withdrawal status is still broadcasted, that means we cannot update the rebalance status yet.

**Manual confirmation**

1. If BEM fails, the operator can go to the deposit that has status “pending confirmation” and manually click the confirm button. Ops will need to key in the transacted at manually before confirmation. 

**Manual fail**

1. In the rare event that the transaction is broadcasted successfully but there is on-chain failure, the operator can manually mark the pending token deposit as failed. 
2. For a token deposit with status pending, the operator can click a Mark as Failed button. This will require the operator to provide a failure reason. This will also require maker checker.
3. This also means that a unified rebalance can have more than 1 linked token deposits, since the token deposits can fail.

### Mockups

**Received Token Deposit**

<https://www.figma.com/design/da0bsxzcbFciumCti5PfCM/-FE-UI--Token-Deposit--Operator-User-?node-id=329-51141&t=CNBJAYQyiNfEq7kC-1>   

## Function 6: \[Operator\] generate new token withdrawal request/ fail the unified rebalance

**Ticket: **[AM-1969](https://team-1602221989898.atlassian.net/browse/AM-1969)

### Details

**Context:**

1. Similar to in unified withdrawal, the generated token withdrawal request can fail. In the scenario of failure, we can re-generate a new token withdrawal request.

**Re-generate token withdrawal request**

1. If the token withdrawal request fails, the operator should be able to go to the parent unified rebalance and click generate new token withdrawal request or fail button.
    1. **NOTE:** This action can only be done if
        1. The unified withdrawal is still in processing state AND
        2. all the linked token withdrawal request under it have status failed
2. If the user selects the generate new button, it will try to create a new token withdrawal request. 
    1. At this point, the system should check the available balance of the source wallet again and generate a new token withdrawal request for the source wallet and earmark the source wallet
    2. If there is insufficient available balance, the system should return an error.
3. If the operator chooses to fail the unified rebalance, they need to provide a failure reason that will be reflected to the client.
4. Note that these 2 buttons should only be available if the underlying token withdrawal has failed. If the underlying token withdrawal request has not failed yet, the operator should NOT be able to generate a new token withdrawal request/ fail the unified rebalance

### Mockups

### Regenerate Token Withdrawal Request

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=275-60539&t=SnGC6dn8ygmCrmIG-1> 

### Failed Unified Rebalance

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=300-37622&t=SnGC6dn8ygmCrmIG-1> 

##   
Function 7: Update token withdrawal request generation process (for unified withdrawal)

**Ticket: **[AM-1971](https://team-1602221989898.atlassian.net/browse/AM-1971)

### Details

**Context:**

1. In function 7 of Unified Accounts part 2, we mentioned (in purple) that the balance check could be skipped initially. Now we can include it since rebalance is built.

**Flow:**

1. When the operator clicks on a unified withdrawal with status “under review”, and they click “generate token withdrawal”, there should be a balance check. If the selected wallet does not have sufficient balance, the generation should fail. 

### Mockups

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=300-50545&t=SnGC6dn8ygmCrmIG-1> 

## Function 8: \[Operator\] create (with maker checker)/ list/  view Settlement Instruction

**Ticket: **[AM-1972](https://team-1602221989898.atlassian.net/browse/AM-1972)

### Details

**Context:**

1. A Settlement instruction is a batch of transfer legs. Each transfer leg allows us to move assets from 1 unified account to another.
2. A settlement instruction can be made by either an operator / client. 

**Flow:**

**Operator creates SI (with maker checker)**

1. The operator (maker) can create a new SI with 1 or more transfer legs. 
    1. The SI has:
        1. External Reference (optional)
        2. Remarks (optional)
        3. 1 or more transfer legs
    2. Each transfer leg has:
        1. From Account
            1. \*must be unified account
            2. On the UI, the operator can select the entity first then the account, so that it is easier to find the account. But on the API , there is no need for this entity
        2. To Account
            1. \*must be unified account
            2. On the UI, the operator can select the entity first then the account, so that it is easier to find the account. But on the API , there is no need for this entity
        3. Asset
        4. Amount
        5. External Reference (optional)
        6. Remarks (optional)
2. This creates a maker checker request and does not create the SI entry or earmark balances yet
3. Another operator (checker) approves the MCH request and the SI is created.
4. After the SI is created, ALL the Account Obligations are automatically approved by the checker operator (see function 10 for details on approval process)
5. The created SI will have the status “under review” (on operator) / “processing” (on client)

**Operator List SI**

1. Operator can see the following in the SI table:
    1. Settlement Instruction ID
    2. Number of Transfer Legs
    3. External Reference
    4. Remarks
    5. Status
    6. Created By / Created At
2. Operator can filter by
    1. Settlement Instruction ID
    2. External Reference
    3. Remarks
    4. Involved Account
        1. e.g., I want all SIs that involve AccountA

**Operator View SI**

1. Operator can see the
    1. Settlement Instruction ID
    2. External Reference
    3. Remarks
    4. Transacted At
    5. Created At/ Updated At/ Created By/ Updated By
    6. All the transfer legs as a table; each leg shows:
        1. From Account
        2. To Account
        3. Asset
        4. Amount
        5. External Reference
        6. Remarks
2. Operator can also see all the “Account Obligations”, the status of each Account Obligation and the Net Obligations of each Account Obligation.

**Account Obligation Table**

1. Each Account Obligation has the following details:
    1. Account
    2. Status (awaiting approval, approved, rejected)
    3. Approved/ Rejected By:
    4. Approved/ Rejected At:
    5. Net Obligations
        1. Asset
        2. Amount
        3. Type (deliver / receive)

### Mockup

### Create Settlement Instruction

<https://www.figma.com/design/4cPmks5bKlgF8hgmfCrAcC/-FE-UI--Settlement-Instruction--Operator-User-?node-id=14-52205&t=wS2apZ2IrM2dFJdB-1> 

###   
  
List & View Details Settlement Instruction

#### **a. Under Review Status**

<https://www.figma.com/design/4cPmks5bKlgF8hgmfCrAcC/-FE-UI--Settlement-Instruction--Operator-User-?node-id=156-40636&t=wS2apZ2IrM2dFJdB-1> 

#### **b. Rejected Status**

<https://www.figma.com/design/4cPmks5bKlgF8hgmfCrAcC/-FE-UI--Settlement-Instruction--Operator-User-?node-id=174-65472&t=OBx8GBbgiqWCD5tB-1> 

## Function 9: \[Submitter client\] create settlement instruction

**Ticket: **[AM-1973](https://team-1602221989898.atlassian.net/browse/AM-1973)

### Details

**Context:**

1. For creation of SI, best is to have a separate permission for this, but grant the permission to submitter role
2. There are 3 types of transfer legs. From the UI perspective, these will look different. But from the API perspective, the input is just the account ID, regardless of whether the account was selected \]via dropdown or manual entry

| **Transfer Leg Type** | **Meaning** | **From Account** | **To Account** |
| --- | --- | --- | --- |
| Send | User is **sending from **an account they can access **to **an account they cannot access | User can choose account via dropdown | User has to enter counterparty’s account ID |
| Receive | User is** receiving to **an account they can access **from **an account they cannot access | User has to enter counterparty’s account ID | User can choose account via dropdown |
| Internal Transfer | User is transferring **from an account they can access to another account they can access ** | User can choose account via dropdown | User can choose account via dropdown |

**Flow:**

1. Submitter client can create a settlement instruction contains:
    1. External Reference
        1. \*optional
    2. 1 or more legs. Each leg will have:
        1. Type: Send / Receive / Internal Transfer
            1. \*this is on the create SI UI only, not recorded in the backend.
        2. From Account
            1. Option 1: From account is a dropdown. User can first select which entity, then select the account
                1. \*must be unified account
                2. \*no need to care about the account status
            2. Option 2: From account is manual entry, user has to key in a user ID
                1. \*the UI only checks that the formatting is correct, it does not check that the ID is valid, this can be done by the BE.
                2. \*note: if the submitter provides an invalid account ID, the BE will return error “Invalid account ID”, there is no need for a check on FE. 
                3. \*must be unified account
                4. \*no need to care about the account status
        3. To Account
            1. \*same 2 options as From account
        4. Asset
        5. Amount
        6. External Reference
2. Upon submission by a submitter, this will create a new settlement instruction with status awaiting client approval (operator platform) / awaiting approval (client platform). 
3. At this point, no funds are earmarked yet. There is no need to check any available balances at this point since the funds are only earmarked when the account obligation is approved

### Mockup

### Transfer Type → Send

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=141-97491&t=qUkEcCh6yrx0dOjr-1> 

### Transfer Type → Receive

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=141-97974&t=qUkEcCh6yrx0dOjr-1> 

### Transfer Type → Internal transfer

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=141-103647&t=qUkEcCh6yrx0dOjr-1> 

## Function 10: \[Approver Client\] approves / rejects settlement instruction’s account obligation

**Ticket: **[AM-1974](https://team-1602221989898.atlassian.net/browse/AM-1974)

### Details

**Context:**

1. For approval of SI, best is to have a separate permission for this, but grant the permission to approver role
2. Approval of an SI is required per involved account. For example, an SI has 10 legs and involves 5 accounts (A, B, C, D, and E). This means we have 5 Account Obligations (1 for each account) to be approved.
3. A user who has approver role to 1 or more accounts can approve multiple Account Obligations at once. For example, user 1 who has access to accounts A, D and E can approve the Account Obligations for all those 3 accounts.
4. During approval, the user can only see transfer legs that involve the accounts they have access to. For example, user 1 can only see any legs where Accounts A, D, and E are the From account or the To account.
5. Once the SI has been created by a submitter, only 1 approver is needed for each account. No need for a dual approval/ four-eyes principle for the other accounts in the SI.
    1. For example, a user with access to account A submits an SI that involves account A and B.
        1. 1 approver is needed for account A
        2. 1 approver is needed for account B → no need for the submitter for account B to be involved

**Flow:**

1. Approver client logs in and goes to the settlement instruction page. They click on a settlement instruction to see the legs. After inspection of relevant legs, the user can choose to approve/ reject the SI. 
    1. \*Note: The submitter of the SI cannot be approver.
2. Approver can key in a reason for the approval / rejection. For approval, this is optional. For rejection this is required
3. The approval / rejection will require MFA.
4. If the user chooses to approve it, the system will allow them to approve the Account Obligations for ALL the accounts that they have access to. BUT, the approver can also choose to approve only some of the Account Obligations. 
    1. For example, if the SI involves account A, B, C, D and E. If the user has access to accounts A, D and E, a single approval would be able to approve for accounts A, D and E. 
    2. But, the approver can also choose to only approve for accounts A and D
    3. This concept should be made clear to the user on the UI.
5. For every Account Obligation approved, system will:
    1. calculate the net delivery/ receive amount **per account per asset**
        1. Net delivery example:
            1. Leg 1: A → B 5 ETH
            2. Leg 2: C -\> A 2 ETH
            3. net delivery amount for A is 3 ETH
        2. Net receive example:
            1. Leg 1: A → B 5 ETH
            2. Leg 2: B -\> C 1 ETH
            3. net receive amount for B is 4 ETH
    2. For each net delivery amount, the assets should be earmarked (added to reserved balance)
        1. If there is insufficient available balance, throw error. The SI approval will fail and any earmarks created will be rolled back.
    3. For each net receive amount, the assets should be added to expected balance.
6. If all the Account Obligations for that SI has been approved, the status of the SI should update to “under review” (on operator) / “processing” (on client)
7. If the user instead, chooses to reject the SI, the relevant Account Obligation status will be updated to Rejected. The SI status will also be updated to “rejected” and the rejection reason for the SI will be auto-filled as “One of the counterparties has rejected the SI”
    1. All the earmarks and expected balances that have been created for the SI will be reversed.

### Mockups

### Approve Settlement Instruction

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=135-95461&t=qUkEcCh6yrx0dOjr-1> 

### Reject Settlement Instruction

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=135-101144&t=qUkEcCh6yrx0dOjr-1> 

## Function 11: \[Individual client/ Service User\] create settlement instruction (without approver)

**Ticket: **[AM-1975](https://team-1602221989898.atlassian.net/browse/AM-1975)

### Details

**Context:**

1. For direct creation of SI, best is to have a separate permission for this, but grant the permission to individual client / service user role

**Flow:**

1. Individual client user / service user can create a settlement instruction with the same details as the submitter client:
    1. External Reference
        1. \*optional
    2. 1 or more legs. Each leg will have:
        1. From Account
            1. \*must be unified account
            2. User must manually key in an account ID, this is not a dropdown
        2. To Account
            1. \*must be unified account
            2. User must manually key in an account ID, this is not a dropdown
        3. Asset
        4. Amount
        5. External Reference
2. Upon submission, this will create a new settlement instruction with status awaiting client approval (operator platform) / awaiting approval (client platform). 
    1. As part of the creation, all the Account Obligations that the Individual User/ Service User has access to will be created with approved status  (See function 10 for details on approval process)

### Mockup

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=141-115494&t=5MApu9JBYeZzxoHJ-1> 

## Function 12: \[Client\] list/ view settlement instruction

**Ticket: **[AM-1976](https://team-1602221989898.atlassian.net/browse/AM-1976)

### Details

**Context:**

1. A user should only be able to view SIs, if they have access to at least 1 account involved in the SI
2. A user should only be able to view a transfer leg, if they have access to at least 1 account involved in the transfer leg
    1. Note: It is okay for the customer to see their counterparty account details in the transfer leg. Counterparty account details include the account ID (but not the account name) and the name and ID of the entity that owns the account
3. A user should only be able to view an Account Obligation, **if it is for an account they have access to**.
    1. This includes the net deliver/receive details

**Flow:**

**List SI**

1. In the Client UI, under transactions, there should be a new tab called settlement instructions. When the user clicks on this, they will see a table of all the SIs that are relevant to their account. These are all the SIs that have at least 1 leg that contains the account.
2. User can see:
    1. SI ID
    2. Status
    3. External Reference
    4. Created At
3. User can filter:
    1. id
    2. status
    3. external reference

**View SI**

1. If the user clicks on a SI, they will see more details of the SI. This includes only all the legs that they are allowed to see.
2. The user can also see all the Account Obligations they are allowed to see, including:
    1. approved / rejected at
    2. approved / rejected by
        1. If the user can see this particular account obligation, that means they are under the same client as the user who approved/ rejected the account obligation. So we can show this user. 
    3. reason
    4. status

### Mockups

### Status - Awaiting Approval

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=61-109757&t=qUkEcCh6yrx0dOjr-1> 

### Status - Processing

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=132-88528&t=qUkEcCh6yrx0dOjr-1> 

### Status - Rejected

<https://www.figma.com/design/eag26FA5ZJiT7UTxx9Qv95/-FE-UI--Settlement-Instructions--Client-?node-id=133-65673&t=qUkEcCh6yrx0dOjr-1> 

## Function 13: \[Operator\] processes / rejects settlement instruction

**Ticket: **[AM-1977](https://team-1602221989898.atlassian.net/browse/AM-1977)

### Details

**Context:**

1. Once a SI has all its Account Obligations approved and the status is now “Under Review”, the operator can choose to process it or reject it.

**Flow:**

1. When a Settlement Instruction has status “Under Review”, the operator can choose to either click process or reject
2. If the operator processes it, the following happens atomically
    1. check first that the all relevant account status is “active”
        1. If any of the account status is not active, throw error. this can be done on the BE, no need for FE to do this check as well.
    2. all the assets move based on the transfer legs
        1. On the balance service, the value date for updates to the total balance should be the timestamp of processing the SI.
    3. all earmarks and expected balances are removed
    4. update the transactedAt to be the timestamp of processing the SI
    5. the SI status is updated to Completed
3. If the operator rejects it, the following happens atomically
    1. operator provides a reason
    2. all earmarks and expected balances are removed
    3. the SI status is updated to Rejected

### Mockups

### Process Settlement Instruction

<https://www.figma.com/design/4cPmks5bKlgF8hgmfCrAcC/-FE-UI--Settlement-Instruction--Operator-User-?node-id=16-43452&t=15xQtVUWPLFYMXVS-1> 

### Reject Settlement Instruction

<https://www.figma.com/design/4cPmks5bKlgF8hgmfCrAcC/-FE-UI--Settlement-Instruction--Operator-User-?node-id=16-55690&t=gEDVhlBtlHT8Vtht-1> 

## Function 14: \[System\] adding transactedAt

**Ticket: **[AM-2045](https://team-1602221989898.atlassian.net/browse/AM-2045)

**Context:**

1. Currently, when there is a token transaction, we do not record the timestamp that the transaction actually occurs (**Transacted At**). We only record the timestamp that the transaction is created/recorded on our system (**Created At**). There are a few scenarios where this issue would lead to **inaccurate** **statements** being shown to clients.
2. Example scenarios where Transacted At is important. 
    1. Unified Deposits 
    2. Unified Withdrawals 
    3. Unified Rebalances 
3. In the example scenarios above, we show a small time gap between the Created At and the Transacted At for different transactions. But, this time gap can often be much bigger, for example:
    1. If the transaction happens nearing midnight, the timestamps can be different dates
    2. If the transaction happens nearing a weekend/ public holiday, the timestamps can be a few days apart.

**Flow:**

**Auto-create token deposits**

1. When BEM auto-creates a token deposit (be it via Crypto APIs or DFNS), the system should auto-populate the Transacted At field based on the on-chain timestamp of the transaction.

**Manual create token deposits**

1. When BEM fails to auto-create a token deposit, and ops manually creates a token deposit, ops has to manually key in the Transacted At timestamp. This is a required field.

**Unified Deposit Transacted At**

1. When a Unified Deposit is created from a Token Deposit, the Transacted At is copied from the Token Deposit to the Unified Deposit.

**Auto-create token withdrawal transaction + update token withdrawal request**

1. When BEM auto-creates a token withdrawal transaction and token withdrawal request, the system should auto-populate the Transacted At field on both the token withdrawal transaction and Token Withdrawal Request based on the on-chain timestamp of the transaction.

**Manual create token withdrawal transaction + update token withdrawal request**

1. When BEM fails to auto-create a token withdrawal transaction, and ops manually creates a token withdrawal transaction, ops now has to manually key in the Transacted At timestamp. This is a required field.
2. The system currently, will find the corresponding Token Withdrawal Request and update the status to Completed. Now, it should also update the TWR’s Transacted At to be the same as that of the TWT.

**Unified Withdrawal Transacted At**

1. When a Unified Withdrawal is created, the Transacted At field is initially blank (null)
2. When a Unified Withdrawal is updated to Completed, the Transacted At field is filled from the Linked Token Withdrawal Request that completed it.

**Unified Rebalance Transacted At**

1. When a Unified Rebalance is created, the Transacted At field is initially blank (null)
2. When a Unified Rebalance is updated to Completed, the Transacted At field is filled from the Linked Token Withdrawal Request / Linked Token Deposit that completed it.

**Other Transactions Transacted At**

1. When ops creates an “Other Transactions”, the Transacted At needs to be filled manually. This is a required field.

**Downstream update to Balance Service**

1. When any of the following transactions update the balance service, it should also pass in the Transacted At as a value date (this is a datetime). This is only applicable for updates to `Total balance`. It is **not needed for reserved/ expected balance updates**.
    1. Token Deposit
    2. Token Withdrawal Request
    3. Token Withdrawal Transaction
    4. Unified Deposit
    5. Unified Withdrawal
    6. Unified Rebalance
    7. Other Transactions

**Mockups**

**Manual Create Token Deposits With Transacted At**  
<https://www.figma.com/design/da0bsxzcbFciumCti5PfCM/-FE-UI--Token-Deposit--Operator-User-?node-id=271-25751&t=QbTFxZhsEhms9xt1-1> 

  
**Unified Deposit Shows Transacted At**

<https://www.figma.com/design/rjMGC9u8ro9MPKNtyWTNHQ/-FE-UI--Unified-Deposit--Operator-User-?node-id=193-3601&t=Nvk5BtKUSYS5Kws4-1> 

**Manual Create Token Withdrawal Transaction with Transacted At**

<https://www.figma.com/design/VL1bIdSfIy0KK0ES7J2uIw/-FE-UI--Token-Withdrawal-Request---Transactions--Operator-User-?node-id=2420-18705&t=GISySWh2o9BX8mUG-1> 

**Update Details Token Withdrawal Request with Transacted At Information**


**Unified Withdrawal Transacted At**

<https://www.figma.com/design/QjiIfHQUdn2mOFnNJ0wcLS/-FE-UI--Unified-Withdrawal--Operator-User-?node-id=2211-101752&t=euDwhVcEMCFp9EMs-1> 

**Unified Rebalance Transacted At**

<https://www.figma.com/design/6Cvs3OWHuSj0ggyPWfQ2vs/-FE-UI--Unified-Rebalances--Operator-User-?node-id=502-63615&t=WF9VjSNRhdBo2t3x-1> 

**Other Token Transaction**  
  
**Create Other Token Transaction**  
  
<https://www.figma.com/design/ZkP4Y7YTgrMr4pZVnSiZSU/-FE-UI--Other-Transactions--Operator-User-?node-id=11-1249&t=StOZX5QSyHTSxPLD-1>   

**List & View Other Token Transaction**  
<https://www.figma.com/design/ZkP4Y7YTgrMr4pZVnSiZSU/-FE-UI--Other-Transactions--Operator-User-?node-id=12-2796&t=StOZX5QSyHTSxPLD-1> 


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
