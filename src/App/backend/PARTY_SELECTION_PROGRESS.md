# Party Selection Backend Refactoring Progress

**Last Updated:** 2026-02-04

## Overview
Refactoring party-selection redirect logic from frontend (Entrypoint.tsx) to backend (HomeController.cs), using TDD approach.

## Current Status: E2E Test Fixes Applied

### Completed
1. **Backend tests** - HomeControllerTest_PartySelection.cs (6 tests)
2. **Backend implementation** - GetPartySelectionRedirect() in HomeController.cs
3. **Frontend cleanup** - Removed redirect logic from Entrypoint.tsx
4. **Localtest user 2001** - Created with doNotPromptForParty=false
5. **ValidateSelectedParty fix** - Already applied in PartiesService.cs
6. **E2E test fixes** - Fixed state pollution issues (see below)

### Files Created for User 2001
- `localtest/testdata/Profile/User/2001.json`
- `localtest/testdata/Register/Party/512001.json`
- `localtest/testdata/authorization/partylist/2001.json`
- `localtest/testdata/authorization/roles/User_2001/party_512001/roles.json`
- `localtest/testdata/authorization/roles/User_2001/party_500000/roles.json`

### Cypress Config Updated
- `frontend/test/e2e/config/docker.json` - Added multiPartyPrompt user
- `frontend/test/e2e/support/auth.ts` - Added multiPartyPrompt to CyUser type

---

## E2E Test Fixes (2026-02-04)

### Root Cause: State Pollution
Tests were failing due to two types of state pollution:

1. **Accumulated instances** - Real instances created during test runs persisted in localtest storage, causing `/instance-selection` redirects
2. **Leftover cookies** - `AltinnPartyId` cookie from previous tests affected subsequent tests

### Why Main Branch Tests Didn't Have This Issue
Main branch tests use `cyMockResponses()` which includes this critical line:
```javascript
cy.intercept('**/active', whatToMock.activeInstances || []).as('activeInstances');
```
This mocks the `/instances/{partyId}/active` endpoint to return empty by default, preventing instance-selection redirects.

### Fixes Applied to party-selection.ts

**Tests using real localtest user data** now include:
```javascript
// Mock active instances to prevent instance-selection redirect
cy.intercept('**/active', []).as('activeInstances');
// Clear party cookie from previous tests
cy.clearCookie('AltinnPartyId');
```

**Test "Does not prompt for party when user has doNotPromptForParty=true":**
- Changed to use `cyMockResponses({ doNotPromptForParty: true, ... })` instead of relying on accountant user
- The accountant user (1001) didn't have proper instantiation rights in localtest, causing 403 errors

### Fixes Applied to instantiation.ts

All 4 tests now include:
```javascript
cy.clearCookie('AltinnPartyId');
```

Test 3 ("should show custom error message...when directly instantiating") also needed:
```javascript
cy.intercept('**/active', []).as('activeInstances');
```

---

## Key Technical Details

### Party Selection Flow (Backend)
1. User logs in
2. Backend checks `doNotPromptForParty` profile setting
3. Backend checks number of parties user can represent
4. Backend checks `CanRepresent` for selected party
5. If conditions met, redirect to `/party-selection/explained` or `/party-selection/403`

### Important: Backend vs Frontend Mocking
- `cyMockResponses()` intercepts **frontend API responses**
- The **backend** makes its own calls to platform services
- Backend redirect decisions use **real** profile data, not mocked data
- Tests that need specific backend behavior must use users with correct localtest data

### ValidateSelectedParty Endpoint
- URL: `GET /authorization/api/v1/parties/{partyId}/validate?userid={userId}`
- Called by app's `AuthorizationClient.ValidateSelectedParty`
- Used in `LoadDetails` when `validateSelectedParty: true`

### User 2001 Test Data
- UserId: 2001
- PartyId: 512001 (person)
- doNotPromptForParty: false
- Parties: [512001, 500000]

---

## Files Modified Today

### Frontend Tests
- `src/App/frontend/test/e2e/integration/frontend-test/party-selection.ts`
  - Added active instances mock and cookie clear to 3 tests
  - Changed doNotPromptForParty=true test to use cyMockResponses

- `src/App/frontend/test/e2e/integration/frontend-test/instantiation.ts`
  - Added cookie clear to all 4 tests
  - Added active instances mock to test 3

---

## Next Steps

1. **Run full E2E test suite** to verify all fixes work
2. **Clean up this progress file** once PR is merged
3. **Consider** adding beforeEach hook to clear cookies/mock active instances globally

---

## Quick Resume Commands

```bash
# Run the party-selection tests
cd /path/to/frontend && yarn cypress:open
# Then run: test/e2e/integration/frontend-test/party-selection.ts

# Run the instantiation tests
# Then run: test/e2e/integration/frontend-test/instantiation.ts
```
