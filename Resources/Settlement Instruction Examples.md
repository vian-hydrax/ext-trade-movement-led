# Settlement Instruction Examples

1. FOP Transfer (2 approvers)

| **Step** | **SI Status (operator UI/ client UI)** | **Deliver Status** | **Receive Status** | **Notes** |
| --- | --- | --- | --- | --- |
| Submitter submits SI with the following legs: 1. A → B, 5 BTC | Awaiting client approval/ Awaiting  approval | 1. Awaiting approval | 1. Awaiting approval | Submitter entersFrom=A, To=B |
| Approver (with access to A) approves | Awaiting client approval/ Awaiting  approval | 1. **Approved** | 1. Awaiting approval | A balance checked + earmarked 5 BTC |
| Approver (with access to B)  approves | **Processing/ Under review** | 1. Approved | 1. **Approved** | No earmark |
| Operator approval | **Completed** | 1. **Settled** | 1. **Settled** | Journals posted atomically, earmark released |

1. FOP Transfer (1 approver)

| **Step** | **SI Status (operator UI/ client UI)** | **Deliver Status** | **Receive Status** | **Notes** |
| --- | --- | --- | --- | --- |
| Submitter submits SI with the following legs: 1. A → B, 5 BTC | Awaiting client approval/ Awaiting  approval | 1. Awaiting approval | 1. Awaiting approval |  |
| Approver (with access to **A and B**) approves | **Processing/ Under review** | 1. **Approved** | 1. **Approved** | Single approval approves **both deliver and receive for A and B**A balance checked + earmarked 5 BTC |
| Operator approval | **Completed** | 1. **Settled** | 1. **Settled** | Journals posted atomically, earmark released |

1. DvP Trade (2 approvers)

| **Step** | **SI Status (operator UI/ client UI)** | **Deliver Status** | **Receive Status** | **Notes** |
| --- | --- | --- | --- | --- |
| Submitter submits SI with the following legs: 1. A → B, 5 BTC 2. B → A, 100 USDC | Awaiting client approval/ Awaiting  approval | 1. Awaiting approval 2. Awaiting approval | 1. Awaiting approval 2. Awaiting approval |  |
| Approver (with access to A) approves | Awaiting client approval/ Awaiting  approval | 1. **Approved** 2. Awaiting approval | 1. Awaiting approval 2. **Approved** | Single approval approves **both deliver and receive for A**A balance checked + earmarked 5 BTC |
| Approver (with access to B)  approves | **Processing/ Under review** | 1. Approved 2. **Approved** | 1. **Approved** 2. Approved | Single approval approves **both deliver and receive for B**B balance checked + earmarked 100 USDC |
| Operator approval | **Completed** | 1. **Settled** | 1. **Settled** | Journals posted atomically, earmark released |

1. DvP Trade (2 approvers)

| **Step** | **SI Status (operator UI/ client UI)** | **Deliver Status** | **Receive Status** | **Notes** |
| --- | --- | --- | --- | --- |
| Submitter submits SI with the following legs: 1. A → B, 5 BTC 2. B → A, 100 USDC | Awaiting client approval/ Awaiting  approval | 1. Awaiting approval 2. Awaiting approval | 1. Awaiting approval 2. Awaiting approval |  |
| Approver (with access to **A and B**) approves | **Processing/ Under review** | 1. Approved 2. **Approved** | 1. **Approved** 2. Approved | Single approval approves **both deliver and receive for A and B**A balance checked + earmarked 5 BTCB balance checked + earmarked 100 USDC |
| Operator approval | **Completed** | 1. **Settled** 2. **Settled** | 1. **Settled** 2. **Settled** | Journals posted atomically, earmark released |

1. Complex SI

| **Step** | **SI Status (operator UI/ client UI)** | **Deliver Status** | **Receive Status** | **Notes** |
| --- | --- | --- | --- | --- |
| Submitter submits SI with the following legs: 1. A → B, 5 BTC 2. B → A, 100 USDC 3. A-\> C, 1 USDC 4. B → C, 1 USDC | Awaiting client approval/ Awaiting  approval | 1. Awaiting approval 2. Awaiting approval 3. Awaiting approval 4. Awaiting approval | 1. Awaiting approval 2. Awaiting approval 3. Awaiting approval 4. Awaiting approval |  |
| Approver (with access to A) approves | Awaiting client approval/ Awaiting  approval | 1. **Approved** 2. Awaiting approval 3. **Approved** 4. Awaiting approval | 1. Awaiting approval 2. **Approved** 3. Awaiting approval 4. Awaiting approval | Single approval approves** deliver and receive for A**A balance checked + earmarked 5 BTCA balance checked + earmarked 1 USDC |
| Approver (with access to B and C) approves | **Processing/ Under review** | 1. Approved 2. **Approved** 3. Approved 4. **Approved** | 1. **Approved** 2. Approved 3. **Approved** 4. **Approved** | Single approval approves **both deliver and receive for B and C**B balance checked + earmarked 100 USDCB balance checked + earmarked 1 USDC |
| Operator approval | **Completed** | 1. **Settled** 2. **Settled** 3. **Settled** 4. **Settled** | 1. **Settled** 2. **Settled** 3. **Settled** 4. **Settled** | Journals posted atomically, earmark released |
