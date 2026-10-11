# PRD - Counterparties (Outside Parties)

Status: Draft for design. Written so a designer can work from it directly.
Companion PRD: `PRD - Whitelist Bank Account and Address - Counterparty Scope.md`.
Related: `PRD - Manual Outgoing Movement Booking and Classification.md` (movements with no instruction), `Settlement Changes Proposal.md` (section 4), later PRD: Settlement Instruction with external legs (will live in this folder).

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

- Operators can register outside parties (brokers, exchanges, issuers, funds) as **Counterparties**. Their bank accounts and wallet addresses are held as Whitelisted Bank Accounts and Whitelist Addresses with a counterparty scope.
- Every counterparty, and every bank account or wallet address added for it, goes through operator review and a second operator's approval.
- A counterparty can be suspended in an emergency and closed when no longer used.
- Clients can pick an existing counterparty when they build a settlement instruction, but cannot create one.
- The counterparty page opens with a summary (status, key facts, items needing attention), then shows where we settle and what is open.

### Problem Statement

A settlement instruction can only move assets between accounts held on the platform. To settle trades with brokers, subscribe to funds or receive tokens from issuers, the platform needs to know who the outside party is and where to send assets to or receive assets from. Today there is no record for this. The closest patterns, the Whitelisted Bank Account (a client's own approved bank destination) and the Account (a custody account), do not fit: an outside party is shared across clients, is not a custody account, and needs its own lifecycle and controls.

### Solution Overview

1. An operator creates a counterparty (name, type, country of registration) and submits it for approval.
2. A second operator approves or rejects it.
3. Operators add the counterparty's bank accounts and wallet addresses on the Whitelisted Bank Account and Whitelist Address create pages, choosing **Who is this for? Counterparty**, or from this page with the add buttons (see `PRD - Whitelist Bank Account and Address - Counterparty Scope.md`).
4. This counterparty page lists them in the **Whitelists** tab and offers the add buttons, next to its transactions.
5. An operator can suspend a counterparty at once (new settlements to it are blocked). Reactivating it needs a second operator's approval. Closing is permanent and is blocked while settlements are open.
6. Clients see only the counterparty name, type and status when they pick one in a settlement instruction.

### In Scope

- Counterparty list, create, view, edit (name and note), approve, reject, suspend, reactivate, close.
- Counterparty page layout: header, Overview card (key facts and what needs attention) and tabs.
- Whitelists tab: the counterparty's Whitelisted Bank Accounts and Whitelist Addresses, with add shortcuts. Add and replace themselves are specified in `PRD - Whitelist Bank Account and Address - Counterparty Scope.md`.
- Transactions tab (Settlements, Incoming, Outgoing), with data supplied by the Settlement Instruction PRD (sample or empty until then).
- Read access for clients (name, type, status only).
- Permissions, audit log events, error codes.

### Out of Scope

| **Item** | **Reason** |
| --- | --- |
| Using counterparties on settlement instruction legs | Covered by the later Settlement Instruction PRD |
| Creating, replacing, approving and retiring bank accounts and wallet addresses for a counterparty | Covered by `PRD - Whitelist Bank Account and Address - Counterparty Scope.md` |
| Exposure, Settlement history and Movements sections | Decision: wait for the Settlement Instruction PRD |
| Securities settlement details (place of settlement, agent BIC, agent account) | No securities movement model yet |
| Callback verification of settlement details | Does not match today's process; possible later addition |
| Holding the first payment to new or changed details | Possible later addition |
| Client creation or proposal of counterparties | Clients pick only |
| Automated sanctions or country-risk screening | Manual review in this phase |
| Netting settings (`netting_enabled`) | Belongs to the Settlement Instruction PRD |
| Importing counterparties from CSV | Later |

### Actors

- **Operator (maker):** creates counterparties and their whitelists, suspends, closes, proposes reactivation.
- **Operator (checker):** a different operator who approves or rejects.
- **Client user:** picks an active counterparty in a settlement instruction; sees name, type and status.
- **System:** blocks use of suspended or closed counterparties, tracks open settlements.

### Assumptions & Dependencies

- Maker-checker, audit log, and the operator permission model already exist and are reused.
- Fiat assets, blockchains and address-format validation already exist (used by whitelisted bank accounts and external wallets).
- The count of "open settlements" depends on the Settlement Instruction PRD. Until that ships it shows 0.
- The counterparty-scope changes to Whitelisted Bank Account and Whitelist Address are delivered by the companion PRD. The Whitelists tab and counts here depend on it.
- A counterparty has no account number. It is identified only by a system-generated UUID (the counterparty ID). There is no short code.

### Glossary

| **Term** | **Definition** |
| --- | --- |
| Counterparty | An outside party the platform settles with, such as a broker, exchange, issuer or fund. Not a custody account. |
| Whitelists | The bank accounts (Whitelisted Bank Accounts) and wallet addresses (Whitelist Addresses) with counterparty scope that are used to send assets to, or receive assets from, a counterparty. Managed on the Whitelist pages. |
| Regulated counterparty | A counterparty that is licensed or authorized by a regulator. A regulated counterparty provides proof of its licence. A non-regulated counterparty provides its certificate of incorporation and an ownership document. Neither skips approval. |
| Maker-checker | One operator proposes, a different operator approves. |
| Open settlement | A settlement obligation facing the counterparty that has not reached a final status. |
| Overdue | An open settlement whose contractual settlement date has passed. |
| Client accounts involved | The number of client or house accounts that have settled, or have open settlements, with the counterparty. Shown as one figure, not a list. The Transactions tab shows the accounts behind it. |
| Unclassified arrival | An incoming movement that is not yet linked to anything (classification `unclassified`). For a counterparty, one whose sender (wallet address, or bank account and bank code) matches one of the counterparty's records. |

---

## Functional Requirements

### Section 1: Counterparty Management

#### FR-1: [Operator] List Counterparties

**Requirement Details**
As an operator, I want to list and filter counterparties so that I can find them quickly and see their status.

**Main Flow**
1. Operator opens Counterparty Management in the sidebar (the Counterparties list).
2. System returns a paginated list sorted by `createdAt` descending (default page size 10).
3. Operator applies filters, opens a row, or uses the header buttons.

**List Columns**

| **Column** | **Content** |
| --- | --- |
| Name | Counterparty name |
| Type | Broker, Exchange, Issuer, Fund, Other |
| Country | Country name |
| Status | Badge: Active, Suspended or Closed. (Pending and rejected create requests are shown in Maker Checker; see Open Item 1) |
| Whitelists | Count of approved bank accounts and wallet addresses (counterparty scope) |
| Open settlements | Count of open settlements (0 until Settlement Instruction PRD ships) |
| Created at | Date, with time as sub-text (browser local time, not the fixed +08:00) |

**Filters**

| **Filter** | **Type** | **Behaviour** |
| --- | --- | --- |
| Name | Free text (`SearchInput`, with tooltip) | Partial match |
| Counterparty ID | Free text | Exact match on the full UUID (standard 8-4-4-4-12 hexadecimal format, case-insensitive). Same behaviour as the existing ID filters: the tooltip reads "Enter the full Counterparty ID. Partial IDs are not matched.", a partial or malformed value shows "Enter a full, valid Counterparty ID. Partial IDs are not matched." and no request is sent |
| Type | Select, multi | broker, exchange, issuer, fund, other |
| Country | Select, multi | ISO country list |
| Status | Select, multi | active, suspended, closed |
| Has open settlements | Toggle | Yes shows only counterparties with open settlements |

**Header Buttons:** Add Counterparty, Export CSV.

**Design Constraints**
- Filters, page, page size and sort persist in the URL. Filter row wraps. "Reset all" link appears when any filter is set.
- Row click opens the detail page; right-click opens it in a new tab.
- Text filter changes are debounced (500 ms).

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Default list | Given counterparties exist When the operator opens the list Then rows show newest first, 10 per page, with all columns |
| Filter by status | Given active and suspended counterparties exist When the operator filters status = suspended Then only suspended counterparties appear |
| Partial name search | Given a counterparty named "Meridian Capital Markets" When the operator searches "alph" Then it appears |
| No results | Given no match When filters are applied Then an empty state is shown with a "Reset all" action |
| URL state | Given filters are set When the page is refreshed Then the same filters and page are restored |
| Export | Given filters are set When the operator clicks Export CSV Then the export uses the same filters |

---

#### FR-2: [Operator] Create Counterparty

**Requirement Details**
As an operator, I want to create a counterparty so that it can later be used for settlement.

**Precondition:** Operator holds the create permission.

**Main Flow**
1. Operator clicks Add Counterparty.
2. Operator fills in the form (see Fields).
3. Operator clicks Submit. System validates and shows a **review modal** with all values and a comment box.
4. Operator confirms. System creates a maker-checker request. No counterparty exists yet.
5. A different operator approves (FR-4). The counterparty is then created with status `active`.
6. System shows a success toast: "Counterparty submitted. Awaiting approval by another operator" with a View Details button to the maker-checker request, and returns to the list.

**Form Fields**

| **Section** | **Field** | **Required** | **Type / Rule** |
| --- | --- | --- | --- |
| Counterparty Details | Name | Yes | Text, max 140. Must be unique after normalisation (trim, case-insensitive) |
| | Type | Yes | Select: Broker, Exchange, Issuer, Fund, Other |
| | Country of registration | Yes | Select from country list; stored as ISO alpha-2 |
| | Internal note | No | Multi-line text (shown with `OptionalText`) |
| Compliance | Is this counterparty regulated? | Yes (default No) | Toggle. Helper text: "Turn on if it is licensed or authorized by a regulator." Tooltip: "Turn on if this counterparty is itself regulated or supervised. Regulated: provide licence proof. Not regulated: provide a certificate of incorporation and an ownership document. Approval is always required." |
| | Regulator | Required if regulated | Text, max 140 |
| | Licence number | Required if regulated | Text, max 70 |
| | Supporting document (licence or regulator register entry) | Required if regulated | PDF or JPEG, max 10 MB, malware scanned |
| | Certificate of incorporation | Required if not regulated | PDF or JPEG, max 10 MB, malware scanned |
| | Ownership document (e.g. share register or ownership structure chart) | Required if not regulated | PDF or JPEG, max 10 MB, malware scanned |
| | Review comment | No | In the review modal only |

**Validations** (run at submission and again at checker approval, which is authoritative)

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| Required fields present | `MISSING_REQUIRED_FIELD` | Supply all required counterparty fields. |
| Name not already used (normalised) | `ALREADY_EXISTS` | A counterparty with this name already exists. |
| Country is a valid ISO code | `INVALID_FORMAT` | The country is not valid. |
| Type is one of the allowed values | `UNSUPPORTED_VALUE` | Counterparty type is not supported. |
| Regulator, licence and supporting document present when regulated | `MISSING_REQUIRED_FIELD` | Regulated counterparty details are required. |
| Certificate of incorporation and ownership document present when not regulated | `MISSING_REQUIRED_FIELD` | The certificate of incorporation and an ownership document are required. |
| File is PDF or JPEG, 10 MB or less | `INVALID_FORMAT` | The document must be a PDF or JPEG up to 10 MB. |

**Design Constraints**
- A duplicate name shows an inline warning as the operator types (after the field loses focus) and blocks submit.
- The counterparty record is created when the checker approves, with status `active` (the approval is the review). See the status table. The statuses `under_review` and `rejected` apply to the request lifecycle shown on the list for pending items; see Open Items 1.
- Submit button reads a submit-only loading flag (not a shared one).
- Exit returns to the list without saving.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Successful submission | Given valid details When the operator confirms the review modal Then a maker-checker request is created and a success toast with View Details appears |
| Missing required field | Given Name is empty When the operator clicks Submit Then an inline error "Name is required" appears and the review modal does not open |
| Duplicate name | Given "Meridian Capital Markets" exists When the operator enters "alpha  brokers" Then a duplicate error is shown and submit is blocked |
| Regulated fields | Given "Is this counterparty regulated?" is on When the operator submits without regulator, licence or supporting document Then each missing field shows an error |
| Regulated off | Given "Is this counterparty regulated?" is off Then the regulator, licence and supporting document fields are hidden and Certificate of incorporation and Ownership document are shown and required |
| Non-regulated missing documents | Given "Is this counterparty regulated?" is off When the operator submits without the certificate or the ownership document Then each missing document shows an error |
| Documents in review | Given documents are attached Then their file names are shown in the review modal and to the checker |
| Wrong file type | Given a .docx is uploaded Then the upload is rejected with the file-type message |
| Checker revalidation | Given a duplicate was created after the maker submitted When the checker approves Then approval fails with `ALREADY_EXISTS` and the request stays awaiting approval |
| Same person | Given the maker opens their own request Then Approve is not available to them |

---

#### FR-3: [Operator] View Counterparty (Page Layout)

**Requirement Details**
As an operator, I want to understand a counterparty's state, and what needs my attention, within seconds of opening the page, and then find any detail without hunting.

**Design rationale**
- Layered information: Summary, then Context, then Reference. The first view answers "Can we use this counterparty, and does anything need attention?" (progressive disclosure; Nielsen Norman Group).
- The Overview card shows only what the operator needs at a glance: state, counts and **what needs attention**. Descriptive data lives on the Other Details tab.
- Tabs instead of stacked collapsible sections: one content area at a time, a stable position for each topic, and a deep-linkable tab in the URL.
- Dynamic content (what is happening) gets the most prominent tabs and static details are secondary (Stripe customer page redesign).

**Page structure, top to bottom**

| **#** | **Block** | **Content** |
| --- | --- | --- |
| 1 | Header | Title is the counterparty name. Sub-title is the status badge. Header actions by status (below) |
| 2 | Status alert, then Overview card | A red alert for a Suspended or Closed counterparty (below), then the key facts and the "Needs attention" list |
| 3 | Tab bar | Four tabs (below). The selected tab is kept in the URL (`?tab=`) |
| 4 | Tab content | The content of the selected tab |

**Header actions by status**
- Active: Edit, Suspend, Close.
- Suspended: Edit, Reactivate, Close.
- Closed: none.
- A maker-checker request is pending: hide all actions and show only "View request".
- Close is disabled with a tooltip while open settlements exist.

**Status alert.** Shown above the Overview card, in the red error style with a red cross icon, only for these statuses:

| **Status** | **Alert text** |
| --- | --- |
| Suspended | "This counterparty has been suspended. It cannot be used for new settlements." |
| Closed | "This counterparty has been closed. It cannot be used for any transactions." |

Active shows no alert. The reason, date and user stay in the Overview's "Needs attention" list. A counterparty has no Rejected status: a rejected creation request never creates a counterparty record (the rejection is visible on the Maker Checker request).

**Overview card**

Key facts (two-column grid):

| **Fact** | **Value** |
| --- | --- |
| Status | Status badge |
| Open settlements | Count, with "(M overdue)" in red when above 0 |
| Whitelists | Number of approved bank accounts and wallet addresses, "(X bank, Y wallet)" |
| Client accounts involved | Count |

"Needs attention" list: zero or more items, most urgent first. Each item is a coloured row with a link to where the operator can act. When there are none, the card shows "Nothing needs attention."

| **Condition** | **Item** | **Link** |
| --- | --- | --- |
| Suspended | Grey: "Suspended on [date] by [user]. Reason: [reason]. New settlements are blocked." | none |
| Closed | Grey: "Closed. This counterparty can no longer be used." | none |
| Overdue settlements exist | Red: "N settlements are overdue." | "View open settlements" opens Transactions, Settlements tab, status Open |
| Unclassified arrivals from this counterparty | Amber: "N unclassified arrivals from this counterparty." | "View incoming" opens Transactions, Incoming tab |
| Active but no approved bank account or wallet address | Amber: "No approved bank account or wallet address yet. Settlement instructions cannot use this counterparty." | "View whitelists" opens that tab |
| Maker-checker request pending | Blue: "A maker-checker request is pending for this counterparty." | "View request" |

**Tabs and defaults**

| **Order** | **Tab** | **Requirement** |
| --- | --- | --- |
| 1 (default) | Whitelists (n) | FR-9 |
| 2 | Transactions (red dot when overdue settlements or unclassified arrivals exist) | FR-10 |
| 3 | Other Details | Below |
| 4 | Audit log | Existing audit log table for this counterparty and its records |

Later, with the Settlement Instruction PRD: Exposure (what it owes us and what we owe it, derived from open obligations). It is not part of this PRD.

**Not shown (compared with the Account page):** Balance Data, Venue Groups, Deposit Wallet and Virtual Account Number. A counterparty holds no balance with us, belongs to no venue group, and has no deposit wallet or VAN.

**Other Details tab fields** (type, country and regulated live here, not in the Overview)

| **Left column** | **Right column** |
| --- | --- |
| Counterparty ID (UUID) | Status |
| Name | Licence number |
| Regulator | Documents (links): supporting document if regulated; certificate of incorporation and ownership document if not |
| Suspension / close reason | Internal note |
| Created by | Created at |
| Updated by | Updated at |

Type, Country and Regulated (with regulator) are shown on this tab as well.

**Sidebar:** the operator sidebar is always dark; the client sidebar is always light.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Summary first | Given any counterparty Then the header and Overview card appear before the tabs |
| Healthy active | Given an active counterparty with an approved bank account, no overdue settlements and no unclassified arrivals Then the Overview shows "Nothing needs attention." |
| Suspended | Given a suspended counterparty Then the grey item shows the reason, date and user |
| Status alert | Given a suspended or closed counterparty Then a red alert with the text above is shown above the Overview card; given an active counterparty Then no alert is shown |
| Overdue | Given overdue settlements Then a red item shows the count, Open settlements shows "(M overdue)" in red and the Transactions tab has a red dot. The item link opens Transactions on the Settlements tab with status Open |
| No whitelists | Given an active counterparty with no approved bank account or wallet address Then the amber item is shown |
| Unclassified | Given an unclassified arrival from this counterparty Then an amber item links to the Incoming tab |
| Default tab | Given the page opens without a tab in the URL Then Whitelists is selected |
| Tab in URL | Given a tab is selected Then the URL carries it, and reloading or sharing the link opens the same tab |
| Sidebar | Given an operator Then the sidebar is dark. Given a client Then it is light |
| Pending request | Given a maker-checker request is pending Then all action buttons are hidden and only "View request" is shown |
| Not found | Given an unknown ID Then the not-found page is shown |

---

#### FR-4: [Operator] Approve or Reject a Counterparty Request

**Requirement Details**
As a second operator, I want to review and approve or reject a new counterparty so that no single person can add a counterparty.

**Main Flow**
1. Checker opens the request from Approval > Maker Checker.
2. Checker sees the submitted values and the maker's comment.
3. Checker approves (optional remarks) or rejects (reason code required, remarks optional).
4. On approval the system revalidates (see FR-2) and creates the counterparty as `active`, assigning a new UUID.
5. On rejection no counterparty is created.

**Reject reason codes:** `DUPLICATE`, `INCOMPLETE_INFORMATION`, `ENTITY_NOT_VERIFIED`, `HIGH_RISK_JURISDICTION`, `OTHER`.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Approve | Given a pending request When a different operator approves Then the counterparty is created as active with a new counterparty ID and an audit event is written |
| Reject | Given a pending request When the checker rejects with a reason code Then no counterparty is created and the request shows the reason |
| Reject without reason | Given the checker selects Reject When no reason code is chosen Then the modal blocks confirmation with "Reason is required" |
| Own request | Given the maker is logged in Then they cannot approve or reject their own request |

---

#### FR-5: [Operator] Edit a Counterparty

**Requirement Details**
As an operator, I want to correct the name or note of a counterparty.

**Editable fields:** Name, Internal note. Type, country, regulated details and counterparty ID cannot be edited.

**Main Flow:** Operator clicks Edit (active or suspended status only), changes fields in a drawer, saves. The change is audited with before and after values. No maker-checker (see Open Items 2).

**Validations:** same name rules as FR-2.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Edit note | Given an active counterparty When the operator edits the note Then it is saved and an audit event shows before and after |
| Edit name to a duplicate | Given another counterparty has that name Then the save is blocked with the duplicate error |
| Closed | Given a closed counterparty Then Edit is not available |
| Locked fields | Given the Edit drawer Then type and country are shown read-only |

---

#### FR-6: [Operator] Suspend a Counterparty

**Requirement Details**
As an operator, I want to suspend a counterparty immediately so that nothing new is settled with it while we investigate.

**Precondition:** Status is `active`.

**Main Flow**
1. Operator clicks Suspend. A confirmation modal shows: number of open settlements affected, number of client accounts involved, a required Reason (text), and a warning.
2. Operator confirms. Status becomes `suspended` at once. No second approval.
3. System records reason, user and time, and writes an audit event.

**Effects**
- New settlement instruction legs to this counterparty are blocked.
- New movements to it are blocked.
- Existing open settlements stay visible and are flagged "Counterparty suspended" for an operator decision.
- Incoming arrivals are still recorded.
- New bank accounts and wallet addresses cannot be added or replaced for it while suspended (enforced by the companion PRD).

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Suspend | Given an active counterparty When the operator confirms with a reason Then status becomes suspended immediately and the Overview shows the reason |
| No reason | Given the modal When Reason is empty Then confirmation is disabled |
| Impact shown | Given 3 open settlements and 2 client accounts involved Then the modal says "3 open settlements will be flagged" and "2 client accounts are involved", without listing them |
| Not active | Given a suspended or closed counterparty Then Suspend is not available |
| Picker | Given a suspended counterparty Then it appears greyed out and unselectable in pickers |

---

#### FR-7: [Operator] Reactivate a Counterparty

**Requirement Details**
As an operator, I want to reactivate a suspended counterparty, with a second operator's approval, so that it is not reopened by mistake.

**Main Flow**
1. Maker clicks Reactivate, enters a required comment explaining why the suspension is resolved, and confirms.
2. System creates a maker-checker request; the detail page shows only "View request" while pending.
3. A different operator approves or rejects. On approval status becomes `active`.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Request | Given a suspended counterparty When the maker submits a comment Then a request is created and action buttons are hidden |
| Approve | Given a pending request When a different operator approves Then status becomes active and the audit log records both users |
| Reject | Given a pending request When the checker rejects Then the counterparty stays suspended |
| Closed | Given a closed counterparty Then Reactivate is not available |

---

#### FR-8: [Operator] Close a Counterparty

**Requirement Details**
As an operator, I want to close a counterparty we no longer deal with.

**Precondition:** Status is `active` or `suspended`, and there are no open settlements.

**Main Flow:** Operator clicks Close, enters a required reason, confirms. Status becomes `closed` (permanent, no reactivation). All its approved bank accounts and wallet addresses become `retired`.

**Validations**

| **Check** | **Error Code** | **Error Message** |
| --- | --- | --- |
| No open settlements | `INVALID_RECORD_STATE` | This counterparty has open settlements and cannot be closed. |
| Status allows close | `INVALID_RECORD_STATE` | This counterparty cannot be closed from its current status. |

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Close | Given no open settlements When the operator confirms with a reason Then status is closed and its bank accounts and wallet addresses are retired |
| Open settlements | Given open settlements exist Then the Close button is disabled with a tooltip, or confirm fails with the message above |
| Permanent | Given a closed counterparty Then no actions except viewing are available |

---

### Section 2: Related Information Tabs on the Counterparty Page (Read Only)

#### FR-9: [Operator] Whitelists Tab

**Requirement Details**
As an operator, I want to see the bank accounts and wallet addresses held for a counterparty so that I know where we can settle with it.

**Source:** the embedded Whitelisted Bank Account and Whitelist Address lists, filtered to `scope = counterparty` and this counterparty (see the companion PRD, FR-2 and FR-7). Records are created and replaced with the Whitelist form (companion PRD, FR-1, FR-4, FR-6 and FR-8); this tab offers the shortcut.

**Layout:** a segmented control with **Bank Accounts (n)** and **Wallet Addresses (n)**. Bank Accounts is selected by default. The tab label count is the number of records that are Under review or Approved.

**Bank Accounts list**

| **Column** | **Content** |
| --- | --- |
| Label | Link to the Whitelisted Bank Account detail page |
| Currency | e.g. SGD |
| SWIFT/BIC | Code |
| Key detail | Masked: last 4 characters of the account number |
| Version | 1, 2, 3 |
| Status | Under review, Approved, Rejected, Retired |
| Created at | Date and time |

**Wallet Addresses list:** Label (link), Asset, Blockchain, Address (shortened), Version, Status, Created at.

**Controls:** a "Show retired" toggle (retired and rejected rows are hidden by default), and **+ Add Bank Account** or **+ Add Wallet Address** (depending on the selected option) at the right of the control row. The embedded lists hide their other filters.

**Add buttons:** shown to operators. Enabled only when the counterparty is `active` and has no pending maker-checker request, otherwise disabled with a tooltip ("Only an active counterparty can receive new whitelists." or "A request is pending for this counterparty."). Add opens the Whitelist create page for the matching type with the **Who is this for?** control replaced by a read-only line "Counterparty · [name]" (breadcrumb: Counterparties > name > Add Bank Account). Submit and Exit return to this tab. The record created is the same as one created from the Whitelist page.

**Notes**
- One bank account used in several currencies appears as one row per currency.
- Helper text under the list: "One record per currency or asset. You can add them here or from the Whitelist pages (Who is this for? Counterparty). Never shown to clients."

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Default view | Given approved and retired records Then only approved and under review rows are shown until "Show retired" is on |
| Segmented control | Given bank accounts and wallet addresses When the operator selects Wallet Addresses Then the wallet list is shown and the counts stay visible on both options |
| Masking | Given a bank account number Then only the last 4 characters are shown |
| Link out | Given a row When the operator clicks the label Then the matching Whitelist detail page opens (Replace is there) |
| Multi-currency | Given the same account in SGD and USD Then two rows are shown |
| Add | Given an active counterparty Then "+ Add Bank Account" (or "+ Add Wallet Address") is shown and opens the Whitelist form with the counterparty filled in and shown read-only |
| Add disabled | Given a suspended or closed counterparty, or one with a pending request Then the add button is disabled with a tooltip |
| Not shown to clients | Given a client user Then the tab and its data are not available |

---

#### FR-10: [Operator] Transactions Tab

**Requirement Details**
As an operator, I want to see everything that has been settled, or is being settled, with a counterparty in one place: the settlements (what we agreed to), and the incoming and outgoing movements (what actually moved). This is the counterparty equivalent of the Unified Transactions section on the Account page.

**Layout:** a segmented control with three options: **Settlements (n)**, **Incoming (n)** and **Outgoing (n)**. Settlements is selected by default. The Incoming tab shows a red tag "N unclassified" when there are unclassified arrivals. The section has no count in its title.

**Data sources** (Settlement Instruction PRD; sample or empty until it ships)
- Settlements: settlement obligations facing this counterparty.
- Incoming and Outgoing: movements linked to those obligations, plus unclassified incoming movements whose sender matches this counterparty's bank accounts or wallet addresses.

**Settlements tab**

| **Column** | **Content** |
| --- | --- |
| Settlement instruction | ID (link when available) |
| Obligation | ID |
| Account | Account name and number |
| Direction | Deliver or Receive |
| Amount | Amount and asset |
| Due | Contractual settlement date |
| Status | Open, Overdue (red tag) or Settled. A "Counterparty suspended" flag (amber) is added to open rows while the counterparty is suspended |

Filters: Status (Open, Overdue, Settled; **default Open**), Direction, Asset, Account, Due date range. Overdue rows have a red background.

**Incoming tab**

| **Column** | **Content** |
| --- | --- |
| Movement | ID (link to the Incoming Movement detail) |
| Amount | Amount and asset |
| Status | Detected or Confirmed |
| Classification | **Settlement** (linked to an obligation) or **Unclassified** (red tag with a "Classify" link) |
| Settlement | Settlement instruction it settles, or "-" |
| Received from | The counterparty bank account or wallet address (label and version) the arrival matched |
| Reference | Bank reference or transaction hash |
| Transacted at | Date |

Filters: Classification, Status, Asset, Date range. Unclassified rows have a red background. Note under the table: "Unclassified: an arrival whose sender matches this counterparty but is not yet linked to a settlement. Classify it on the Incoming Movement page."

**Outgoing tab**

| **Column** | **Content** |
| --- | --- |
| Movement | ID (link to the Outgoing Movement detail) |
| Amount | Amount and asset |
| Status | Pending, Submitted, Confirmed or Failed, with the execution status below it when present |
| Settlement | Settlement instruction it settles, or "-" |
| Sent to | The counterparty bank account or wallet address used (label and version) |
| Reference | Bank reference or transaction hash |
| Transacted at | Date |

Filters: Status, Asset, Date range.

**Relation to the existing unclassified flow**
- This is the same mechanism as today's Incoming Movement break resolution: an arrival that matches nothing stays `detected` and `unclassified` until an operator classifies it with maker-checker. The counterparty page only filters that list to this counterparty and offers a link into it.
- The Settlement Instruction PRD adds a `settlement` classification that links an arrival to the obligation it settles. Classifying an arrival as a settlement is done in the existing Incoming Movement flow, not on this page.
- Matching an arrival to a counterparty uses the sender: the source address against the counterparty's wallet addresses, and for fiat the depositor account and bank code against the counterparty's bank accounts.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Segments | Given the tab Then the options Settlements, Incoming and Outgoing are shown with counts |
| Default filter | Given the tab opens Then the Settlements tab shows only open settlements and the status filter reads Open |
| Overdue | Given an obligation past its due date Then its row is highlighted and tagged Overdue |
| Suspended | Given a suspended counterparty Then every open settlement row shows "Counterparty suspended" |
| Unclassified | Given an unclassified arrival from this counterparty's address Then it appears on the Incoming tab with an Unclassified tag, a Classify link, and the Incoming tab shows "1 unclassified" |
| Classified | Given an arrival linked to a settlement Then the classification shows Settlement and the settlement is named |
| Outgoing | Given an outgoing movement Then the bank account or wallet address used is shown with its version |
| Empty | Given no records on a tab Then an empty state is shown |
| Close guard | Given open settlements exist Then Close is disabled on the page header |
| Not for clients | Given a client user Then the tab is not available |

---

### Section 3: Client Access

#### FR-11: [Client] Pick a Counterparty (Read Only)

**Requirement Details**
As a client user building a settlement instruction, I want to pick an active counterparty so that I can settle with it.

**What a client can see:** counterparty name, type, status. Nothing else (no country, no settlement details, no notes).

**Behaviour**
- A client can list counterparties for a picker (search by name). Active ones are selectable. Suspended ones appear greyed out and cannot be selected.
- Closed, rejected and under-review counterparties are not returned to clients.
- No create, edit or action is available to clients.
- On a settlement instruction, a client sees the counterparty name and type on the legs they are part of.

**Acceptance Criteria**

| **Scenario** | **Acceptance Criteria** |
| --- | --- |
| Picker | Given active counterparties exist When a client opens the picker Then name and type are shown for each |
| Suspended | Given a suspended counterparty Then it is shown greyed out and cannot be selected |
| Hidden data | Given a client views a counterparty on a leg Then country, settlement details and notes are not returned |
| Closed | Given a closed counterparty Then it is not returned to clients |
| No write | Given a client Then create, edit and action endpoints return `FORBIDDEN` |

---

## Non-Functional Requirements

- **Security:** operator permissions enforced at the API. Clients can never receive settlement details. Document uploads are malware scanned.
- **Audit:** every state change and every edit is recorded with user, time, and before and after values.
- **Concurrency:** one maker-checker request at a time per counterparty or settlement detail; others are blocked with `MCH_REVIEW_IN_PROGRESS`.

---

## Technical Specifications

### Data Model

#### Counterparty

| **Field** | **Non-null** | **Mutable** | **Client Visible** | **Type** | **Rules** |
| --- | --- | --- | --- | --- | --- |
| `id` | Y | N | Y | UUID | Primary key, system generated, unique. The only identifier; there is no account number or short code |
| `name` | Y | Y | Y | String (140) | Unique after normalisation |
| `type` | Y | N | Y | Enum | `broker`, `exchange`, `issuer`, `fund`, `other` |
| `countryCode` | Y | N | N | String (2) | ISO alpha-2 |
| `regulatedEntity` | Y | N | N | Boolean | Default false |
| `regulator` | C | N | N | String (140) | Required if regulated |
| `licenceNumber` | C | N | N | String (70) | Required if regulated |
| `supportingDocument` | C | N | N | Document | Required if regulated; PDF or JPEG, 10 MB |
| `certificateOfIncorporation` | C | N | N | Document | Required if not regulated; PDF or JPEG, 10 MB |
| `ownershipDocument` | C | N | N | Document | Required if not regulated; PDF or JPEG, 10 MB |
| `internalNote` | N | Y | N | Text | |
| `status` | Y | Y | Y | Enum | `active`, `suspended`, `closed` |
| `statusReason` | N | Y | N | Text | Reason for suspend or close |
| `mchRequestId` | N | Y | N | UUID | Set while a maker-checker request is pending |
| `createdAt/By`, `updatedAt/By` | Y | | N | | Standard |

#### Whitelists

Not stored on the counterparty. They are Whitelisted Bank Account and Whitelist Address records with `scope = counterparty` and a `counterpartyId`. See the companion PRD for the fields.

### Status Diagrams

**Counterparty**

| **Status** | **Operator Label** | **Client Label** | **Meaning** | **Next** |
| --- | --- | --- | --- | --- |
| `active` | Active | Active | Approved and usable | `suspended`, `closed` |
| `suspended` | Suspended | Suspended | Paused; no new settlements | `active` (maker-checker), `closed` |
| `closed` | Closed | not shown | Permanent | none |

The create request itself (pending approval, rejected) is tracked by the maker-checker request, not a counterparty status. See Open Items 1.

**Whitelists** (Whitelisted Bank Account and Whitelist Address with counterparty scope) use the statuses defined in the companion PRD: `under_review`, `approved`, `rejected`, `retired`.

### Permissions

| **Operation** | **Operator Admin** | **Operator User** | **Compliance** | **Client** |
| --- | --- | --- | --- | --- |
| List / view | Y | Y | Y | Picker only (FR-11) |
| Create, edit | - | Y | - | - |
| Approve / reject | - | Y (not own request) | - | - |
| Suspend | - | Y | Y | - |
| Reactivate (propose) | - | Y | - | - |
| Close | - | Y | - | - |

(Role split is a proposal; confirm with the permission model owner.)

### Audit Log Events

`counterparty:create`, `counterparty:update`, `counterparty:approve`, `counterparty:reject`, `counterparty:suspend`, `counterparty:reactivate`, `counterparty:close`. Audit events for bank accounts and wallet addresses are defined in the companion PRD. Each carries the actor, time, and `externalMetadata` (none, operator-only), `internalMetadata` (ids, before and after values, reason).

**Maker-checker request types.** Add **Counterparty** to the Approvals entity type list (operations Create, Update and Other for reactivate). Whitelists for counterparties reuse the existing **Whitelisted Bank Account** and **Whitelisted Address** types.

---

## Design Notes (reuse these existing patterns)

| **Need** | **Reuse** |
| --- | --- |
| Page structure | List, create and detail pages as in Whitelisted Bank Account |
| Short create form | Account create layout (`TitleLabel` sections, `Divider`) |
| Review before submit | Whitelisted Bank Account review modal (summary plus comment box) |
| Detail layout | Overview card plus tabs (new pattern, replaces stacked collapsible sections) |
| Overview card | New component: key facts plus a "Needs attention" list with links that open a tab |
| Embedded lists | The Account page's embedded list pattern (`isEmbedded`), with a counterparty filter |
| Action bar by status | Account detail page buttons; hide all and show "View request" when a request is pending |
| Banners | `Alert` styles used on the account and WBA detail pages |
| Filters | `SearchInput`, tooltips, `useListUrlState`, "Reset all", Export CSV |
| Approve and reject modals | Whitelisted Bank Account approve and reject modals (reason codes) |
| Audit | `AuditLogsTable` |
| Optional labels | `OptionalText` |

Menu: add a new top-level item **Counterparty Management** to the Operator UI sidebar (the repo's `Layout` menu is a flat list of top-level items, with Transaction Management as the only group that matters here). Place it after Account Management and before User Management. It opens the Counterparties list. Breadcrumb: Dashboard > Counterparty Management > Counterparties. Whitelists move to their own item, **Whitelist Management**, placed between Account Management and Counterparty Management (see the Whitelist PRD, Navigation). Mockups: to be designed (create, review modal, detail page with Overview card and tabs, suspend confirmation).

---

## Open Items

1. **Pending and rejected create requests:** are shown only in the maker-checker request list (as for other maker-checker creates), or should the counterparty list also show an "Under review" row? Needs a decision with the PM and engineering. If the second option is chosen, add Under review and Rejected to the list badges and the Status filter.
2. **Editing the name:** a name change affects how the party is identified. Should it need maker-checker? Currently single operator with audit.
3. **Counterparty identifier:** UUID only (decided). No account number or short code.
4. **Wallet proof:** what evidence beyond the verification note is accepted for wallet addresses (test transfer, signed message)? Deferred. See companion PRD.
5. **Reactivation of closed counterparties:** not allowed. Confirm.
6. **Permissions:** role split above is a proposal.
7. **Ownership document:** accepted types (share register, ownership structure chart, beneficial owner declaration) and whether identity documents of beneficial owners are also needed. Needs a compliance decision.
8. **Dependency:** the Whitelists tab and counts need the companion PRD to ship first. Transactions needs the Settlement Instruction PRD.
9. **Decided (superseded):** sections were replaced by tabs. Whitelists is the default tab and the selected tab is kept in the URL.
10. **Decided:** the Suspend confirmation shows only the number of affected open settlements and client accounts involved, not a list.
11. **Decided:** a non-regulated counterparty must provide a certificate of incorporation and an ownership document. A regulated one provides licence proof.
12. **Decided:** the Open Settlements section is replaced by the Transactions tab (Settlements, Incoming, Outgoing).
13. **Arrival matching:** rules for matching an unclassified arrival to a counterparty (sender address, or depositor account and bank code) and the new `settlement` classification belong to the Settlement Instruction and Incoming Movement PRDs. Confirm.
14. **Later additions considered but excluded:** callback verification, first-payment hold, automated country-risk flag, securities settlement details.

---

## Appendix: Research basis and limits

FATF R.10 and R.17 (risk-based approach and conditions for relying on third parties), general settlement-instruction and payment-fraud controls (maker-checker, independent verification), treasury partner-lifecycle patterns, and Fireblocks' approval model for whitelisted addresses. The ISDA and FMSB settlement instruction standards could not be read, and no public detail was found on how Copper, BitGo or Anchorage onboard or suspend counterparties. Country-required, optional LEI (not included in this PRD), and single-operator suspend are design judgment, not sourced rules.
