# Plan: Decouple AuthenticationContext from HttpContext

## Context

`AuthenticationContext` (and `ProcessEngineAuthorizer`, `DataElementAccessChecker`) are tightly coupled to `HttpContext`. This prevents background services (like `FiksArkivHost`) and future WorkflowEngine callback handlers from calling `ProcessEngine.Next()` directly — they have no HTTP request context.

Today, `FiksArkivHost` works around this by making an HTTP loopback call to the app's own `/process/next` endpoint with a Maskinporten token, which is wasteful and fragile. The eFormidling handler has the same pattern. Both should be able to call `ProcessEngine.Next()` directly with a ServiceOwner identity.

There's a TODO in `AuthenticationContext.cs` (line 48-53):
```
// Currently we're coupling this to the HTTP context directly.
// In the future we might want to run work (e.g. service tasks) in the background,
// at which point we won't always have a HTTP context available.
// At that point we probably want to implement something like an `IExecutionContext`, `IExecutionContextAccessor`
// to decouple ourselves from the ASP.NET request context.
// TODO: consider removing dependency on HTTP context
```

**Goal**: Fulfill this intent — fully decouple from HttpContext by introducing a proper abstraction layer, so that `AuthenticationContext` no longer knows about HTTP at all.

## Design Principles

1. **Replace, don't bypass.** The existing TODO envisions `IExecutionContext`/`IExecutionContextAccessor` — a clean abstraction that replaces the HTTP coupling, not an AsyncLocal escape hatch bolted on top.
2. **Keep `IAuthenticationContext` unchanged.** It's a public interface. Adding methods would mix concerns and create a runtime landmine for anyone who has replaced the implementation via `TryAddSingleton`.
3. **Parse, don't validate.** Make illegal states unrepresentable. The actor context type encodes what's valid in its structure — no nullable token on an authenticated actor, no `IsAuthenticated` bool that can contradict the type.
4. **Classification stays in `AuthenticationContext`.** The actor context carries *raw inputs* (token, principal, optional selected party). The classification into `Authenticated.User` / `ServiceOwner` / `Org` / `SystemUser` stays in `AuthenticationContext.Build`, exactly where it lives today. The middleware does not decide who the actor is — it captures what the transport provides.
5. **Explicit trust boundaries.** The public API does not construct a `ClaimsPrincipal` from unvalidated JWT claims. Callers provide a trusted principal explicitly, making the trust decision visible at the call site.
6. **Same accessor pattern as ASP.NET Core.** `IHttpContextAccessor` uses `AsyncLocal` internally. We follow the same pattern, including the holder indirection for safe cleanup semantics. Deviations from this pattern require explicit testing and documentation.

## What depends on HttpContext today (auth-related)

| Component | What it reads from HttpContext | How |
|---|---|---|
| `AuthenticationContext` | JWT token (cookie/header), `User.Identity.IsAuthenticated`, party cookie | `IHttpContextAccessor` |
| `ProcessEngineAuthorizer` | `HttpContext.User` (`ClaimsPrincipal`) | `IHttpContextAccessor` |
| `DataElementAccessChecker` | `HttpContext.User` (`ClaimsPrincipal`) | `IHttpContextAccessor` |

All three need the same fundamental inputs: **who is the actor** (token + claims) and **what party they've selected**.

## Changes

### 1. Introduce `ActorContext` (discriminated union) and `IActorContextAccessor`

**Why `ActorContext`?** Not "request" (implies HTTP), not "execution" (collides with `System.Threading.ExecutionContext`), not "caller" (implies active invocation — awkward for background tasks where nobody "called" anything). "Actor" is the entity performing the action — works for HTTP users, service owners, system users, and background services alike. The term already exists in the Altinn codebase (`Actor` in process events, `ProcessNextRequestFactory.ExtractActor`).

**Why a discriminated union?** An interface with `string? Token`, `bool IsAuthenticated`, `ClaimsPrincipal Principal`, `string? SelectedParty` allows invalid states — e.g. `Token = null` with `IsAuthenticated = true`. The discriminated union makes `Unauthenticated` vs `Authenticated` explicit in the type system.

**Why only two subtypes (not ForUser/FromToken)?** The actor context carries *raw inputs*, not a domain classification. Whether the actor is a user, org, service owner, or system user is determined by JWT claims inside `Authenticated.From()` — that logic stays in `AuthenticationContext`. The party cookie is just an optional override for selected party; its presence or absence does not determine whether the actor is a user. A user without a party cookie is still a user.

```csharp
// src/Altinn.App.Core/Features/Auth/ActorContext.cs

namespace Altinn.App.Core.Features.Auth;

/// <summary>
/// Represents the identity and context of whoever is performing the current
/// unit of work — an HTTP request, a background service task, a hosted service, etc.
/// <para>
/// This is a discriminated union: <see cref="Unauthenticated"/> or <see cref="Authenticated"/>.
/// The actor context carries raw inputs for authentication — the classification into
/// <c>Authenticated.User</c> / <c>ServiceOwner</c> / <c>Org</c> / <c>SystemUser</c>
/// is done by <see cref="AuthenticationContext"/>, not here.
/// </para>
/// </summary>
public abstract class ActorContext
{
    private ActorContext() { }

    /// <summary>
    /// The actor's claims principal, used for authorization (XACML PDP evaluation).
    /// Available on all subtypes — even <see cref="Unauthenticated"/> provides an empty principal
    /// (matching ASP.NET's <c>HttpContext.User</c> behavior for anonymous requests).
    /// </summary>
    public abstract ClaimsPrincipal Principal { get; }

    /// <summary>
    /// No authentication — anonymous request or missing/rejected token.
    /// </summary>
    public sealed class Unauthenticated : ActorContext
    {
        /// <summary>
        /// Singleton instance.
        /// </summary>
        public static readonly Unauthenticated Instance = new();

        /// <inheritdoc />
        public override ClaimsPrincipal Principal { get; } = new();
    }

    /// <summary>
    /// An authenticated actor with a JWT token.
    /// The token and principal are provided by trusted infrastructure:
    /// ASP.NET auth middleware for HTTP requests, or explicitly by background services
    /// that acquire tokens from trusted sources (e.g. Maskinporten).
    /// </summary>
    public sealed class Authenticated : ActorContext
    {
        /// <summary>
        /// The JWT token string.
        /// </summary>
        public string Token { get; }

        /// <inheritdoc />
        public override ClaimsPrincipal Principal { get; }

        /// <summary>
        /// The selected party (Altinn party cookie value), or null if not applicable.
        /// Only meaningful for interactive users who have selected a party in the Altinn portal.
        /// When null and the actor is a user, the user's own party ID from the token is used.
        /// For non-user actors (ServiceOwner, Org, SystemUser) this is always null.
        /// </summary>
        public string? SelectedParty { get; }

        /// <summary>
        /// Initializes a new instance with a pre-validated principal.
        /// </summary>
        /// <param name="token">A valid JWT token string</param>
        /// <param name="principal">
        /// A trusted <see cref="ClaimsPrincipal"/>.
        /// For HTTP: provided by ASP.NET auth middleware (<c>HttpContext.User</c>).
        /// For background services: constructed by the caller from a token acquired from a trusted source.
        /// </param>
        /// <param name="selectedParty">The Altinn party cookie value, or null</param>
        public Authenticated(string token, ClaimsPrincipal principal, string? selectedParty = null)
        {
            Token = token;
            Principal = principal;
            SelectedParty = selectedParty;
        }
    }
}
```

**What's unrepresentable now:**
- An authenticated actor without a token (non-nullable `Token`)
- An `IsAuthenticated = true` with no token (encoded in the type: `Authenticated` vs `Unauthenticated`)

**What's explicit now:**
- The caller provides the `ClaimsPrincipal` — the trust decision is visible at the call site
- `SelectedParty` is optional on all authenticated actors — `AuthenticationContext` decides if and how to use it based on claims

The accessor holds `ActorContext?` where `null` = "not yet set" (no middleware/scope has run) and `Unauthenticated` = "set, but anonymous."

```csharp
// src/Altinn.App.Core/Features/Auth/IActorContextAccessor.cs

namespace Altinn.App.Core.Features.Auth;

/// <summary>
/// Provides ambient access to the current <see cref="ActorContext"/>.
/// Follows the same pattern as <see cref="IHttpContextAccessor"/>.
/// </summary>
public interface IActorContextAccessor
{
    /// <summary>
    /// The actor context for the current async scope, or null if none has been established.
    /// Set by middleware for HTTP requests. Set explicitly for background work.
    /// </summary>
    ActorContext? ActorContext { get; set; }
}
```

**Visibility**: Both types are `public`. Background services in apps and external packages
(e.g. `Altinn.App.Clients.Fiks`) need to resolve `IActorContextAccessor` from DI and
construct `ActorContext.Authenticated` instances.

### 2. Implement `ActorContextAccessor`

Uses the **same holder indirection pattern as `HttpContextAccessor`**. The holder allows cleanup to propagate to forked async contexts: when middleware or a scope sets the context to null, fire-and-forget Tasks that captured the holder also see null, preventing stale actor context from leaking into unrelated work.

If testing reveals that nested `ActorContextScope` usage (e.g. auto-advance service tasks) requires isolated scopes where forked work must not see the parent's cleanup, we can revisit this decision — but the default should match the well-tested ASP.NET pattern.

```csharp
// src/Altinn.App.Core/Features/Auth/ActorContextAccessor.cs

namespace Altinn.App.Core.Features.Auth;

internal sealed class ActorContextAccessor : IActorContextAccessor
{
    private static readonly AsyncLocal<ActorContextHolder> _current = new();

    public ActorContext? ActorContext
    {
        get => _current.Value?.Context;
        set
        {
            var holder = _current.Value;
            if (holder != null)
            {
                holder.Context = null;
            }

            if (value != null)
            {
                _current.Value = new ActorContextHolder { Context = value };
            }
        }
    }

    private sealed class ActorContextHolder
    {
        public ActorContext? Context;
    }
}
```

### 3. Add `ActorContextMiddleware`

Sets the `IActorContextAccessor` for HTTP requests. Registered after `UseAuthentication()`.

The middleware captures raw transport data — token, ASP.NET-validated principal, party cookie — and wraps it in an `ActorContext.Authenticated`. It does **not** classify the actor type. That stays in `AuthenticationContext`.

```csharp
// src/Altinn.App.Api/Infrastructure/Middleware/ActorContextMiddleware.cs

namespace Altinn.App.Api.Infrastructure.Middleware;

using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using AltinnCore.Authentication.Utils;

internal sealed class ActorContextMiddleware
{
    private readonly RequestDelegate _next;

    public ActorContextMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(
        HttpContext httpContext,
        IActorContextAccessor actorContextAccessor,
        IOptionsMonitor<AppSettings> appSettings,
        IOptionsMonitor<GeneralSettings> generalSettings
    )
    {
        actorContextAccessor.ActorContext = BuildActorContext(httpContext, appSettings, generalSettings);
        try
        {
            await _next(httpContext);
        }
        finally
        {
            actorContextAccessor.ActorContext = null;
        }
    }

    private static ActorContext BuildActorContext(
        HttpContext httpContext,
        IOptionsMonitor<AppSettings> appSettings,
        IOptionsMonitor<GeneralSettings> generalSettings
    )
    {
        var token = JwtTokenUtil.GetTokenFromContext(httpContext, appSettings.CurrentValue.RuntimeCookieName);
        if (string.IsNullOrWhiteSpace(token))
            return ActorContext.Unauthenticated.Instance;

        var principal = httpContext.User ?? new ClaimsPrincipal();
        var selectedParty = httpContext.Request.Cookies[generalSettings.CurrentValue.GetAltinnPartyCookieName];
        return new ActorContext.Authenticated(token, principal, selectedParty);
    }
}
```

Register in the pipeline after `UseAuthentication()`:
```csharp
app.UseAuthentication();
app.UseMiddleware<ActorContextMiddleware>();
```

### 4. Add `ActorContextScope`

A disposable that sets and restores the actor context. Public — apps use this for the `using` pattern.

```csharp
// src/Altinn.App.Core/Features/Auth/ActorContextScope.cs

namespace Altinn.App.Core.Features.Auth;

/// <summary>
/// Sets an actor context on the accessor for the duration of the scope.
/// Dispose to restore the previous context.
/// </summary>
/// <example>
/// <code>
/// // Background service acquires a Maskinporten token (trusted source)
/// var token = await maskinportenClient.GetAltinnExchangedToken(scopes, ct);
/// var principal = new ClaimsPrincipal(
///     new ClaimsIdentity(new JwtSecurityTokenHandler().ReadJwtToken(token.Value).Claims, "Bearer")
/// );
///
/// using var scope = new ActorContextScope(
///     actorContextAccessor,
///     new ActorContext.Authenticated(token.Value, principal)
/// );
/// await processEngine.Next(request, ct);
/// </code>
/// </example>
public sealed class ActorContextScope : IDisposable
{
    private readonly IActorContextAccessor _accessor;
    private readonly ActorContext? _previous;

    /// <summary>
    /// Initializes a new instance of the <see cref="ActorContextScope"/> class.
    /// </summary>
    /// <param name="accessor">The accessor to set the context on</param>
    /// <param name="context">The actor context for this scope</param>
    public ActorContextScope(IActorContextAccessor accessor, ActorContext context)
    {
        _accessor = accessor;
        _previous = accessor.ActorContext;
        _accessor.ActorContext = context;
    }

    /// <summary>
    /// Restores the previous actor context.
    /// </summary>
    public void Dispose() => _accessor.ActorContext = _previous;
}
```

### 5. Refactor `AuthenticationContext`

Replace `IHttpContextAccessor` with `IActorContextAccessor`. Remove all `Microsoft.AspNetCore.Http` imports.
The classification logic (`Authenticated.From` / `Authenticated.FromOldLocalTest`) stays here —
the actor context provides raw inputs, `AuthenticationContext` transforms them into `Authenticated`.

**Caching**: Currently uses `HttpContext.Items`. Replace with a `ConditionalWeakTable<ActorContext, Features.Auth.Authenticated>`.
The `ActorContext` instance IS the cache key — one instance per request/scope, created by middleware or `ActorContextScope`.
When the scope ends and the `ActorContext` is GC'd, the cache entry is collected automatically.
No explicit invalidation needed. (`Unauthenticated.Instance` is a singleton — its cache entry lives forever, which is correct since the result is always `Authenticated.None`.)

Note: the `ConditionalWeakTable` should be an instance field rather than `static`, since `AuthenticationContext` is a singleton and the table doesn't need to survive beyond its lifetime.

```csharp
// src/Altinn.App.Core/Features/Auth/AuthenticationContext.cs

namespace Altinn.App.Core.Features.Auth;

internal sealed class AuthenticationContext : IAuthenticationContext
{
    private readonly ConditionalWeakTable<ActorContext, Authenticated> _cache = new();

    private readonly IActorContextAccessor _actorContextAccessor;
    private readonly IOptionsMonitor<GeneralSettings> _generalSettings;
    private readonly IProfileClient _profileClient;
    private readonly IAltinnPartyClient _altinnPartyClient;
    private readonly IAuthorizationClient _authorizationClient;
    private readonly IAppConfigurationCache _appConfigurationCache;
    private readonly RuntimeEnvironment _runtimeEnvironment;

    public AuthenticationContext(
        IActorContextAccessor actorContextAccessor,
        IOptionsMonitor<GeneralSettings> generalSettings,
        IProfileClient profileClient,
        IAltinnPartyClient altinnPartyClient,
        IAuthorizationClient authorizationClient,
        IAppConfigurationCache appConfigurationCache,
        RuntimeEnvironment runtimeEnvironment
    )
    {
        _actorContextAccessor = actorContextAccessor;
        _generalSettings = generalSettings;
        _profileClient = profileClient;
        _altinnPartyClient = altinnPartyClient;
        _authorizationClient = authorizationClient;
        _appConfigurationCache = appConfigurationCache;
        _runtimeEnvironment = runtimeEnvironment;
    }

    public Authenticated Current
    {
        get
        {
            var actorContext = _actorContextAccessor.ActorContext
                ?? throw new AuthenticationContextException(
                    "No actor context available. "
                    + "In HTTP requests this is set by ActorContextMiddleware. "
                    + "In background services, set it via IActorContextAccessor before calling code "
                    + "that depends on IAuthenticationContext."
                );

            return _cache.GetValue(actorContext, Build);
        }
    }

    private Authenticated Build(ActorContext actorContext)
    {
        return actorContext switch
        {
            ActorContext.Unauthenticated => BuildUnauthenticated(),
            ActorContext.Authenticated auth => BuildAuthenticated(auth),
            _ => throw new AuthenticationContextException(
                $"Unknown actor context type: {actorContext.GetType().Name}"
            ),
        };
    }

    private Authenticated BuildUnauthenticated()
    {
        return Authenticated.From(
            tokenStr: null,
            parsedToken: null,
            isAuthenticated: false,
            _appConfigurationCache.ApplicationMetadata,
            getSelectedParty: () => null,
            getUserProfile: (int userId) => _profileClient.GetUserProfile(userId),
            lookupUserParty: (int partyId) => _altinnPartyClient.GetParty(partyId),
            lookupOrgParty: (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
            getPartyList: (int userId) => _authorizationClient.GetPartyList(userId),
            validateSelectedParty: (int userId, int partyId) =>
                _authorizationClient.ValidateSelectedParty(userId, partyId)
        );
    }

    private Authenticated BuildAuthenticated(ActorContext.Authenticated auth)
    {
        var generalSettings = _generalSettings.CurrentValue;
        var handler = new JwtSecurityTokenHandler();
        var parsedToken = handler.ReadJwtToken(auth.Token);

        bool isNewLocaltestToken =
            parsedToken.Payload.TryGetValue("actual_iss", out var actualIss) && actualIss is "localtest";
        var isLocaltest = _runtimeEnvironment.IsLocaltestPlatform() && !generalSettings.IsTest;

        if (isLocaltest && !isNewLocaltestToken)
        {
            return Authenticated.FromOldLocalTest(
                tokenStr: auth.Token,
                parsedToken,
                isAuthenticated: true,
                _appConfigurationCache.ApplicationMetadata,
                () => auth.SelectedParty,
                (int userId) => _profileClient.GetUserProfile(userId),
                (int partyId) => _altinnPartyClient.GetParty(partyId),
                (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
                (int userId) => _authorizationClient.GetPartyList(userId),
                (int userId, int partyId) => _authorizationClient.ValidateSelectedParty(userId, partyId)
            );
        }

        return Authenticated.From(
            tokenStr: auth.Token,
            parsedToken,
            isAuthenticated: auth.Principal.Identity?.IsAuthenticated ?? false,
            _appConfigurationCache.ApplicationMetadata,
            () => auth.SelectedParty,
            (int userId) => _profileClient.GetUserProfile(userId),
            (int partyId) => _altinnPartyClient.GetParty(partyId),
            (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
            (int userId) => _authorizationClient.GetPartyList(userId),
            (int userId, int partyId) => _authorizationClient.ValidateSelectedParty(userId, partyId)
        );
    }
}
```

**Key changes**:
- No `Microsoft.AspNetCore.Http` imports
- `IOptionsMonitor<AppSettings>` removed (cookie name is now the middleware's concern)
- `ConditionalWeakTable` replaces `HttpContext.Items` for caching (instance field, not static)
- Classification stays in `BuildAuthenticated` — same `Authenticated.From()` / `FromOldLocalTest()` logic
- `SelectedParty` passed through from `ActorContext.Authenticated` — used by `Authenticated.From()` for users, ignored for other types
- The TODO comment is gone — the decoupling is done

### 6. Refactor `ProcessEngineAuthorizer`

Replace `IHttpContextAccessor` with `IActorContextAccessor`. Reads `Principal` from the abstract base (available on all subtypes).

```csharp
// src/Altinn.App.Core/Internal/Process/ProcessEngineAuthorizer.cs

internal sealed class ProcessEngineAuthorizer : IProcessEngineAuthorizer
{
    private readonly IAuthorizationService _authorizationService;
    private readonly IActorContextAccessor _actorContextAccessor;
    private readonly ILogger<ProcessEngineAuthorizer> _logger;

    public ProcessEngineAuthorizer(
        IAuthorizationService authorizationService,
        IActorContextAccessor actorContextAccessor,
        ILogger<ProcessEngineAuthorizer> logger
    )
    {
        _authorizationService = authorizationService;
        _actorContextAccessor = actorContextAccessor;
        _logger = logger;
    }

    public async Task<bool> AuthorizeProcessNext(Instance instance, string? action = null)
    {
        // ... unchanged task/action logic ...

        var user = _actorContextAccessor.ActorContext?.Principal
            ?? throw new ProcessException("No actor context available");

        // passes `user` to AuthorizeAction() — same as before
    }
}
```

### 7. Refactor `DataElementAccessChecker`

Same pattern — replace `IHttpContextAccessor` with `IActorContextAccessor`, read `.Principal`.

### 8. Remove dead `User` field from `ProcessNextRequest`

**File**: `src/Altinn.App.Core/Models/Process/ProcessNextRequest.cs`

The `ClaimsPrincipal User` property appears unused — `ProcessEngine` uses `_authenticationContext.Current` and `_processEngineAuthorizer` for auth decisions, not `request.User`. A repo-wide search should confirm no code reads this field before removing it.

### 9. DI Registration

```csharp
// In AuthenticationContextDI.cs (or equivalent)
services.TryAddSingleton<IActorContextAccessor, ActorContextAccessor>();
services.TryAddSingleton<IAuthenticationContext, AuthenticationContext>();
```

Both are singletons. `ActorContextAccessor` uses `AsyncLocal` with holder indirection for per-scope state.
`AuthenticationContext` uses `ConditionalWeakTable` for per-scope caching.

## Visibility Summary

| Type | Visibility | Why |
|---|---|---|
| `ActorContext` | **public** | Base type — apps pattern-match on subtypes |
| `ActorContext.Unauthenticated` | **public** | Singleton, used by middleware and tests |
| `ActorContext.Authenticated` | **public** | Public constructor — apps and background services create these with trusted token + principal |
| `IActorContextAccessor` | **public** | Apps resolve this from DI to set context in background services |
| `ActorContextScope` | **public** | Apps use the `using` pattern |
| `ActorContextAccessor` | **internal** | Implementation detail |
| `ActorContextMiddleware` | **internal** | Pipeline infrastructure |

## Usage Pattern

### HTTP requests (automatic)

No change for HTTP requests. The middleware captures token, ASP.NET-validated principal, and party cookie into `ActorContext.Authenticated`. `IAuthenticationContext.Current` works transparently.

### Background services

```csharp
// In a BackgroundService / hosted service / workflow callback:

// 1. Acquire a token from a trusted source (e.g. Maskinporten)
var token = await _maskinportenClient.GetAltinnExchangedToken(scopes, ct);

// 2. Construct a principal from the trusted token
//    (ReadJwtToken doesn't validate — this is safe because WE acquired the token)
var principal = new ClaimsPrincipal(
    new ClaimsIdentity(new JwtSecurityTokenHandler().ReadJwtToken(token.Value).Claims, "Bearer")
);

// 3. Establish the context for this async scope
using var scope = new ActorContextScope(
    _actorContextAccessor,
    new ActorContext.Authenticated(token.Value, principal)
);

// 4. Everything that reads IAuthenticationContext.Current now works:
//    - AuthenticationContext sees the token -> classifies via Authenticated.From()
//    - ProcessEngineAuthorizer sees the ClaimsPrincipal -> XACML eval works
//    - DataElementAccessChecker sees the ClaimsPrincipal -> access checks work
await _processEngine.Next(request, ct);
```

## Files to Modify

| File | Change |
|------|--------|
| **New:** `src/Altinn.App.Core/Features/Auth/ActorContext.cs` | Public discriminated union (base + Unauthenticated + Authenticated) |
| **New:** `src/Altinn.App.Core/Features/Auth/IActorContextAccessor.cs` | Public accessor interface |
| **New:** `src/Altinn.App.Core/Features/Auth/ActorContextAccessor.cs` | Internal, AsyncLocal with holder pattern |
| **New:** `src/Altinn.App.Core/Features/Auth/ActorContextScope.cs` | Public disposable scope helper |
| **New:** `src/Altinn.App.Api/Infrastructure/Middleware/ActorContextMiddleware.cs` | Internal, sets context for HTTP requests |
| `src/Altinn.App.Core/Features/Auth/AuthenticationContext.cs` | Replace `IHttpContextAccessor` with `IActorContextAccessor`, classification stays in `Build`, `ConditionalWeakTable` cache |
| `src/Altinn.App.Core/Features/Auth/AuthenticationContextDI.cs` | Register `IActorContextAccessor` |
| `src/Altinn.App.Core/Internal/Process/ProcessEngineAuthorizer.cs` | Replace `IHttpContextAccessor` with `IActorContextAccessor` |
| `src/Altinn.App.Core/Internal/Data/DataElementAccessChecker.cs` | Replace `IHttpContextAccessor` with `IActorContextAccessor` |
| `src/Altinn.App.Core/Models/Process/ProcessNextRequest.cs` | Remove dead `User` property (after repo-wide confirmation) |
| `src/Altinn.App.Api/Controllers/ProcessController.cs` | Remove `User = User` from ProcessNextRequest |
| Pipeline registration (app builder) | `app.UseMiddleware<ActorContextMiddleware>()` after `UseAuthentication()` |
| Test files | Update DI setup and mocks |

## Out of scope (future work)

These components also use `IHttpContextAccessor` but are **not** auth-related and should be addressed separately:

- `PdfService` — reads query params for language override
- `PdfGeneratorClient` — reads cookie for local dev frontend version
- `DataAnnotationValidator` — needs HttpContext for ASP.NET `ObjectModelValidator`
- `SignatureHashValidator` — reads `RequestAborted` cancellation token
- `InstanceLocker` — reads route values
- `UserTokenProvider` — could eventually use `ActorContext` token
- `AppImplementationFactory` — DI scope selection

## Verification

1. `dotnet build solutions/All.sln -v m` — must compile clean
2. `dotnet test test/Altinn.App.Core.Tests/ -v m` — existing auth and ProcessEngine tests pass
3. `dotnet test test/Altinn.App.Api.Tests/ -v m` — controller tests pass
4. New unit tests:
   - `ActorContextAccessor`: set/get/clear, verify holder cleanup propagation
   - `ActorContextScope`: restores previous context on dispose, nests correctly
   - `AuthenticationContext` with `ActorContext.Authenticated` (Maskinporten token): returns correct `Authenticated` subtype (e.g. `ServiceOwner`)
   - `AuthenticationContext` with `ActorContext.Authenticated` (user token + selected party): returns `Authenticated.User` with correct `SelectedPartyId`
   - `AuthenticationContext` with `ActorContext.Unauthenticated`: returns `Authenticated.None`
   - `ProcessEngineAuthorizer` with `IActorContextAccessor`: authorizes without HttpContext
5. `dotnet test test/Altinn.App.Integration.Tests/ -v m` — integration tests confirm HTTP path still works end-to-end
