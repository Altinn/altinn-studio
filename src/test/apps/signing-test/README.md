# Signing test

Tests a process whose tasks give different roles different access. It runs in tt02 at
<https://ttd.apps.tt02.altinn.no/ttd/signing-test>.

![The process](https://dev.altinn.studio/repos/ttd/signing-test/raw/branch/master/process.png)

The [policy](App/config/authorization/policy.xml) gives:

- Accountants (`REGN`: `A0239`, `A0240` and `A0241`) can instantiate and fill in the data task, but confirm neither
  confirmation task.
- Managers (`DAGL`) have the accountants' access, and can confirm the first confirmation task.
- Auditors (`REVI`: `A0237` and `A0238`) can only read and confirm the second confirmation task.
- Everyone can see the receipt.

## Test users

| Role       | localtest, at DDG Fitness | tt02, at GRETTEN KUL TIGER AS (party id `51826033`) |
| ---------- | ------------------------- | --------------------------------------------------- |
| Accountant | Pengelens Partner         | `12895697972`                                       |
| Auditor    | Gjentagende Forelder      | `25877799797`                                       |
| Manager    | Sophie Salt               | `20827199746`                                       |
