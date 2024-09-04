using System.Globalization;
using System.Security.Claims;
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

        UserContext userContext = new UserContext() { User = context.User };

        foreach (Claim claim in context.User.Claims)
        {
            if (claim.Type.Equals(AltinnCoreClaimTypes.UserName, StringComparison.Ordinal))
            {
                userContext.UserName = claim.Value;
            }
            else if (claim.Type.Equals(AltinnCoreClaimTypes.UserId, StringComparison.Ordinal))
            {
                userContext.UserId = Convert.ToInt32(claim.Value, CultureInfo.InvariantCulture);
            }
            else if (claim.Type.Equals(AltinnCoreClaimTypes.PartyID, StringComparison.Ordinal))
            {
                userContext.PartyId = Convert.ToInt32(claim.Value, CultureInfo.InvariantCulture);
            }
            else if (claim.Type.Equals(AltinnCoreClaimTypes.AuthenticationLevel, StringComparison.Ordinal))
            {
                userContext.AuthenticationLevel = Convert.ToInt32(claim.Value, CultureInfo.InvariantCulture);
            }
        }

        if (userContext.UserId == default)
        {
            throw new Exception("Could not get user profile - could not retrieve user ID from claims");
        }

        UserProfile userProfile =
            await _profileClient.GetUserProfile(userContext.UserId)
            ?? throw new Exception("Could not get user profile while getting user context");
        userContext.UserParty = userProfile.Party;

        if (context.Request.Cookies[_settings.GetAltinnPartyCookieName] != null)
        {
            userContext.PartyId = Convert.ToInt32(
                context.Request.Cookies[_settings.GetAltinnPartyCookieName],
                CultureInfo.InvariantCulture
            );
        }

        if (userContext.PartyId == userProfile.PartyId)
        {
            userContext.Party = userProfile.Party;
        }
        else
        {
            userContext.Party = await _altinnPartyClientService.GetParty(userContext.PartyId);
        }

        return userContext;
    }
}
