# Signing test

App used for testing process flow with different access policy for different process steps.

## BPMN process

![bpmn process](https://dev.altinn.studio/repos/ttd/signing-test/raw/branch/master/process.png)

## Testing

The policy is set up so that users with `REGNA`/`DAGL` roles in an organization can instantiate and fill out the data step, but do not have read/confirm access to the confirmation step. Users with the role `REVAI` are only allowed to read/confirm the confirmation step but are not allowed to instantiate or fill out the data task. All three roles are allowed to see the receipt.

### LocalTest

- The user `Pengelens Partner` on behalf of `DDG Fitness` has the roles: `REGNA` and `DAGL`.
- The user `Gjentagende Forelder` on behalf of `DDG Fitness` has the role of `REVAI`.
- The user `Sophie Salt` on behalf of `DDG Fitness` has all three roles.

### TT02

- TODO: find suitable test users.
