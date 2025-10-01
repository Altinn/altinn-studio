using System.IdentityModel.Tokens.Jwt;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
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

                var isLocaltest = _runtimeEnvironment.IsLocaltestPlatform() && !generalSettings.IsTest;
                if (isLocaltest && !isNewLocaltestToken)
                {
                    authInfo = Authenticated.FromOldLocalTest(
                        tokenStr: token,
                        parsedToken,
                        isAuthenticated: !string.IsNullOrWhiteSpace(token),
                        _appConfigurationCache.ApplicationMetadata,
                        () => _httpContext.Request.Cookies[_generalSettings.CurrentValue.GetAltinnPartyCookieName],
                        _profileClient.GetUserProfile,
                        _altinnPartyClient.GetParty,
                        (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
                        _authorizationClient.GetPartyList,
                        _authorizationClient.ValidateSelectedParty
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
                        _profileClient.GetUserProfile,
                        _altinnPartyClient.GetParty,
                        (string orgNr) => _altinnPartyClient.LookupParty(new PartyLookup { OrgNo = orgNr }),
                        _authorizationClient.GetPartyList,
                        _authorizationClient.ValidateSelectedParty
                    );
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
}
