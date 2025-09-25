using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// The helper for user functionality
/// </summary>
[Obsolete("Use Altinn.App.Core.Features.Auth.IAuthenticationContext instead")]
public class UserHelper
{
    private readonly IProfileClient _profileClient;
    private readonly IAltinnPartyClient _altinnPartyClientService;
    private readonly GeneralSettings _settings;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="UserHelper"/> class
    /// </summary>
    /// <param name="profileClient">The ProfileService (defined in Startup.cs)</param>
    /// <param name="altinnPartyClientService">The RegisterService (defined in Startup.cs)</param>
    /// <param name="settings">The general settings</param>
    /// <param name="telemetry">Telemetry</param>
    public UserHelper(
        IProfileClient profileClient,
        IAltinnPartyClient altinnPartyClientService,
        IOptions<GeneralSettings> settings,
        Telemetry? telemetry = null
    )
    {
        _profileClient = profileClient;
        _altinnPartyClientService = altinnPartyClientService;
        _settings = settings.Value;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Returns the user context
    /// </summary>
    /// <param name="context">The HttpContext</param>
    /// <returns>The UserContext</returns>
    public async Task<UserContext> GetUserContext(HttpContext context)
    {
        using var activity = _telemetry?.StartGetUserContextActivity();
        string? partyCookieValue = context.Request.Cookies[_settings.GetAltinnPartyCookieName];
        Dictionary<string, string> tokenClaims = context.User.Claims.ToDictionary(
            x => x.Type,
            y => y.Value,
            StringComparer.Ordinal
        );

        UserContext userContext = new()
        {
            User = context.User,
            UserName = tokenClaims.GetValueOrDefault(AltinnCoreClaimTypes.UserName),
            UserId = tokenClaims.GetValueOrDefault(AltinnCoreClaimTypes.UserId) switch
            {
                { } value => Convert.ToInt32(value, CultureInfo.InvariantCulture),
                _ => default,
            },
            PartyId = tokenClaims.GetValueOrDefault(AltinnCoreClaimTypes.PartyID) switch
            {
                { } value => Convert.ToInt32(value, CultureInfo.InvariantCulture),
                _ => default,
            },
            AuthenticationLevel = tokenClaims.GetValueOrDefault(AltinnCoreClaimTypes.AuthenticationLevel) switch
            {
                { } value => Convert.ToInt32(value, CultureInfo.InvariantCulture),
                _ => default,
            },
        };

        if (userContext.UserId == default)
        {
            throw new Exception("Could not get user profile - could not retrieve user ID from claims");
        }

        UserProfile userProfile =
            await _profileClient.GetUserProfile(userContext.UserId)
            ?? throw new Exception("Could not get user profile while getting user context");

        if (partyCookieValue is not null)
            userContext.PartyId = Convert.ToInt32(partyCookieValue, CultureInfo.InvariantCulture);

        userContext.UserParty = userProfile.Party;

        if (userContext.PartyId == userProfile.PartyId)
            userContext.Party = userProfile.Party;
        else if (userContext.PartyId != default)
            userContext.Party = await _altinnPartyClientService.GetParty(userContext.PartyId);

        if (!string.IsNullOrWhiteSpace(userContext.Party?.SSN))
            userContext.SocialSecurityNumber = userContext.Party.SSN;
        else if (!string.IsNullOrWhiteSpace(userContext.Party?.Person?.SSN))
            userContext.SocialSecurityNumber = userContext.Party.Person.SSN;
        else if (!string.IsNullOrWhiteSpace(userContext.UserParty?.SSN))
            userContext.SocialSecurityNumber = userContext.UserParty.SSN;

        return userContext;
    }
}
