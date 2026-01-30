# Party Selection Redirect Refactor

Move party-selection redirect logic from frontend (`Entrypoint.tsx`) to backend (`HomeController.cs`).

## Current Frontend Logic

From `src/App/frontend/src/features/entrypoint/Entrypoint.tsx`:

1. `!partyIsValid` → redirect to `/party-selection/403`
2. `promptForParty === 'always'` (multiple parties, user hasn't selected) → `/party-selection/explained`
3. `promptForParty === 'never'` or `profile.doNotPromptForParty` → no redirect, show content
4. Single valid party → no redirect, show content
5. Default (multiple parties, no explicit preference) → `/party-selection/explained`

## Backend Services to Use

| Service | Purpose |
|---------|---------|
| `IAuthenticationContext` | Get current authenticated user |
| `Authenticated.User.LoadDetails()` | Get party validation info, valid parties list |
| `IProfileClient` | Get user profile with `profileSettingPreference.doNotPromptForParty` |
| `IAuthorizationClient.ValidateSelectedParty()` | Validate party selection |

## Files to Modify

| Type | File |
|------|------|
| Backend (implement) | `src/Altinn.App.Api/Controllers/HomeController.cs` |
| Backend tests (new) | `test/Altinn.App.Api.Tests/Controllers/HomeControllerTest_PartySelection.cs` |
| Cypress | `frontend/test/e2e/integration/frontend-test/party-selection.ts` |
| Cypress | `frontend/test/e2e/integration/stateless-app/party-selection.ts` |
| Cypress | `frontend/test/e2e/integration/frontend-test/redirect.ts` |
| Frontend unit test | `frontend/src/features/instantiate/containers/PartySelection.test.tsx` |
| Frontend (remove) | `frontend/src/features/entrypoint/Entrypoint.tsx` |

## Tasks

### Phase 1: Backend Tests (TDD)

- [x] Create `HomeControllerTest_PartySelection.cs` test file
- [x] Test: Redirect to `/party-selection/403` when selected party is invalid (FAILING)
- [x] Test: Redirect to `/party-selection/explained` when `promptForParty=always` (FAILING)
- [x] Test: Redirect to `/party-selection/explained` when multiple parties and no preference set (FAILING)
- [x] Test: No redirect when single valid party (PASSING)
- [x] Test: No redirect when `promptForParty=never` (PASSING)
- [x] Test: No redirect when user has `doNotPromptForParty` preference (PASSING)
- [x] Added `PromptForParty` property to `ApplicationMetadata`

### Phase 2: Backend Implementation

- [x] Add `IAuthenticationContext` to `HomeController` constructor (via `IServiceProvider`)
- [x] Implement `GetPartySelectionRedirect()` method with party validation logic
- [x] Implement redirect logic based on conditions (matching frontend order of precedence)
- [x] All 6 tests green

### Phase 3: Frontend Test Updates

**Problem**: Frontend Cypress mocks (`cyMockResponses`) only intercept HTTP responses to the frontend. They do NOT affect backend redirect decisions in `HomeController.GetPartySelectionRedirect()`. All current localtest users have `doNotPromptForParty: true`, so they never trigger party selection redirects.

**Solution**: Create localtest test data for users with different configurations to test all redirect scenarios.

#### 3.1 Localtest test users

**Existing users we can reuse:**
- User 12345 (default): 1 party, doNotPromptForParty=true → tests "single party skips selection"
- User 1001 (accountant): 2 parties, doNotPromptForParty=true → tests "multi-party with skip preference"
- User 1337 (manager): 9 parties, doNotPromptForParty=true → tests "promptForParty=always overrides preference"

**New user created:**
- [x] **User 2001**: Multi-party, doNotPromptForParty=false (triggers party selection)
  - `Profile/User/2001.json` - `doNotPromptForParty: false`
  - `Register/Party/512001.json` - person party
  - `authorization/partylist/2001.json` - 2 parties (personal + DDG Fitness)
  - Added to Cypress config as `multiPartyPrompt`

#### 3.2 Restore Cypress tests with localtest data

**Tests to restore in `frontend-test/party-selection.ts`**:

| Test | User | Expected Behavior | Restore? |
|------|------|-------------------|----------|
| Prompts for party (doNotPromptForParty=false, multi-party) | 2001 (new) | Shows party selection with "Hvorfor ser jeg dette?" | ✅ Yes |
| Does not prompt (single party) | 12345 (default) | Skips party selection, goes straight to app | ✅ Yes |
| Does not prompt (doNotPromptForParty=true, multi-party) | 1001 (accountant) | Skips party selection | ✅ Yes |
| promptForParty=always overrides user preference | - | Shows party selection | ❌ Skip (no test app) |
| promptForParty=never overrides user preference | - | Skips party selection | ❌ Skip (no test app) |

**Note**: The `promptForParty` tests are skipped because they require test apps with specific `promptForParty` settings configured. These scenarios are covered by backend integration tests in `HomeControllerTest_PartySelection.cs`.

#### 3.3 Test app configuration for promptForParty tests

**Challenge**: The `promptForParty` setting affects both:
1. Backend redirect decision (HomeController reads ApplicationMetadata)
2. Frontend message display (PartySelection.tsx reads `appMetadata.promptForParty`)

Frontend intercepts can change the message shown, but NOT the backend redirect behavior.

**Options for promptForParty tests:**

| Option | Pros | Cons |
|--------|------|------|
| A: Create separate test apps with `promptForParty` configured | Full E2E coverage | More test infrastructure to maintain |
| B: Skip promptForParty E2E tests, rely on backend integration tests | Already have coverage in HomeControllerTest_PartySelection.cs | Less E2E confidence |
| C: Hybrid - intercept frontend for message, backend tests for redirect | Tests both layers | More complex, split coverage |

**Recommendation**: Option B - Skip `promptForParty` E2E tests for now
- We have comprehensive backend tests for redirect logic
- The frontend message display is simpler and lower risk
- Can add E2E tests later if needed by creating test apps

#### 3.4 Other Cypress test updates

**`stateless-app/party-selection.ts`**:
- [x] Updated to use user 2001 (multiPartyPrompt) instead of accountant with frontend mock
- [x] Removed `doNotPromptForParty: false` mock and unused imports

**`frontend-test/redirect.ts`**:
- [x] No changes needed - tests error handling, not party selection

#### 3.5 Frontend unit tests

- [x] Checked `PartySelection.test.tsx` - tests UI functionality only (pagination, filtering, selecting), no redirect logic - no changes needed

### Phase 4: Frontend Cleanup

- [x] Remove party-selection redirect logic from `Entrypoint.tsx`
- [x] Removed unused hooks/imports (`usePartiesAllowedToInstantiate`, `promptForParty`, etc.)

## Test Pattern Reference

From `HomeControllerTest_SetQueryParams.cs`:

```csharp
public class HomeControllerTest_PartySelection : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public HomeControllerTest_PartySelection(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    ) : base(factory, outputHelper) { }

    [Fact]
    public async Task Index_InvalidParty_RedirectsToPartySelection403()
    {
        // Arrange
        OverrideServicesForThisTest = (services) =>
        {
            // Configure mocks
        };

        HttpClient client = GetRootedUserClient(org, app, userId, partyId);

        // Act
        var response = await client.GetAsync($"/{org}/{app}/");

        // Assert
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal($"/{org}/{app}/party-selection/403", response.Headers.Location?.ToString());
    }
}
```

## Localtest User Data Reference

| User ID | Username | # Parties | doNotPromptForParty | Cypress alias |
|---------|----------|-----------|---------------------|---------------|
| 1001 | PengelensPartner | 2 | `true` | accountant |
| 1002 | GjentagendeForelder | 2 | `true` | auditor |
| 1003 | RikForelder | 1 | `true` | - |
| 1004 | SelvRegistrert | 1 | (not set) | selfIdentified |
| 1337 | SophieDDG | 9 | `true` | manager |
| 12345 | OlaNordmann | 1 | `true` | default |
| **2001** | **MultiPartyPrompt** | **2** | **`false`** | **multiPartyPrompt** |

## Progress Log

| Date | Update |
|------|--------|
| 2026-01-28 | Created plan document |
| 2026-01-28 | Phase 1 complete: 6 tests written (3 failing, 3 passing). Added `PromptForParty` to `ApplicationMetadata`. |
| 2026-01-28 | Phase 2 complete: All 6 tests passing. Added `GetPartySelectionRedirect()` to `HomeController`. Logic: invalid party → 403, `always` → explained, `never` → skip, `doNotPromptForParty` → skip, single party → skip, default multiple → explained. |
| 2026-01-28 | Phase 4 (partial): Removed party-selection redirect logic from `Entrypoint.tsx`. |
| 2026-01-28 | Phase 3 research: Discovered all localtest users have `doNotPromptForParty: true`. Frontend mocks don't affect backend redirects. Need to create new test user with `doNotPromptForParty: false`. |
| 2026-01-30 | Phase 3 complete: Created localtest user 2001 (multiPartyPrompt) with `doNotPromptForParty: false`. Restored Cypress tests using localtest data. Updated `stateless-app/party-selection.ts`. Checked `PartySelection.test.tsx` (no changes needed). |
| 2026-01-30 | **All phases complete.** |