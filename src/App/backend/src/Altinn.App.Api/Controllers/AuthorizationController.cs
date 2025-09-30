using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.Auth;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Exposes API endpoints related to authorization
/// </summary>
public class AuthorizationController : Controller
{
    private readonly IAuthorizationClient _authorization;
    private readonly GeneralSettings _settings;
    private readonly IAuthenticationContext _authenticationContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthorizationController"/> class
    /// </summary>
    public AuthorizationController(
        IAuthorizationClient authorization,
        IOptions<GeneralSettings> settings,
        IAuthenticationContext authenticationContext
    )
    {
        _authorization = authorization;
        _settings = settings.Value;
        _authenticationContext = authenticationContext;
    }

    /// <summary>
    /// Gets current party by reading cookie value and validating.
    /// </summary>
    /// <returns>Party id for selected party. If invalid, partyId for logged in user is returned.</returns>
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Party), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [Authorize]
    [HttpGet("{org}/{app}/api/authorization/parties/current")]
    public async Task<ActionResult> GetCurrentParty(bool returnPartyObject = false)
    {
        var context = _authenticationContext.Current;
        switch (context)
        {
            case Authenticated.None:
                return Unauthorized();
            case Authenticated.User user:
            {
                var details = await user.LoadDetails(validateSelectedParty: true);
                if (details.CanRepresent is not bool canRepresent)
                    throw new Exception("Couldn't validate selected party");

                if (canRepresent)
                {
                    if (returnPartyObject)
                    {
                        return Ok(details.SelectedParty);
                    }

                    return Ok(details.SelectedParty.PartyId);
                }

                // Now we know the user can't represent the selected party (reportee)
                // so we will automatically switch to the user's own party (from the profile)
                var reportee = details.Profile.Party;
                if (user.SelectedPartyId != reportee.PartyId)
                {
                    // Setting cookie to partyID of logged in user if it varies from previus value.
                    Response.Cookies.Append(
                        _settings.GetAltinnPartyCookieName,
                        reportee.PartyId.ToString(CultureInfo.InvariantCulture),
                        new CookieOptions { Domain = _settings.HostName }
                    );
                }

                if (returnPartyObject)
                {
                    return Ok(reportee);
                }
                return Ok(reportee.PartyId);
            }
            case Authenticated.Org org:
            {
                var details = await org.LoadDetails();
                if (returnPartyObject)
                {
                    return Ok(details.Party);
                }

                return Ok(details.Party.PartyId);
            }
            case Authenticated.ServiceOwner so:
            {
                var details = await so.LoadDetails();
                if (returnPartyObject)
                {
                    return Ok(details.Party);
                }

                return Ok(details.Party.PartyId);
            }
            case Authenticated.SystemUser su:
            {
                var details = await su.LoadDetails();
                if (returnPartyObject)
                {
                    return Ok(details.Party);
                }

                return Ok(details.Party.PartyId);
            }
            default:
                throw new Exception($"Unknown authentication context: {context.GetType().Name}");
        }
    }

    /// <summary>
    /// Checks if the user can represent the selected party.
    /// </summary>
    /// <param name="userId">The userId</param>
    /// <param name="partyId">The partyId</param>
    /// <returns>Boolean indicating if the selected party is valid.</returns>
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError, "text/plain")]
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ValidateSelectedParty(int userId, int partyId)
    {
        if (partyId == 0 || userId == 0)
        {
            return BadRequest("Both userId and partyId must be provided.");
        }

        bool? result = await _authorization.ValidateSelectedParty(userId, partyId);

        if (result != null)
        {
            return Ok(result);
        }
        else
        {
            return StatusCode(500, $"Something went wrong when trying to validate party {partyId} for user {userId}");
        }
    }
}
