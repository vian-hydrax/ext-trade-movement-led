# PRD \- Client UI & API \- Create Entities and Account

# **Document Details** 

| **Target Development ** | **Q2 2026** |
| --- | --- |
| **Release Version ** | Ver. 1.6 – July 2026 |
| **Written By** | - Product Manager: @Ervina Chandra |
| **Designed By** | - Designer: @Arfian |
| **Implemented By** | - Developer: @Hossein Nasr Esfahan and Team - QA: @Widhi Putri |
| **Jira Epic ** | [AM-2412](https://team-1602221989898.atlassian.net/browse/AM-2412) |

# **Table of Contents**

# **Overview **

| **Problem Statement ** |
| --- |
| The current manual process for Entity and Account creation impact on a double-sided inefficiency: It imposes a heavy administrative burden on the Operations team while simultaneously forcing clients to wait for manual fulfillment, resulting in a slow and friction-filled user experience. |

| **Objective ** |
| --- |
| Improve the client experience by providing self-service tools for Entity and Account creation on the Client UI or API, empowering users to eliminate fulfillment wait times while significantly reducing the manual workload for the Operations team. We will provide:  - Client API to create Entity and Account  - Client UI to create Entity and Account |

| **PRD Scope ** |
| --- |
| - **Client API & UI**     - Client API specs for create Entities and Accounts - this will be provided by dev      - Create new menu **Account Management **and provide Entities and Accounts Tab → This menu is **independent** (not depending on the entity and account that are selected in the dropdown on the top of the page)      - Only **Client Admin, Direct Individual Client** and **Service User** that can create Entity and Account      - There must be an audit log for all this client request and operator action  - **Operator UI **     - Approval flow for Entities and Accounts creation      - Update the Entities and Account created by client in Operator UI (Account Management) |

| **Out of Scope** |
| --- |
| - **\[Operator UI\] **     - Entity Activation → this is available already in operator UI, we don’t need to do this anymore as we put it in the separate process.      - Slack Notification for New Created Account and Entities by Client UI or API - **\[Client UI\]**      - No Edit Function for Entity and Account created |

# **Glossary**

| **Term** | **Definition** |
| --- | --- |
| Client | This is our direct client. It can be intermediary / direct corporate / individual. |
| Entity | This is the individual / corporate under the client. For intermediary clients, the entities are end customers of the intermediary |
| Account | The account represents the custody account. This is the level we track balances. Each entity can open 1 or more accounts. |

# **Solution Overview**

## **\[Entity Creation\]**  

1. Client can do the Entity creation through Client API / Client UI. This Entity will be appear in account management with status Under Review. 
2. Operator have choice to activate or reject the entity created by the Client. 
3. If it is get rejected by the operator, there is no way for this entity can be activated again in the future. 

## **\[Account Creation\] **  

1. Client can do Account creation through Client API / Client UI. This Entity will be appear in account management with status Under Review. 
2. Operator have choice to activate or reject the account created by the Client. 
3. If it is get rejected by the operator, there is no way for this account can be activated again in the future. 


# Functional Requirements

## Section 1: Client UI - New Account Management Menu & Entities Tab

| ### **FR-1: \[Client UI\] Create New Menu “Account Management”** **Ticket: **[AM-2413](https://team-1602221989898.atlassian.net/browse/AM-2413) |  |
| --- | --- |
| **Mockup** | <https://www.figma.com/design/Cp5QA0ezDkDPmGA06RRtei/-FE-UI--Account-Management--Client-?node-id=13-2550&t=JYOFmiMWJl2dmlGD-1> |
| **Acceptance Criteria ** | **Accessing Account Management Menu ** **GIVEN** client admin or direct individual client already login to Client Dashboard **WHEN** client admin or direct individual client click on the Account Management Menu **THEN** the Entities tab will be shown (default) |
| **Requirement Details ** | **\[Account Management Menu\]** - This is a **new menu **on the Client Dashboard  - This menu will be placed right **above** User Access Management menu - Under this menu, there is** 2 tab **     - Entities (Default)     - Accounts  - Only** Client Admin and Direct Individual Client** can see this menu   **\[Entity Dropdown\] → Top Left Side** - **Client API** → Show all these 4 status: **active**, **under review**, **rejected**, and **closed** - **Client UI**     - Show only **active**. (FE need to filter it when showing in UI)      - For the Entity that is still **under review**, **rejected**, and **closed → **we need to hide it from the entity dropdown.   **\[Account Dropdown\] → Top Middle Side** - **Client API** → Show all these 4 status: **active**, **under review**, **rejected**, and **closed** - **Client UI**     - Show only **active**. (FE need to filter it when showing in UI)      - For the Entity that is still **under review**, **rejected**, and **closed → **we need to hide it from the account dropdown. |

| ### **FR-2: \[Client UI\] Create New Tab “Entities” and See List of Entities  ** **Ticket: **[AM-2421](https://team-1602221989898.atlassian.net/browse/AM-2421) |  |
| --- | --- |
| **Mockup ** | <https://www.figma.com/design/Cp5QA0ezDkDPmGA06RRtei/-FE-UI--Account-Management--Client-?node-id=13-2550&t=JYOFmiMWJl2dmlGD-1> |
| **Acceptance Criteria ** | **See List of Entities ** **GIVEN** client admin or direct individual client already in Entities Tab  - **IF **there is no entities created for this client  **THEN** the Entities tab will show “No Data”  - **IF** there are entities created before  **THEN** show the Entities List   **Entity List Filter ** **GIVEN** client admin or direct individual client is on the Entity Tab  **WHEN** client admin or direct individual client fill in one of the entity filter box  - **IF** the data found  **THEN** show the data  - **IF** the data not found  **THEN** show “No Data” |
| **Requirement Details ** | **\[Entity Tab - General\]** - This is a default tab when user open the Account Management Menu  - This tab will have several functionality that will be covered in the next FR:       - View Entity      - Create Entity **\[List of Entities\]** - These are the list of Entities that client have ever requested or created, it can be created by operator or created by client   - There are 4 items that need to be shown in this list:      - Entity Name      - Entity ID     - Entity Type      - Status → This is the status from client perspective          - **\[Entity Creation Status\]** → from Client Perspective              - **Under Review:** Waiting for activation              - **Rejected: **Operator has rejected to activate this entity and there is no way to activate it again             - **Active:** Operator has activate the entity created                  - Even if the operator change the entity status to **Disabled**, then in the client UI & API, it will appear as active              - **Closed:** Operator has closed the entity and can’t be activated again      - Created At → Time and Date when client submitted entity creation  - It must be arranged based on the latest created date (DESC, newest to oldest), example:      - Entity C, Created At  → the latest created entity will be placed in the top      - Entity Z, Created At        - Entity A, Created At    - Filter: We provide filter for client to search for entity     - Entity Name      - Entity ID      - Entity Type     - Status |

| ### **FR-3: \[Client UI\] View the Entity Details    ** **Ticket: **[AM-2422](https://team-1602221989898.atlassian.net/browse/AM-2422) |  |
| --- | --- |
| **Mockup ** | <https://www.figma.com/design/Cp5QA0ezDkDPmGA06RRtei/-FE-UI--Account-Management--Client-?node-id=13-2550&t=JYOFmiMWJl2dmlGD-1> |
| **Acceptance Criteria ** | **View the Entity Details** **GIVEN** client admin or direct individual client is on the Entity Tab  **WHEN** client admin or direct individual client click one of the entity in the list  **THEN** client admin or direct individual client will be directed to the entity detail page  **AND** client admin or direct individual client can see - Entity details  - Additional information (tabbing view)      - Accounts      - Metadata   **See the Account List under Entity Details ** **GIVEN** client admin or direct individual client is on the Entity Detail page AND click accounts tab  - **IF** there are accounts created before under that entity  **THEN** show the list of account under that entity  - **IF** there is no account created before under that entity  **THEN** show No Data on the account section   **Account List Filter ** **GIVEN** client admin or direct individual client is on the Entity Tab  **WHEN** client admin or direct individual client fill in one of the account filter box  - **IF** the data found  **THEN** show the data  - **IF** the data not found  **THEN** show “No Data”  **See the Metadata** **GIVEN** client admin or direct individual client is on the Entity Detail page AND click metadata tab  - **IF** there are information **THEN** show the data - **IF** there is no information  **THEN** show No Data  **Copy Entity ID ** **GIVEN** client admin or direct individual client is on the Entity Detail page **WHEN** clicking the copy button  **THEN** the entity ID will be copied to clipboard |
| **Requirement Details ** | **\[Entity Main Details\]**There are 3 items that need to be shown in this list:  - Entity Name  - Entity ID - Entity Type  - Status Note: - Even if the operator change the entity status to **Disabled**, then in the client UI and API, it will appear as active   **\[Accounts\]** - Account List that we show here is the account list of that entity  - There are 4 items need to be shown here     - Account Name      - Account ID      - Status     - Created At → Time and Date when the account is created  - Filter  We provide filter for client to search the account     - Account Name      - Account ID     - Status   **\[Metadata\]** - This tab is to store less important information  - There are 2 items need to be shown here      - Created At      - Updated At → Time and Date when there is an update to this request |

| ### **FR-4: \[Client UI\] Add New Entity** **Ticket: **[AM-2423](https://team-1602221989898.atlassian.net/browse/AM-2423) |  |
| --- | --- |
| **Mockup ** | <https://www.figma.com/design/Cp5QA0ezDkDPmGA06RRtei/-FE-UI--Account-Management--Client-?node-id=13-2997&t=JYOFmiMWJl2dmlGD-1> |
| **Acceptance Criteria ** | **Add New Entity ** **GIVEN** client admin or direct individual client is on the Entities Tab - List Entities   **WHEN** client admin or direct individual client click “Add New” button    **THEN** a “Add New Entity” page will be shown  **AND** client admin or direct individual client need to fill in all the required fields  - **IF** the data required is all filled  **WHEN ** client admin or direct individual client click submit  **THEN** the new entity will be created with status under review  **AND** notification will be appear **AND** back to List Entities page - **IF** the data required is not filled yet **WHEN **client admin or direct individual client click submit  **THEN** error message will appear  - **IF** client admin or direct individual client click exit  **THEN** no entity will be created  **AND **back to List Entities page  **Success Notification View Details ** **GIVEN** the success notification after creating entity is appear  **WHEN** client admin or direct individual client click on the “View Details” button **THEN** the Entity Detail page will appear |
| **Requirement Details ** | **\[Add New Entity page\]** There are 2 fields for user to be filled in: - Entity Name  - Entity Type → Corporate / Individual Note: - There is no remarks if the entity creation is from Client API or Client UI  - Once the entity is created by client, the status is **under review** as it needs to be activated or rejected by operator. -  For this required fields. we can just autofill in the BE if the request coming from client API or client UI      - Client ID |

## Section 2: Operator UI - Entities Detail Page  

| ### **FR-5: \[Operator UI\] Entity Details - Adding Reject Button ** **Ticket: **[AM-2424](https://team-1602221989898.atlassian.net/browse/AM-2424) |  |
| --- | --- |
| **Mockup** | <https://www.figma.com/design/xuWe3eVqX5C7Um2uaItL0f/-FE-UI--Entities--Operator-User-?node-id=1114-31960&t=0nre315HtZJ8fvaB-1> |
| **Acceptance Criteria ** | **Activate or Reject New Entity Created ** **GIVEN** client already submit the entity creation through Client API or Client UI  **WHEN** the operator opens the Entity Details  **THEN** operator can choose to “Activate” or “Reject”  - **IF **operator choose to “Activate”  **THEN** the Entity status become Active  - **IF** operator choose to “Reject”  **THEN** the Entity status become Rejected |
| **Requirement Details ** | - Adding a new button called “Reject” on the Entity Detail page, next to Activate button.      - We are adding 1 more status here          - **Rejected:** Operator has rejected to activate this entity and there is no way to activate it again             - When reject, operator needs to fill in the **status update remarks** (same flow as the one in existing activate entity) - Please show the new status on the status filter also.  - If the created entity is rejected, the Entity can’t be activated again in the future. → button activate will disappear for this case.  - Rejection need to go through approval (maker checker) → the same behavior like the one in activation - This approve and reject mechanism applies for entity created by operator and client (both client API and client UI) - For Activate, Disable, and Close Entity process, it will be following the current process, no changes on that. |

## Section 3: Client UI - Account Tab

| ### **FR-6: \[Client UI\] Create New “Account” Tab and See List of Accounts ** **Ticket: **[AM-2425](https://team-1602221989898.atlassian.net/browse/AM-2425) |  |
| --- | --- |
| **Mockup** | <https://www.figma.com/design/Cp5QA0ezDkDPmGA06RRtei/-FE-UI--Account-Management--Client-?node-id=13-8646&t=JYOFmiMWJl2dmlGD-1> |
| **Acceptance Criteria ** | **Accessing Account Management Menu ** **GIVEN** client admin or direct individual client is in Account Management menu  **WHEN** client admin or direct individual client click on the Account Tab **THEN** the list of accounts will be shown  - **IF **there is no accounts created for this entity **THEN** the Entities tab will show “No Data”  - **IF** there are accounts created before  **THEN** show the Accounts List |
| **Requirement Details ** | **\[Accounts Tab - General\]**  - Create 1 more tab under Account Management menu called **Accounts**, in the right side of Entities Tab - This tab will have this functionality that will be covered in the next FR:      - Create Account **\[List of Accounts\] ** - This is the list of Accounts that client have ever requested or created, it can be created by operator or client   - There are 7 items that need to be shown in this list:      - Account Name      - Account ID     - Status → This is the status from client perspective          - **\[Account Creation Status\]** → from Client Perspective              - **Under Review:** Waiting for operator’s approval             - **Rejected: **Operator has rejected to activate this account and there is no way to activate it again             - **Active:** Operator has approved this account                  - Even if the operator change the entity or account status to **Disabled**, in the client UI and API, it will appear as active              - **Closed:** Operator has closed the entity and can’t be activated again      - Entity Name → which entity this account belong to      - Entity ID     - Created At → Time and Date when client submitted account creation      - Updated At - It must be arranged based on the latest created date (DESC, newest to oldest), example:      - Account 3, Created At  → the latest created account will be placed in the top      - Account 2, Created At      - Account 1, Created At  - Filter: We provide filter for client to search for accounts      - Account Name      - Account ID      - Entity Name      - Entity ID     - Status |

| ### **FR-7: \[Client UI\] Add New Account** **Ticket: **[AM-2426](https://team-1602221989898.atlassian.net/browse/AM-2426) |  |
| --- | --- |
| **Mockup ** | <https://www.figma.com/design/Cp5QA0ezDkDPmGA06RRtei/-FE-UI--Account-Management--Client-?node-id=13-5376&t=JYOFmiMWJl2dmlGD-1> |
| **Acceptance Criteria** | **Add New Account ** **GIVEN** client admin or direct individual client is on the Accounts Tab - List of Accounts   **WHEN** client admin or direct individual client click “Add New” button    **THEN** a “Add New Account” page will be shown  **AND** client admin or direct individual client need to fill in all the required fields  - **IF** the data required is all filled  **WHEN ** client admin or direct individual client click submit  **THEN** a new account will be created with status under review  **AND** notification will be appear (no view details link that will be shown because there is no detail page in client UI)  **AND** back to List Account page  - **IF** the data required is not filled yet **WHEN **client admin or direct individual client click submit  **THEN** error message will appear  - **IF** client admin or direct individual client click exit  **THEN** no request will be created  **AND** back to List Account page  **Under Review Account won’t show any Information on the Client UI** **GIVEN** the account is under review  **WHEN** user click one of the menu (deposit, withdrawal, whitelist, etc) **THEN** this account won’t be shown |
| **Requirement Details ** | **\[Add New Account page\]** There are 2 fields for user to be filled in: - Account Name  - Entity Note: - There is no remarks if the account creation is from Client API or Client UI  - Once the account is created by client, the status is **under review** as it needs to be activated or rejected by operator  **Note: **If the account is **under review** or **rejected**, then it should be excluded from selection in all feature under client UI and API (withdrawal, deposit, etc.) -  For these required fields. we can hardcoded in the BE if the request coming from client API or client UI      - Account Type → Unified      - WaaS Vendor → DFNS  - Under review Account Status when Entity Status Changed → applicable for the account created by both client and operator **Entity Status ****Account Status **Disabled ~~Under Review~~ → Under Review Closed~~Under Review~~ → Closed - Existing behavior that need to be changed      - **Under review** account → no close button It is not needed to have the close button because operator still can do reject.     - **Rejected** account → no close and edit button  close and edit button for this status serve no purpose. |
| **Entity Status ** | **Account Status ** |
| Disabled | ~~Under Review~~ → Under Review |
| Closed | ~~Under Review~~ → Closed |

## Section 4: Operator UI - Improvement

| ### **FR-8:  \[Operator UI\] Create Account Improvement &  Approve Reject Mechanism for New Account ** **Ticket: **[AM-2427](https://team-1602221989898.atlassian.net/browse/AM-2427) |  |
| --- | --- |
| **Mockup** | **Updated Create Account UI:** <https://www.figma.com/design/JXKBoIIDYi88AGrGl4ou1e/-FE-UI--Unified-Account--Operator-User-?node-id=2697-76761&t=gPb53JgtLk0BU0kT-1>  **Updated List & View UI for new statuses:** <https://www.figma.com/design/JXKBoIIDYi88AGrGl4ou1e/-FE-UI--Unified-Account--Operator-User-?node-id=2700-132013&t=gPb53JgtLk0BU0kT-1> Each status has different action button **Activate or Reject Account:** <https://www.figma.com/design/JXKBoIIDYi88AGrGl4ou1e/-FE-UI--Unified-Account--Operator-User-?node-id=2877-68498&t=gPb53JgtLk0BU0kT-1> |
| **Acceptance Criteria ** | **Create Account without Venue Group Field** **GIVEN** operator has filled in all the required fields to create account (no venue group field) **WHEN** the operator click submit  **THEN** the account will be created but the status is Under Review |
| **Requirement Details ** | **\[Add New Account - Improvement\] ** Add New Account in Operator UI is an existing flow, but there is improvement needed here:  - Remove Venue Group Dropdown → it will become separate flow for linking the venue group and create account  - After creating account (with no linked venue group) → there will be a new status **Under Review**      - Venue Group can only be linked after the account is activated by operator  - Please show the new status on the status filter also.  Note: - By the time this PRD being developed, the linking venue group should be available as it is included in Incoming Fiat 1B PRD. **\[Activate & Reject Mechanism for New Account\] ** - Adding new buttons called “Activate” and “Reject” on the Account Detail page     - We are adding 2 more status here          - **Under Review**: waiting for operator approval          - **Rejected:** Operator has rejected to activate this account and there is no way to activate it again - Please show the new status on the status filter also.  - If the created account is rejected, the account can’t be activated again in the future. → button activate will disappear for this case.  - Account Activation and Rejection need to go through approval (maker checker) → the same behavior like the one in Entity     - This approve and reject mechanism applies for accounts created by operator and client (both client API and client UI) - If the account is activated, then the disable and link venue group button will appear. - For Disable, Activate (aft. disable) and Close Account process, it will be following the current process, no changes on that. |

## Section 5: Service User

| ### **FR-9: \[Service User\]  Client Create Entities and Account Features** **Ticket: ** [AM-2480](https://team-1602221989898.atlassian.net/browse/AM-2480) |  |
| --- | --- |
| **Requirement** | - Service user can do the same actions like the Client Admin does for this features.  - The difference is only in the entity dropdown and account dropdown here <https://team-1602221989898.atlassian.net/wiki/spaces/AM/pages/3324542977/PRD+-+Client+UI+API+-+Create+Entities+and+Account#FR-1%3A-%5BClient-UI%5D-Create-New-Menu-%E2%80%9CAccount-Management%E2%80%9D> |

#   

# Data Model  

This should be following what we have done before in operator UI. Nothing new. 

# Non-functional Requirements

N/A
