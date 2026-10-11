# PRD - Whitelist Bank Account and Whitelist Address: Counterparty

Status: Draft for design. Written so a designer can work from it directly.
The create form first asks **Who is this for?** with a segmented control (**Client** or **Counterparty**). For a client, the existing **Scope** field (Account or Entity) follows, exactly as today. The stored field stays `scope` (`account`, `entity`, `counterparty`), and lists and detail pages keep the **Scope** label, with Counterparty as a new value.
Companion to: `PRD - Counterparties.md` (the counterparty record and its Whitelists tab).
Builds on: `Resources/PRD - Phase 1A- Asset Type and Whitelist bank account.md` (WBA) and the existing Whitelist Address feature.

---

## About the Document

### List of Personnel

| **Role** | **Name** |
| --- | --- |
| Product Manager | [TBD] |
| Designer | [TBD] |
| Tech Lead | [TBD] |
| QA | [TBD] |

---

## Overview

### Release Note

- Whitelisted Bank Accounts and Whitelist Addresses can now belong to a **counterparty** (a broker, exchange, issuer or fund), not only to a client account.
- Operators create them from the existing Whitelist create pages by choosing **Who is this for? Counterparty**, or from the counterparty page with **+ Add Bank Account** / **+ Add Wallet Address**, which opens the same form with the counterparty filled in and the choice replaced by a read-only line.
- A counterparty's bank account or wallet address can be **replaced** with a new version. The old version is retired once the new one is approved.
- Counterparty-scoped records are never shown to clients and can never be used as a client withdrawal destination.

### Problem Statement

The platform needs to know where to send assets to, and receive assets from, outside parties. A Whitelisted Bank Account and a Whitelist Address already hold exactly this information, with validation, maker-checker, audit and downstream use in movements. But both are owned by a client account or entity, and neither can be replaced while keeping history. Building a second, separate model for counterparty bank and wallet details would duplicate all of this.

### Solution Overview

1. Add a third value, `counterparty`, to the Scope field (`account`, `entity`, `counterparty`) on Whitelisted Bank Account and Whitelist Address, linked to a counterparty. On the form, a new segmented control **Who is this for?** (Client or Counterparty) sits above the existing Scope field. Client shows the Scope field (Account or Entity) as today. Counterparty hides it and shows the counterparty picker.
2. Operators create counterparty-scoped records on the existing create pages, or from the counterparty page (same form, counterparty preset and locked). Creation is always maker-checker. Client creation paths are not available for this scope.
3. A counterparty-scoped record has no bank statement or reliance step. It has an optional **verification note** instead.
4. A counterparty-scoped record can be **replaced** (new version). When the replacement is approved, the previous version becomes `retired`. This applies to counterparty scope only.
5. One record per currency (bank accounts) and per asset and address (wallet addresses). A bank account used in several currencies is several records.
6. The counterparty page lists these records and offers add shortcuts (see `PRD - Counterparties.md`, FR-9). Replace is on the record's detail page.
7. Counterparty-scoped records are excluded from every client-facing screen and API, and from client withdrawal destinations.

### In Scope

- Counterparty scope on Whitelisted Bank Account and Whitelist Address: create, list, view.
- Verification note, version, replace, retire.
- Approve and reject for counterparty scope.
- Client isolation rules.
- Effects of counterparty suspend and close.

### Out of Scope

| **Item** | **Reason** |
| --- | --- |
| Replace and retire for client-scoped (account or entity) records | Decision: counterparty scope only first |
| One record covering several currencies | Decision: one record per currency |
| Securities settlement details | No securities movement model yet |
| Callback verification and first-payment hold | Possible later additions |
| Using these records on settlement instruction legs | Later Settlement Instruction PRD |

### Actors

- **Operator (maker / checker):** creates, replaces, approves and rejects counterparty-scoped records. The checker is always a different operator.
- **Compliance user:** can list and view, as for other whitelist records.
- **Client user:** has no access to counterparty-scoped records.

### Assumptions & Dependencies

- `PRD - Counterparties.md` is delivered first or together. A counterparty must exist and be `active`.
- Maker-checker, audit log, address-format validation per blockchain and the existing WBA and Whitelist Address screens are reused.
- Existing behaviour for account and entity scope does not change.
- The existing Whitelist Address form fields (label, blockchain, asset, address, recipient, address origin) are as in the current screen.

### Glossary

| **Term** | **Definition** |
| --- | --- |
| Scope | Who a whitelist record belongs to: `account`, `entity` (WBA only) or, new, `counterparty`. On the form, Account and Entity are chosen in the existing Scope field after choosing Client; Counterparty is chosen with Who is this for?. |
| Counterparty-scoped record | A Whitelisted Bank Account or Whitelist Address with scope `counterparty`. |
| Version | Counterparty-scoped records are immutable. A change is a new version. |
| Retired | A previous version that has been replaced, or whose counterparty is closed. Cannot be used by new settlements. |
| Verification note | Optional free text recording how the details were confirmed. |

---

### Navigation: Whitelist Management

Whitelists move out of Account Management into their own sidebar item.

| **Item** | **Change** |
| --- | --- |
| Sidebar | New top-level item **Whitelist Management** in the Operator UI, after Account Management and before Counterparty Management. It opens Whitelist Addresses |
| Page | Title "Whitelist Management" with two tabs: **Whitelist Addresses** and **Whitelist Bank Accounts**. The lists, filters, Export CSV and Add New button are unchanged and apply to the selected tab |
| Account Management | The Whitelists tab is removed. Clients, Entities and Accounts remain |
| Routes | The pages move from `/account-management/whitelists/addresses` and `/account-management/whitelists/bank-accounts` (and their `create` and detail pages) to `/whitelist-management/addresses` and `/whitelist-management/bank-accounts`. The old URLs redirect to the new ones so existing links and bookmarks keep working |
| Breadcrumbs | Dashboard > Whitelist Management > Whitelist Addresses (or Bank Accounts) > [record or Add] |
| Other places that use the old path | Audit-log navigation paths, the Add New header button, the Maker Checker links to whitelist records, the withdrawal pages that link to a whitelisted bank account, and any docs or tests that name the old route. Update all of them |
| Permissions | Unchanged. The same whitelist permissions apply to the new item |

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| New item | Given an operator Then the sidebar shows Whitelist Management between Account Management and Counterparty Management |
| Tabs | Given Whitelist Management When the operator selects a tab Then the matching list is shown and the URL reflects it |
| Account Management | Given Account Management Then there is no Whitelists tab |
| Old links | Given a bookmark to the old whitelist URL Then it redirects to the matching new page |
| Breadcrumb | Given a whitelist detail page Then the breadcrumb starts Dashboard > Whitelist Management |

---

## Functional Requirements

### Section 1: Whitelisted Bank Account

#### FR-1: [Operator] Create a Whitelisted Bank Account with Counterparty Scope

**Requirement Details**
As an operator, I want to add a bank account for a counterparty so that we can settle with it.

**Precondition:** Operator holds the WBA create permission. The counterparty is `active`.

**Main Flow**
1. Operator opens Whitelist Management > Whitelist Bank Accounts > Add New. The first control is **Who is this for?**, a segmented control with **Client** (selected by default) and **Counterparty**. For Client, the existing **Scope** radio (Account, Entity) follows and the form works as today. For Counterparty, the Scope radio is hidden, a one-line helper reads "An outside party we settle with. Operators only, never shown to clients." and the Counterparty picker is shown. (Or, from a counterparty page: Whitelists tab > Bank Accounts > **+ Add Bank Account**. The same form opens without the control. It shows a read-only line "Who is this for? Counterparty · [name]", and the counterparty field is not repeated. On submit or Exit the operator returns to that tab.)
2. When Counterparty is chosen, the Client, Entity and Account fields are replaced by a **Counterparty** picker (active counterparties only; name and type shown). The picker is not shown when the form is opened from a counterparty page or to replace a record.
3. Operator completes the form (see Fields) and clicks Submit.
4. System validates and shows the review modal with all values and a comment box.
5. On confirm, system creates a maker-checker request. The record is created with status `under_review`.
6. A different operator approves or rejects (FR-5).
7. Success toast: "Bank account submitted. Awaiting approval by another operator." with a View Details button.

**Form fields by scope**

| **Section** | **Field** | **Account / Entity scope (today)** | **Counterparty scope (new)** |
| --- | --- | --- | --- |
| Whitelist Details | Who is this for? | n/a (always a client) | Segmented control: **Client** (default), **Counterparty**. Hidden and replaced by a read-only line when opened from the counterparty page or for Replace |
| | Scope | Radio: Account, Entity | Shown only for Client (today's field, unchanged). Hidden for Counterparty |
| | Client | Required | Hidden |
| | Entity | Required | Hidden |
| | Account | Required for Account scope | Hidden |
| | Counterparty | n/a | **Required**, picker, active only. Preset and locked when opened from the counterparty page |
| | Copy details from | n/a | Optional select of existing records of the same counterparty. Pre-fills the bank, beneficiary and address fields; the currency is cleared |
| | Label | Required | Required. Unique within the counterparty (see Validations) |
| | Asset (currency) | Required, fiat | Required, fiat |
| Bank Details | Bank country, SWIFT/BIC, then **Account number / IBAN** (in that order). Intermediary SWIFT and Routing code are behind "+ Add intermediary bank or routing code" (see Form layout below) | As today | As today, with the layout in Form layout below |
| Beneficiary Profile | Beneficiary name | Required | Required. Pre-filled with the counterparty name (editable). Soft warning if it differs from the counterparty name |
| Beneficiary Address | Country, Town/City required; Postal code and Street name optional; Building name, Building no., Floor and Room behind "+ Add building, floor or room" (see Form layout below) | As today | As today, with the layout in Form layout below |
| Supporting Document | Bank statement | Required unless client reliance | **Hidden** |
| Verification | Verification note | n/a | Optional, multi-line, max 500. Hint: "Optional record of how these details were confirmed, e.g. 'confirmed by email from known contact on 3 Oct'. Shown to the approver." |

**Validations** (at submission and again at checker approval)

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Counterparty exists | `RECORD_NOT_FOUND` | The counterparty could not be found. |
| Counterparty is active | `INVALID_RECORD_STATE` | The counterparty is not active. |
| Required fields present | `MISSING_REQUIRED_FIELD` | Supply all required bank account fields. |
| SWIFT is exactly 8 or 11 characters | `INVALID_FORMAT` | SWIFT code must be exactly 8 or 11 characters. |
| Label unique within the counterparty (ignoring retired and rejected) | `ALREADY_EXISTS` | A record with this label already exists for this counterparty. |
| Same account number + SWIFT + currency not already used for this counterparty (ignoring retired and rejected) | `ALREADY_EXISTS` | These bank details already exist for this counterparty and currency. |
| Asset is a fiat currency | `INVALID_ARGUMENT` | The asset must be a fiat currency. |

**Form layout (applies to the bank account form for every value of Who is this for?, unless marked counterparty only)**

| **#** | **Change** | **Why** |
| --- | --- | --- |
| 1 | Supporting Document: the section text must not contradict the field. Today it says "required for most clients" while the field is marked "(optional)". Mark Bank Statement **Required**, and state the exception in the helper: "Not needed if the client has a reliance arrangement." Counterparty records hide this section | Avoids users guessing whether it is required |
| 2 | Beneficiary Profile banner. **Client only:** keep "The bank account must be held in the account holder's name. We do not support withdrawals to third-party accounts." **Counterparty:** no banner. The pre-filled name, the Beneficiary name tooltip and the soft warning when the name differs from the counterparty already cover it | The client withdrawal rule does not apply to counterparties, and a counterparty may legitimately be paid into an account under another name |
| 3 | Beneficiary Address: show Country, Town/City, Postal code and Street name. Below them a text button **+ Add building, floor or room**. Clicking it replaces the button with a group titled "Building details (optional)" holding **Building name**, **Building no.**, **Floor** and **Room** in one row of four, with example placeholders (Tower A, 12, 5, 501) and no "(optional)" on each label. The group has a "Remove" link that clears the values and brings the button back. The group is shown from the start when any of the four has a value | Cuts the form height, same data, no native toggle control |
| 4 | Bank Details: a text button **+ Add intermediary bank or routing code** reveals a group "Intermediary bank and routing (optional)" with **Intermediary bank SWIFT** and **Routing code** side by side, a "Remove" link, and the existing tooltips. Shown from the start when either has a value | Rarely used fields add noise |
| 5 | Bank Details order: Bank country, SWIFT/BIC, then Account number / IBAN | Bank first, account second |
| 6 | **Counterparty only:** Beneficiary name is pre-filled with the counterparty name, with the hint "Filled in from the counterparty name. Change it if the bank account is held under another name." | Saves typing and avoids typos |
| 7 | All paired fields use the same two-column grid, and placeholders and "(optional)" wording are consistent | Visual consistency |

Not in this version (need a service or a decision): showing the bank name found for a SWIFT code, and per-country IBAN validation (Open Items).

**Design Constraints**
- The same account number and SWIFT in a *different* currency is allowed. This is how one bank account is used in several currencies.
- The soft warning on beneficiary name is non-blocking. It uses normalised comparison.
- Bank statement, reliance logic and the client approval step do not apply to this scope.
- Scope and Who is this for? cannot be changed after creation.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Who is this for? | Given Counterparty Then Client, Entity, Account and Bank Statement are hidden, Scope is hidden, and Counterparty and Verification note are shown. Given Client (the default) Then the Scope radio (Account, Entity) and today's form are shown |
| From the counterparty page | Given the operator clicks "+ Add Bank Account" on an active counterparty Then the form opens without the Who is this for? control, shows "Counterparty · [name]" as a read-only line, and the record created is the same as one created from the Whitelist page |
| Add disabled | Given a suspended or closed counterparty, or one with a pending request Then the add button on the counterparty page is disabled with a tooltip |
| Active only | Given a suspended counterparty Then it is not offered in the picker |
| Submit | Given valid details When the operator confirms the review modal Then a maker-checker request is created and the record is `under_review` |
| Missing counterparty | Given no counterparty is chosen When the operator submits Then "Counterparty is required" is shown |
| Multi-currency | Given SGD details exist for an account When the operator adds the same account and SWIFT in USD Then it is accepted |
| Duplicate | Given the same account, SWIFT and currency exist for the counterparty Then submission is blocked with the duplicate error |
| Copy details | Given an existing record is selected in "Copy details from" Then bank, beneficiary and address fields are pre-filled and Currency is empty |
| Name warning | Given the beneficiary name differs from the counterparty name Then a non-blocking warning is shown |
| Optional note | Given the verification note is empty Then submission is allowed |
| Optional groups | Given a new bank account form Then Intermediary SWIFT, Routing code and the building, floor and room fields are hidden behind "+ Add" text buttons, each group shows when its button is clicked or when it already holds a value, and Remove clears it and hides it again |
| Name pre-fill | Given a counterparty is chosen (or the form is opened from the counterparty page) Then Beneficiary name is pre-filled with the counterparty name and can be edited |
| No client banner | Given Who is this for? = Counterparty Then the Beneficiary Profile section shows no "Important" banner. Given Client Then the banner is shown as today |
| Client path | Given a client user Then counterparty scope is not offered |

---

#### FR-2: [Operator] List Whitelisted Bank Accounts (Counterparty Scope)

**Requirement Details**
As an operator, I want counterparty bank accounts to appear in the existing list, clearly distinguished from client ones.

**Changes to the list**

| **Item** | **Change** |
| --- | --- |
| New filter **Owner** | Multi select: Client, Counterparty. Matches the first question on the Add form (Who is this for?) |
| Filter **Scope** | Keeps today's meaning and offers only **Account** and **Entity**. Disabled, with the hint "Only applies to clients", when Owner is Counterparty alone. Not shown on the Whitelist Address list (addresses are account-only) |
| Filter **Counterparty** | Select, multi; name and type. Disabled, with the hint "Only applies to counterparties", when Owner is Client alone |
| Status filter | Adds **Retired** |
| New column **Owner** | A tag, **Client** (blue) or **Counterparty** (gold), then the name. Client: the client's name. Counterparty: the counterparty name |
| Column **Scope** (kept; was "Scope \| Account/Entity ID") | **Account** with the account number underneath, or **Entity** with the entity ID underneath. A counterparty row shows "-" (a counterparty has no scope). Not shown on the Whitelist Address list |
| Column "Label \| ID" | Adds a small "v2" tag next to the label when version is above 1 |
| Status badge | Adds Retired (grey) |
| Client-only filters (Account, Entity) | Remain; they return no counterparty rows |

All existing behaviour stays: URL-saved filters, Export CSV, default page size 10. Export includes the counterparty and version columns.

**Embedded mode on the counterparty page:** the list is embedded in the Whitelists tab of `PRD - Counterparties.md` (FR-9), pre-filtered to one counterparty. In embedded mode the filters and header buttons are hidden, the columns are Label, Currency or Asset, key detail, Version, Status and Created at, and only a "Show retired" control is offered.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Filter by Owner | Given mixed records When the operator filters Owner = Counterparty Then only counterparty records appear, and the Scope filter is disabled |
| Client only | Given Owner = Client Then the Counterparty filter is disabled and only client rows appear |
| Scope | Given Scope = Entity Then only client entity whitelists appear |
| Filter by counterparty | Given records for two counterparties When the operator selects one Then only its records appear |
| Owner and Scope columns | Given a counterparty row Then Owner shows the gold Counterparty tag and the name, and Scope shows "-". Given a client account row Then Owner shows the blue Client tag and the client name, and Scope shows Account and the account number. Given a client entity row Then Scope shows Entity and the entity ID |
| Retired | Given a retired record When the operator filters Status = Retired Then it appears with a grey badge |
| Version tag | Given version 2 Then "v2" is shown beside the label |

---

#### FR-3: [Operator] View a Whitelisted Bank Account (Counterparty Scope)

**Requirement Details**
As an operator, I want the detail page to show the counterparty, version and history.

**Changes to the detail page**

| **Item** | **Counterparty scope** |
| --- | --- |
| Left column "Account / Entity" row | Replaced by **Counterparty** (link to the counterparty detail) |
| KYC Reliance, Bank Statement rows | Hidden |
| New rows | Version, Replaces (link to previous version), Verification note |
| Status | Under review, Approved, Rejected, **Retired** |
| Banners | Approved: "Bank account approved. It can be used for settlement with this counterparty." Retired: "This version has been replaced by version N" or "Retired because the counterparty is closed." Rejected: as today |
| Header actions | Under review: Approve, Reject (unchanged). Approved: **Replace** (FR-4), shown only if the counterparty is active and no replacement is pending. While a replacement is pending: no actions and a "Replacement pending" tag |

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Owner | Given a counterparty record Then the detail shows Who is this for? = Counterparty and a Counterparty row that links to the counterparty, and no Scope row. Given a client record Then it shows Who is this for? = Client, a Scope row (Account or Entity) and an Account or Entity row |
| Hidden rows | Given counterparty scope Then KYC Reliance and Bank Statement are not shown |
| History | Given version 2 Then "Replaces version 1" links to version 1 |
| Replace visibility | Given an approved record and an active counterparty Then Replace is shown |
| Suspended | Given a suspended counterparty Then Replace is not shown |

---

#### FR-4: [Operator] Replace a Whitelisted Bank Account (Counterparty Scope)

**Requirement Details**
As an operator, I want to change a counterparty's bank details without editing the approved record, so that history is kept and open settlements are not affected.

**Main Flow**
1. On an approved record, operator clicks Replace.
2. The create form opens pre-filled. Who is this for?, counterparty and currency are read-only. A notice says: "Open settlements keep the details they were created with. This creates version N and retires version N-1 when approved."
3. Operator edits and submits through the same review modal and maker-checker as FR-1.
4. A new record (version N, `replaces` set) is created as `under_review`. The old version stays `approved` and shows "Replacement pending".
5. On approval the new version becomes `approved` and the old one becomes `retired`, in one step. On rejection the old version stays `approved`.

**Design Constraints**
- Only one replacement can be pending per record.
- The label may stay the same as the version it replaces.
- Not available for account or entity scope.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Replace | Given approved version 1 When a replacement is approved Then version 2 is approved and version 1 is retired |
| Pending | Given a replacement is pending Then Replace is hidden and the row shows "Replacement pending" |
| Rejected | Given the checker rejects Then version 1 stays approved |
| Locked fields | Given the Replace form Then scope, counterparty and currency are read-only |
| Same label | Given the label is unchanged Then the form is accepted |
| In-flight | Given an open settlement used version 1 Then it still shows version 1 after the replacement |

---

#### FR-5: [Operator] Approve or Reject (Counterparty Scope)

**Requirement Details**
As a second operator, I want to review counterparty-scoped records before they can be used. This applies to both bank accounts and wallet addresses.

**Main Flow**
1. The checker opens the record (status `under_review`) and sees all values, the verification note and the maker's comment. For a replacement, a side-by-side comparison with the current version is shown and changed values are highlighted.
2. Checker approves (optional remarks) or rejects (reason code required, remarks optional).
3. On approval the system revalidates (see Validations).

**Reject reason codes**
- Bank account: `INVALID_BANK_DETAILS`, `NAME_MISMATCH`, `OWNERSHIP_NOT_VERIFIED`, `DUPLICATE`, `OTHER`.
- Wallet address: `INVALID_ADDRESS`, `OWNERSHIP_NOT_VERIFIED`, `DUPLICATE`, `OTHER`.

**Validations at approval**

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Checker is a different user from the maker | `SELF_APPROVAL_NOT_PERMITTED` | The maker cannot approve their own request. |
| Record is under review | `INVALID_RECORD_STATE` | This request is not awaiting approval. |
| Counterparty is still active | `INVALID_RECORD_STATE` | The counterparty is not active. |
| No duplicate created since submission | `ALREADY_EXISTS` | These details already exist for this counterparty. |

A failed approval leaves the request awaiting approval.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Approve | Given an under review record When a different operator approves Then it becomes approved and an audit event is written |
| Reject | Given a rejection with a reason code Then the record is rejected and cannot be used |
| No reason | Given Reject is chosen with no reason Then confirmation is blocked with "Reason is required" |
| Own request | Given the maker Then Approve and Reject are not available |
| Compare | Given a replacement Then old and new values are shown side by side with changes highlighted |
| Suspended meanwhile | Given the counterparty was suspended after submission When the checker approves Then approval fails with `INVALID_RECORD_STATE` |

---

### Section 2: Whitelist Address

#### FR-6: [Operator] Create a Whitelist Address with Counterparty Scope

**Requirement Details**
As an operator, I want to add a wallet address for a counterparty so that we can send tokens to it and recognise tokens coming from it.

**Precondition:** The counterparty is `active`.

**Form fields by scope**

| **Field** | **Account scope (today)** | **Counterparty scope (new)** |
| --- | --- | --- |
| Who is this for? | n/a (account only) | Segmented control: **Client** (default), **Counterparty**. Hidden and replaced by a read-only line when opened from the counterparty page or for Replace. Wallet addresses have no Scope row (account only) |
| Account | Required | Hidden |
| Counterparty | n/a | **Required**, picker, active only |
| Address Label | Required | Required. Unique within the counterparty |
| Blockchain Network | Required | Required |
| Asset | Required | Required |
| Address | Required, format per blockchain | Required, format per blockchain |
| Who is the recipient | Same as account holder / Different person | Set automatically to the counterparty: name shown read-only, country from the counterparty |
| Address Origin (Exchange, Non-custodial Wallet, Others, with VASP detail) | As today | As today (kept for travel rule; see Open Items) |
| Verification note | n/a | Optional, max 500 |

**Validations** (at submission and at checker approval)

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Counterparty exists and is active | `INVALID_RECORD_STATE` | The counterparty is not active. |
| Address format valid for the blockchain | `INVALID_FORMAT` | The wallet address is not valid for the selected blockchain. |
| Label unique within the counterparty (ignoring retired and rejected) | `ALREADY_EXISTS` | A record with this label already exists for this counterparty. |
| Same address, blockchain and asset not already used by a counterparty-scoped record (ignoring retired and rejected) | `ALREADY_EXISTS` | These wallet details already exist. |
| Required fields present | `MISSING_REQUIRED_FIELD` | Supply all required wallet address fields. |

**Main Flow:** same as FR-1: review modal, maker-checker, status `under_review`, success toast.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Who is this for? | Given Counterparty Then Account is hidden and Counterparty is shown; the recipient fields are filled from the counterparty and read-only |
| Submit | Given valid details Then a maker-checker request is created and the record is under review |
| Invalid address | Given an address that fails the chain format Then the address field shows the format error |
| Duplicate | Given the same address, blockchain and asset exist for a counterparty Then submission is blocked |
| Multiple assets | Given the same address for two assets Then two records are accepted (one record per asset) |
| Client | Given a client user Then counterparty scope is not offered |

---

#### FR-7: [Operator] List and View a Whitelist Address (Counterparty Scope)

**Changes**
- **List:** the same filters and Owner column as FR-2 (Owner, Counterparty, Status; no Scope filter or column because addresses are account-only); Status filter adds Retired; new Counterparty filter; the owner shown for counterparty scope is the counterparty name; "v2" tag beside the label; Retired badge.
- **Detail:** the Account row is replaced by Counterparty (link). New rows: Version, Replaces, Verification note. Banners and header actions as in FR-3 (Approve, Reject while under review; Replace when approved, counterparty active and no replacement pending).

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Filter | Given mixed records When Owner = Counterparty Then only counterparty addresses appear |
| Detail | Given a counterparty-scoped address Then the Counterparty row links to the counterparty and version and history are shown |
| Retired | Given a retired address Then it appears only when the Retired status is selected or the filter is empty |

---

#### FR-8: [Operator] Replace a Whitelist Address (Counterparty Scope)

Same rules as FR-4. Who is this for?, counterparty, blockchain and asset are read-only; the address and label can change. On approval the new version becomes approved and the old version is retired.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Replace | Given approved version 1 When a replacement is approved Then version 2 is approved and version 1 is retired |
| Pending | Given a replacement is pending Then Replace is hidden and "Replacement pending" is shown |
| Locked fields | Given the Replace form Then blockchain and asset are read-only |

---

### Section 3: Cross-cutting Rules

#### FR-9: [System] Client Isolation

**Requirement Details**
Counterparty-scoped records must never reach a client.

**Rules**
1. Client lists, detail views, exports, filters and pickers for Whitelisted Bank Accounts and Whitelist Addresses exclude counterparty scope.
2. A direct request by a client for a counterparty-scoped record by ID returns `NOT_FOUND`.
3. Client withdrawal destination pickers and validation never accept a counterparty-scoped record. A withdrawal naming one is rejected with `WBA_SCOPE_MISMATCH` (bank) or the equivalent address error.
4. The scope value `counterparty` is not an allowed value in client create requests (`UNSUPPORTED_VALUE`).
5. Counterparty-scoped records may only be used by settlement legs (later PRD).

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Client list | Given counterparty-scoped records exist Then a client's whitelist lists do not include them and totals exclude them |
| Direct access | Given a client requests a counterparty-scoped ID Then `NOT_FOUND` is returned |
| Withdrawal | Given a client submits a withdrawal to a counterparty-scoped record Then it is rejected |
| Client create | Given a client create request with scope counterparty Then `UNSUPPORTED_VALUE` is returned |
| Export | Given a client exports Then counterparty rows are not included |

---

#### FR-10: [System] Effects of Counterparty Suspend and Close

| **Counterparty event** | **Effect on its bank accounts and wallet addresses** |
| --- | --- |
| Suspended | New records and replacements cannot be created (FR-1, FR-4, FR-6, FR-8 show "The counterparty is not active"). Existing approved records stay approved and visible. Pending requests cannot be approved (FR-5) |
| Reactivated | Creating, replacing and approving are available again |
| Closed | All approved records become `retired`. Under review records are rejected with the reason "Counterparty closed". Audit events are written |

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Suspend blocks create | Given a suspended counterparty Then it is not offered in the pickers and create or replace is blocked |
| Existing stay | Given a suspended counterparty Then its approved records stay approved |
| Close retires | Given a counterparty is closed Then all its approved records become retired |
| Pending on close | Given an under review record When the counterparty is closed Then the record is rejected |

---

### Tooltip copy

Short help text for the "?" icons on the create form. Keep each under about 140 characters. Fields marked "new" have no tooltip today.

| **Field** | **Tooltip** | **Form** |
| --- | --- | --- |
| Who is this for? | No tooltip. For Counterparty a helper line shows: "An outside party we settle with. Operators only, never shown to clients." | Both |
| Scope (Account, Entity) | Account: only this account can use the whitelist. Entity: every account of the entity can use it. | Bank account |
| Label (new) | A name your team will recognise, for example "LP SGD bank (DBS)". It must be unique for this counterparty. | Both (counterparty) |
| Copy details from (new) | Fills in the bank, beneficiary and address fields from another record of this counterparty. You choose the currency yourself. | Bank account |
| Asset (currency) (new) | The currency this bank account receives. If the same account is used in another currency, add it again as a separate record. | Bank account |
| SWIFT/BIC | The bank's code, 8 or 11 characters, for example DBSSSGSG. It identifies the bank, not the account. | Bank account |
| Account number / IBAN (new) | The account number exactly as the bank shows it. For IBAN countries, enter the full IBAN without spaces. | Bank account |
| Intermediary bank SWIFT | Only needed when payments must go through another bank first. Use the code the beneficiary bank gave you. | Bank account |
| Routing code | A local bank code such as a sort code, ABA routing number or BSB. Only some countries need it. | Bank account |
| Beneficiary name (new) | The account holder's name exactly as the bank has it. A different name can make the bank reject the payment. | Bank account |
| Blockchain Network (new) | The network the address is on. Sending on the wrong network can lose the funds. | Wallet address |
| Asset (new) | The token this address receives. If the same address is used for another asset, add it again as a separate record. | Wallet address |
| Address (new) | The wallet address exactly as the counterparty gave it. It is checked against the selected network. | Wallet address |
| Address origin | Where the address is held, such as an exchange or a private wallet. Kept for the travel rule. | Wallet address |
| Verification note (new) | How you confirmed these details, for example "confirmed by email from known contact on 3 Oct". The approver sees it. | Both (counterparty) |

---

## Non-Functional Requirements

- **Security:** operator permissions enforced at the API. Counterparty-scoped data is never returned to clients, including in totals, counts, exports and error messages.
- **Audit:** every create, approve, reject, replace and retire is recorded with user, time and before and after values.
- **Concurrency:** one pending maker-checker request per record. Others return `MCH_REVIEW_IN_PROGRESS`.

---

## Technical Specifications

### Data Model Changes

**Whitelisted Bank Account** (existing; changes only)

| **Field** | **Change** | **Rules** |
| --- | --- | --- |
| `scope` | Add value `counterparty` | Values: `account`, `entity`, `counterparty`. Immutable |
| `counterpartyId` | New, conditional | Required when scope is `counterparty`; FK to Counterparty. Null otherwise |
| `accountId`, `entityId` | Unchanged | Not set for counterparty scope |
| `status` | Add value `retired` | `awaiting_client_approval` is not used for counterparty scope |
| `bankStatement` | Unchanged | Not required for counterparty scope |
| `verificationNote` | New | Text, max 500, optional |
| `version` | New | Integer, default 1. Used for counterparty scope |
| `replacesId` | New | FK to the previous version. Optional |
| `replacementPending` | New | Boolean. True while a replacement is awaiting approval |

**Whitelist Address** (existing; changes only)

| **Field** | **Change** | **Rules** |
| --- | --- | --- |
| `scope` | New | Values: `account` (default for existing rows), `counterparty` |
| `counterpartyId` | New, conditional | Required when scope is `counterparty` |
| `accountId` | Unchanged | Not set for counterparty scope |
| `status` | Add value `retired` | `awaiting_client_approval` and `cancelled` are not used for counterparty scope |
| `verificationNote`, `version`, `replacesId`, `replacementPending` | New | As above |
| `recipient` fields | Unchanged | Filled from the counterparty for this scope |

**Uniqueness (counterparty scope, ignoring retired and rejected records)**
- Bank: (`counterpartyId`, `label`) and (`counterpartyId`, account number, SWIFT, asset).
- Address: (`counterpartyId`, `label`) and (blockchain, address, asset).

### Status Diagram (counterparty scope)

| **Status** | **Operator Label** | **Client Label** | **Meaning** | **Next** |
| --- | --- | --- | --- | --- |
| `under_review` | Under review | not shown | Awaiting a different operator | `approved`, `rejected` |
| `approved` | Approved | not shown | Usable for settlement | `retired` |
| `rejected` | Rejected | not shown | Declined | none |
| `retired` | Retired | not shown | Replaced, or counterparty closed | none |

### Permissions

| **Operation** | **Operator Admin** | **Operator User** | **Compliance** | **Client** |
| --- | --- | --- | --- | --- |
| Create, replace (counterparty scope) | - | Y | - | No access |
| Approve, reject (not own request) | - | Y | - | No access |
| List, view | - | Y | Y | No access |

(As for existing whitelist permissions. Confirm with the permission model owner.)

### Audit Log Events

Bank account: existing `whitelisted_bank_account.create`, `.approve`, `.reject`, plus new `whitelisted_bank_account.replace` and `whitelisted_bank_account.retire`. Wallet address: equivalent events (names to be confirmed). Each carries `counterpartyId`, `version`, `replacesId`, and for retire the reason (`replaced` or `counterparty_closed`).

### Error Codes Used

`RECORD_NOT_FOUND`, `INVALID_RECORD_STATE`, `MISSING_REQUIRED_FIELD`, `INVALID_FORMAT`, `INVALID_ARGUMENT`, `ALREADY_EXISTS`, `SELF_APPROVAL_NOT_PERMITTED`, `MCH_REVIEW_IN_PROGRESS`, `UNSUPPORTED_VALUE`, `NOT_FOUND`, `WBA_SCOPE_MISMATCH`.

---

## Design Notes (reuse existing patterns)

| **Need** | **Reuse** |
| --- | --- |
| Create form | Existing WBA and Whitelist Address create pages; add the Who is this for? segmented control (Ant `Segmented`) above the existing Scope field and show or hide sections. The counterparty page opens the same form with the counterparty preset |
| Counterparty picker | Searchable select showing name and type, like the account search select |
| Review modal | Existing WBA review modal (Bank Details and Beneficiary Details tabs) |
| Detail page | Existing `DetailsPageLayout` entries; add Version and Replaces rows |
| Approve and reject modals | Existing WBA modals (reason codes) |
| Banners | Existing `Alert` styles |
| List | Existing filters, URL-saved state and Export CSV |

Mockups to be designed: the Who is this for? control on both create pages; the form opened from the counterparty page with locked fields; Replace form with notice; detail with Version and Replaces; replacement compare view; retired and replacement-pending states in the lists.

---

## Open Items

1. **Whitelist Address creation by operators:** confirm it already uses maker-checker, as the WBA does. If not, the counterparty scope should still require it.
2. **Address origin and travel rule:** confirm that Address Origin (and VASP detail) is still required for counterparty addresses. It is assumed required.
3. **Wallet proof:** evidence beyond the verification note (test transfer, signed message) is deferred.
4. **Beneficiary name warning:** non-blocking for now. Should it become blocking for regulated counterparties?
5. **Existing event names** for Whitelist Address audit need confirming.
6. **Account scope on Whitelist Address:** today the form is account-only. Adding an explicit scope field changes existing data; existing rows default to `account`.
7. **Later:** replace and retire for client-scoped records, one record covering several currencies, a copy of the whitelist details onto a new counterparty.
8. **Bank name from SWIFT and IBAN checks:** show the bank name found for a SWIFT/BIC code, and validate IBAN by country. Needs a lookup service and a country list; not in this version.
9. **Label:** "Who is this for?" is the new control. The existing "Scope" label is kept for the Account / Entity choice and for lists and detail pages. Confirm with the team.
