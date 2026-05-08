# TODO: Workflow Engine Integration — Remaining Work

## 1. Fix Circular Dependency in HTTP Clients

**Priority**: Medium — works today via lazy resolution, but the design is fragile.

**Problem**: Three clients have a circular dependency through `AuthenticationContext`:

```
ProfileClient → IAuthenticationTokenResolver → AuthenticationContext → IProfileClient
AltinnPartyClient → IAuthenticationTokenResolver → AuthenticationContext → IAltinnPartyClient
AuthorizationClient → IAuthenticationTokenResolver → AuthenticationContext → IAuthorizationClient
```

**Current workaround**: Lazy resolution via `GetAuthTokenResolver()` in each client:
```csharp
private IAuthenticationTokenResolver? _authTokenResolver;
private IAuthenticationTokenResolver GetAuthTokenResolver() =>
    _authTokenResolver ??= _serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
```

This avoids the infinite recursion during DI construction but hides the cycle. DI's built-in cycle detection doesn't catch it because these clients resolve from `IServiceProvider` directly in constructors.

**Files**:
- `src/Altinn.App.Core/Infrastructure/Clients/Profile/ProfileClient.cs`
- `src/Altinn.App.Core/Infrastructure/Clients/Register/AltinnPartyClient.cs`
- `src/Altinn.App.Core/Infrastructure/Clients/Authorization/AuthorizationClient.cs`
- `src/Altinn.App.Core/Features/Auth/AuthenticationContext.cs`
- `src/Altinn.App.Core/Internal/Auth/AuthenticationTokenResolver.cs`

**Possible approaches**:
1. **Extract a "token-only" interface** — `AuthenticationContext` doesn't need full `IProfileClient`/`IAltinnPartyClient`/`IAuthorizationClient`. It calls specific methods lazily (via delegates). Consider whether the dependency can be restructured so `AuthenticationContext` doesn't pull in these clients at all, or uses a narrower interface that doesn't depend on `IAuthenticationTokenResolver`.
2. **Move token resolution out of the client layer** — Instead of each client resolving tokens internally, have callers pass tokens explicitly (breaking change, unlikely).
3. **Accept the lazy pattern** — Document it clearly. It works, it's just not elegant.

## 2. Deprecate IUserTokenProvider

**Priority**: Low — no urgency, but should be done for clarity.

After the HTTP client migration, `IUserTokenProvider` / `UserTokenProvider` are only used by `DefaultEFormidlingService`. All other callers now use `IAuthenticationTokenResolver`.

**Action**:
- Add `[Obsolete("Use IAuthenticationTokenResolver instead")]` to `IUserTokenProvider` and `UserTokenProvider`
- Keep the DI registration (needed by `DefaultEFormidlingService`)
- Eventually migrate `DefaultEFormidlingService` too (different concern — EFormidling auth)

**Files**:
- `src/Altinn.App.Core/Internal/Auth/IUserTokenProvider.cs`
- `src/Altinn.App.Core/Infrastructure/Clients/Authentication/UserTokenProvider.cs`

## 3. Integration Test Coverage for Workflow Engine Callbacks

**Priority**: Medium — the basic flow is tested, but edge cases aren't.

**Current state**: `BasicAppTests.Full` calls `ProcessNext` which triggers the real workflow engine. The engine calls back to the app container. This exercises the happy path.

**Missing coverage**:
- Service task execution via workflow engine callback (callback runs `[AllowAnonymous]`, uses `StorageAuthenticationMethod.ServiceOwner()`)
- Auto-advance after service tasks
- Callback failure handling (engine retries, app returns error)
- Process state passthrough (see `workflow-engine-state-passthrough.md`)

## 4. Verify All Callers Can Pass ServiceOwner Auth

**Priority**: Medium — the whole point of the migration.

The HTTP client migration added optional `StorageAuthenticationMethod? authenticationMethod` to all client interfaces. Verify that workflow engine callback code paths actually pass `StorageAuthenticationMethod.ServiceOwner()` where needed.

**Key call sites to check**:
- `CommonTaskInitialization` — instantiation during callbacks
- `PdfServiceTask` — PDF generation during service tasks
- Any code path triggered by `WorkflowEngineCallbackController`
