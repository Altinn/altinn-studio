using System.IdentityModel.Tokens.Jwt;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Auth;

internal sealed class AuthenticationContext : IAuthenticationContext
{
    private const string ItemsKey = "Internal_AltinnAuthenticationInfo";
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IOptionsMonitor<AppSettings> _appSettings;
    private readonly IOptionsMonitor<GeneralSettings> _generalSettings;
    private readonly IProfileClient _profileClient;
    private readonly IAltinnPartyClient _altinnPartyClient;
    private readonly IAuthorizationClient _authorizationClient;
    private readonly IAppConfigurationCache _appConfigurationCache;
    private readonly RuntimeEnvironment _runtimeEnvironment;

    public AuthenticationContext(
        IHttpContextAccessor httpContextAccessor,
        IOptionsMonitor<AppSettings> appSettings,
        IOptionsMonitor<GeneralSettings> generalSettings,
        IProfileClient profileClient,
        IAltinnPartyClient altinnPartyClient,
        IAuthorizationClient authorizationClient,
        IAppConfigurationCache appConfigurationCache,
        RuntimeEnvironment runtimeEnvironment
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _appSettings = appSettings;
        _generalSettings = generalSettings;
        _profileClient = profileClient;
        _altinnPartyClient = altinnPartyClient;
        _authorizationClient = authorizationClient;
        _appConfigurationCache = appConfigurationCache;
        _runtimeEnvironment = runtimeEnvironment;
    }

    // Currently we're coupling this to the HTTP context directly.
    // In the future we might want to run work (e.g. service tasks) in the background,
    // at which point we won't always have a HTTP context available.
    // At that point we probably want to implement something like an `IExecutionContext`, `IExecutionContextAccessor`
    // to decouple ourselves from the ASP.NET request context.
    // TODO: consider removing dependcy on HTTP context
    private HttpContext _httpContext =>
        _httpContextAccessor.HttpContext ?? throw new AuthenticationContextException("No HTTP context available");

    public Authenticated Current
    {
        get
        {
            var httpContext = _httpContext;

            Authenticated authInfo;
            if (!httpContext.Items.TryGetValue(ItemsKey, out var authInfoObj))
            {
                var appSettings = _appSettings.CurrentValue;
                var generalSettings = _generalSettings.CurrentValue;
                var token = JwtTokenUtil.GetTokenFromContext(httpContext, appSettings.RuntimeCookieName);
                bool isNewLocaltestToken = false;
                JwtSecurityToken? parsedToken = null;
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var handler = new JwtSecurityTokenHandler();
                    parsedToken = handler.ReadJwtToken(token);
                    // Only the new (more correctly formed) localtest tokens has this claim
                    // In these casees we don't have to special case token parsing as they
                    // now look like the ones that come from real environments/altinn-authentication
                    isNewLocaltestToken =
                        parsedToken.Payload.TryGetValue("actual_iss", out var actualIss) && actualIss is "localtest";
                }

                // Workflow-engine callbacks authenticate via their own scheme. Their principal carries no Altinn
                // user/org claims, so it maps to a dedicated Authenticated.App rather than being run through the
                // user/org token classification (which the legacy localtest parser would even throw on). The app
                // identity comes from the running app's metadata; the targeted instance (when the callback is
                // instance-scoped) is taken from the route, whose instance guid the callback auth handler has
                // already validated against the token.
                var isWorkflowCallback = string.Equals(
                    httpContext.User?.Identity?.AuthenticationType,
                    WorkflowCallbackAuthentication.Scheme,
                    StringComparison.Ordinal
                );

                if (isWorkflowCallback)
                {
                    var appMetadata = _appConfigurationCache.ApplicationMetadata;
                    // The route is the authority for the app identity (it is what the request targeted and what
                    // routing matched); fall back to the running app's metadata only if the route omits it.
                    var appId = ResolveCallbackApp(httpContext) ?? appMetadata.AppIdentifier;
                    authInfo = Authenticated.FromApp(
                        tokenStr: token,
                        parsedToken,
                        appId,
                        ResolveCallbackInstance(httpContext),
                        appMetadata
                    );
                }
                else
                {
                    var isLocaltest = _runtimeEnvironment.IsLocaltestPlatform() && !generalSettings.IsTest;
                    if (isLocaltest && !isNewLocaltestToken)
                    {
                        authInfo = Authenticated.FromOldLocalTest(
                            tokenStr: token,
                            parsedToken,
                            isAuthenticated: !string.IsNullOrWhiteSpace(token),
                            _appConfigurationCache.ApplicationMetadata,
                            () => _httpContext.Request.Cookies[_generalSettings.CurrentValue.GetAltinnPartyCookieName],
                            (int userId) => _profileClient.GetUserProfile(userId),
                            (int partyId) => _altinnPartyClient.GetParty(partyId),
                            (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
                            (int userId) => _authorizationClient.GetPartyList(userId),
                            (int userId, int partyId) => _authorizationClient.ValidateSelectedParty(userId, partyId)
                        );
                    }
                    else
                    {
                        var isAuthenticated = httpContext.User?.Identity?.IsAuthenticated ?? false;
                        authInfo = Authenticated.From(
                            tokenStr: token,
                            parsedToken,
                            isAuthenticated: isAuthenticated,
                            _appConfigurationCache.ApplicationMetadata,
                            () => _httpContext.Request.Cookies[_generalSettings.CurrentValue.GetAltinnPartyCookieName],
                            (int userId) => _profileClient.GetUserProfile(userId),
                            (int partyId) => _altinnPartyClient.GetParty(partyId),
                            (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
                            (int userId) => _authorizationClient.GetPartyList(userId),
                            (int userId, int partyId) => _authorizationClient.ValidateSelectedParty(userId, partyId)
                        );
                    }
                }

                httpContext.Items[ItemsKey] = authInfo;
            }
            else
            {
                authInfo =
                    authInfoObj as Authenticated
                    ?? throw new AuthenticationContextException(
                        "Unexpected type for authentication info in HTTP context"
                    );
            }
            return authInfo;
        }
    }

    /// <summary>
    /// Resolves the app a workflow-engine callback targets from the route values (<c>{org}/{app}</c>).
    /// Returns <c>null</c> when the route does not carry both values.
    /// </summary>
    private static AppIdentifier? ResolveCallbackApp(HttpContext httpContext)
    {
        var routeValues = httpContext.Request.RouteValues;
        if (
            routeValues.TryGetValue("org", out var orgValue)
            && orgValue?.ToString() is { Length: > 0 } org
            && routeValues.TryGetValue("app", out var appValue)
            && appValue?.ToString() is { Length: > 0 } app
        )
        {
            return new AppIdentifier(org, app);
        }

        return null;
    }

    /// <summary>
    /// Resolves the instance a workflow-engine callback targets from the route values
    /// (<c>{instanceOwnerPartyId}/{instanceGuid}</c>). Returns <c>null</c> when the callback is not
    /// instance-scoped or the route does not carry a valid instance identifier.
    /// </summary>
    private static InstanceIdentifier? ResolveCallbackInstance(HttpContext httpContext)
    {
        var routeValues = httpContext.Request.RouteValues;
        if (
            routeValues.TryGetValue("instanceOwnerPartyId", out var partyValue)
            && int.TryParse(partyValue?.ToString(), out var instanceOwnerPartyId)
            && routeValues.TryGetValue("instanceGuid", out var guidValue)
            && Guid.TryParse(guidValue?.ToString(), out var instanceGuid)
        )
        {
            return new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);
        }

        return null;
    }
}
