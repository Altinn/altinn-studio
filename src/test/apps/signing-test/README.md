# Signing test

App used for testing process flow with different access policy for different process steps.

- https://ttd.apps.tt02.altinn.no/ttd/signing-test

## BPMN process & policy

![bpmn process](https://dev.altinn.studio/repos/ttd/signing-test/raw/branch/master/process.png)

- The access policy for role user is shown with:
  - `r`: read
  - `w`: write
  - `c`: confirm
- `DAGL` is the manager.
- `REGN` refers to the accountant roles: `A0239`, `A0240`, `A0241`.
- `REVI` refers to the auditor roles: `A0237`, `A0238`.

## Testing

The policy is set up so that users with an accountant role in an organization can instantiate and fill out the data step, but do not have confirm access to either confirmation step. Users with a manager (`DAGL`) role has the same access as accountants, but also has confirm access to the first confirmation step. Users with an auditor role are only allowed to read/confirm the second confirmation step but are not allowed to instantiate, read, or fill out the data task. Everyone is allowed to see the receipt.

### LocalTest

- The user `Pengelens Partner` has the role of accountant at `DDG Fitness`.
- The user `Gjentagende Forelder` has the role of auditor at `DDG Fitness`.
- The user `Sophie Salt` has the role of manager at `DDG Fitness`.

### TT02

- The user with test id `12895697972` has the role of accountant in the organization `GRETTEN KUL TIGER AS`.
- The user with test id `25877799797` has the role of auditor in the organization `GRETTEN KUL TIGER AS`.
- The user with test id `20827199746` has the role of manager in the organization `GRETTEN KUL TIGER AS`.
- The party id for the organization `GRETTEN KUL TIGER AS` is `51826033`.
