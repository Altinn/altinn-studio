using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Authorization.Platform.Authorization.Models;
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
    private readonly UserHelper _userHelper;
    private readonly GeneralSettings _settings;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthorizationController"/> class
    /// </summary>
    public AuthorizationController(
        IAuthorizationClient authorization,
        IProfileClient profileClient,
        IAltinnPartyClient altinnPartyClientClient,
        IOptions<GeneralSettings> settings
    )
    {
        _userHelper = new UserHelper(profileClient, altinnPartyClientClient, settings);
        _authorization = authorization;
        _settings = settings.Value;
    }

    /// <summary>
    /// Gets current party by reading cookie value and validating.
    /// </summary>
    /// <returns>Party id for selected party. If invalid, partyId for logged in user is returned.</returns>
    [Authorize]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    [HttpGet("{org}/{app}/api/authorization/parties/current")]
    public async Task<ActionResult> GetCurrentParty(bool returnPartyObject = false)
    {
        (Party? currentParty, _) = await GetCurrentPartyAsync(HttpContext);

        if (returnPartyObject)
        {
            return Ok(currentParty);
        }

        return Ok(currentParty?.PartyId ?? 0);
    }

    /// <summary>
    /// Checks if the user can represent the selected party.
    /// </summary>
    /// <param name="userId">The userId</param>
    /// <param name="partyId">The partyId</param>
    /// <returns>Boolean indicating if the selected party is valid.</returns>
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

    /// <summary>
    /// Fetches roles for current party.
    /// </summary>
    /// <returns>List of roles for the current user and party.</returns>
    // [Authorize]
    // [HttpGet("{org}/{app}/api/authorization/roles")]
    // [ProducesResponseType(typeof(IEnumerable<Role), StatusCodes.Status200OK)]
    // [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [Authorize]
    [HttpGet("{org}/{app}/api/authorization/roles")]
    [ProducesResponseType(typeof(IEnumerable<Role>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRolesForCurrentParty()
    {
        (Party? currentParty, UserContext userContext) = await GetCurrentPartyAsync(HttpContext);

        if (currentParty == null)
        {
            return BadRequest("Both userId and partyId must be provided.");
        }

        int userId = userContext.UserId;
        IEnumerable<Role> roles = await _authorization.GetUserRoles(userId, currentParty.PartyId);

        return Ok(roles);
    }

    /// <summary>
    /// Helper method to retrieve the current party and user context from the HTTP context.
    /// </summary>
    /// <param name="context">The current HttpContext.</param>
    /// <returns>A tuple containing the current party and user context.</returns>
    private async Task<(Party? party, UserContext userContext)> GetCurrentPartyAsync(HttpContext context)
    {
        UserContext userContext = await _userHelper.GetUserContext(context);
        int userId = userContext.UserId;

        // If selected party is different than party for user self need to verify
        if (userContext.UserParty == null || userContext.PartyId != userContext.UserParty.PartyId)
        {
            bool? isValid = await _authorization.ValidateSelectedParty(userId, userContext.PartyId);
            if (isValid != true)
            {
                // Not valid, fall back to userParty if available
                if (userContext.UserParty != null)
                {
                    userContext.Party = userContext.UserParty;
                    userContext.PartyId = userContext.UserParty.PartyId;
                }
                else
                {
                    userContext.Party = null;
                    userContext.PartyId = 0;
                }
            }
        }

        // Sync cookie if needed
        string? cookieValue = Request.Cookies[_settings.GetAltinnPartyCookieName];
        if (!int.TryParse(cookieValue, out int partyIdFromCookie))
        {
            partyIdFromCookie = 0;
        }

        if (partyIdFromCookie != userContext.PartyId)
        {
            Response.Cookies.Append(
                _settings.GetAltinnPartyCookieName,
                userContext.PartyId.ToString(CultureInfo.InvariantCulture),
                new CookieOptions { Domain = _settings.HostName }
            );
        }

        return (userContext.Party, userContext);
    }
}
