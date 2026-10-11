/* Data shared by both modules: the users. Everything else lives in cp.js (counterparties, whitelists, approvals) and si.js (settlement instructions). */
window.Shared = {
  USERS: [
    { id: 'u1', name: 'Alice Tan', role: 'operator', label: 'Operator: Alice Tan' },
    { id: 'u2', name: 'Bob Lim', role: 'operator', label: 'Operator: Bob Lim' },
    { id: 'u3', name: 'Sam Wong', role: 'submitter', accounts: ['a1', 'a2'], label: 'Client submitter: Sam (Acme)' },
    { id: 'u4', name: 'Ava Chen', role: 'approver', accounts: ['a1', 'a2'], label: 'Client approver: Ava (Acme)' },
    { id: 'u5', name: 'Ian Cole', role: 'individual', accounts: ['a3'], label: 'Individual client: Ian (Zenith)' }
  ]
};
