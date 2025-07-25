using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Handles party related operations
/// </summary>
[Authorize]
[ApiController]
public class PartiesController : ControllerBase
{
    private readonly GeneralSettings _settings;
    private readonly IAuthenticationContext _authenticationContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="PartiesController"/> class
    /// </summary>
    public PartiesController(IOptions<GeneralSettings> settings, IAuthenticationContext authenticationContext)
    {
        _settings = settings.Value;
        _authenticationContext = authenticationContext;
    }

    /// <summary>
    /// Gets the list of parties the user can represent
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="allowedToInstantiateFilter">when set to true returns parties that are allowed to instantiate</param>
    /// <returns>parties</returns>
    [ProducesResponseType(typeof(IReadOnlyList<Party>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [Authorize]
    [HttpGet("{org}/{app}/api/v1/parties")]
    public async Task<IActionResult> Get(string org, string app, bool allowedToInstantiateFilter = false)
    {
        var context = _authenticationContext.Current;
        switch (context)
        {
            case Authenticated.None:
                return Unauthorized();
            case Authenticated.User user:
            {
                var details = await user.LoadDetails(validateSelectedParty: false);
                return allowedToInstantiateFilter ? Ok(details.PartiesAllowedToInstantiate) : Ok(details.Parties);
            }
            case Authenticated.Org orgInfo:
            {
                var details = await orgInfo.LoadDetails();
                IReadOnlyList<Party> parties = [details.Party];
                return Ok(parties);
            }
            case Authenticated.ServiceOwner serviceOwner:
            {
                var details = await serviceOwner.LoadDetails();
                IReadOnlyList<Party> parties = [details.Party];
                return Ok(parties);
            }
            case Authenticated.SystemUser su:
            {
                var details = await su.LoadDetails();
                IReadOnlyList<Party> parties = [details.Party];
                return Ok(parties);
            }
            default:
                throw new Exception($"Unexpected authentication context: {context.GetType().Name}");
        }
    }

    /// <summary>
    /// Validates party and profile settings before the end user is allowed to instantiate a new app instance
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="partyId">The selected partyId</param>
    /// <returns>A validation status</returns>
    [ProducesResponseType(typeof(InstantiationValidationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError, "text/plain")]
    [Authorize]
    [Obsolete("Will be removed in the future")]
    [HttpPost("{org}/{app}/api/v1/parties/validateInstantiation")]
    public async Task<IActionResult> ValidateInstantiation(string org, string app, [FromQuery] int partyId)
    {
        var currentAuth = _authenticationContext.Current;
        switch (currentAuth)
        {
            case Authenticated.User auth:
            {
                var details = await auth.LoadDetails(validateSelectedParty: false);
                if (!details.CanRepresentParty(partyId))
                {
                    // The user does not represent the chosen party id, is not allowed to initiate
                    return Ok(
                        new InstantiationValidationResult
                        {
                            Valid = false,
                            Message = "The user does not represent the supplied party",
                            ValidParties = details.PartiesAllowedToInstantiate.ToList(),
                        }
                    );
                }
                if (!details.CanInstantiateAsParty(partyId))
                {
                    // Can represent the party, but the party is not allowed to instantiate in this app
                    return Ok(
                        new InstantiationValidationResult
                        {
                            Valid = false,
                            Message = "The supplied party is not allowed to instantiate the application",
                            ValidParties = details.PartiesAllowedToInstantiate.ToList(),
                        }
                    );
                }

                return Ok(new InstantiationValidationResult { Valid = true });
            }
            case Authenticated.Org auth:
            {
                var details = await auth.LoadDetails();
                if (details.Party.PartyId != partyId)
                {
                    return Ok(
                        new InstantiationValidationResult
                        {
                            Valid = false,
                            Message = "The user does not represent the supplied party",
                            ValidParties = new List<Party> { details.Party },
                        }
                    );
                }
                if (!details.CanInstantiate)
                {
                    return Ok(
                        new InstantiationValidationResult
                        {
                            Valid = false,
                            Message = "The supplied party is not allowed to instantiate the application",
                            ValidParties = new List<Party> { details.Party },
                        }
                    );
                }

                return Ok(new InstantiationValidationResult { Valid = true });
            }
            case Authenticated.ServiceOwner:
            {
                return Ok(new InstantiationValidationResult { Valid = true });
            }
            case Authenticated.SystemUser auth:
            {
                var details = await auth.LoadDetails();
                if (details.Party.PartyId != partyId)
                {
                    return Ok(
                        new InstantiationValidationResult
                        {
                            Valid = false,
                            Message = "The user does not represent the supplied party",
                            ValidParties = new List<Party> { details.Party },
                        }
                    );
                }
                if (!details.CanInstantiate)
                {
                    return Ok(
                        new InstantiationValidationResult
                        {
                            Valid = false,
                            Message = "The supplied party is not allowed to instantiate the application",
                            ValidParties = new List<Party> { details.Party },
                        }
                    );
                }

                return Ok(new InstantiationValidationResult { Valid = true });
            }
            default:
                return StatusCode(500, "Invalid authentication context");
        }
    }

    /// <summary>
    /// Updates the party the user represents
    /// </summary>
    /// <returns>Status code</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/plain")]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError, "text/plain")]
    [Authorize]
    [HttpPut("{org}/{app}/api/v1/parties/{partyId}")]
    public async Task<IActionResult> UpdateSelectedParty(int partyId)
    {
        var currentAuth = _authenticationContext.Current;
        switch (currentAuth)
        {
            case Authenticated.User auth:
            {
                var details = await auth.LoadDetails(validateSelectedParty: false);
                if (!details.CanRepresentParty(partyId))
                    return BadRequest($"User {auth.UserId} cannot represent party {partyId}.");

                Response.Cookies.Append(
                    _settings.GetAltinnPartyCookieName,
                    partyId.ToString(CultureInfo.InvariantCulture),
                    new CookieOptions { Domain = _settings.HostName }
                );

                return Ok("Party successfully updated");
            }
            case Authenticated.Org auth:
            {
                var details = await auth.LoadDetails();
                if (details.Party.PartyId != partyId)
                    return BadRequest($"Org {details.Party.OrgNumber} cannot represent party {partyId}.");

                Response.Cookies.Append(
                    _settings.GetAltinnPartyCookieName,
                    partyId.ToString(CultureInfo.InvariantCulture),
                    new CookieOptions { Domain = _settings.HostName }
                );

                return Ok("Party successfully updated");
            }
            case Authenticated.ServiceOwner auth:
            {
                var details = await auth.LoadDetails();
                if (details.Party.PartyId != partyId)
                    return BadRequest($"Service owner {auth.Name} cannot represent party {partyId}.");

                Response.Cookies.Append(
                    _settings.GetAltinnPartyCookieName,
                    partyId.ToString(CultureInfo.InvariantCulture),
                    new CookieOptions { Domain = _settings.HostName }
                );

                return Ok("Party successfully updated");
            }
            case Authenticated.SystemUser auth:
            {
                var details = await auth.LoadDetails();
                if (details.Party.PartyId != partyId)
                    return BadRequest($"System user {auth.SystemUserId} cannot represent party {partyId}.");

                Response.Cookies.Append(
                    _settings.GetAltinnPartyCookieName,
                    partyId.ToString(CultureInfo.InvariantCulture),
                    new CookieOptions { Domain = _settings.HostName }
                );

                return Ok("Party successfully updated");
            }
            default:
                return StatusCode(500, "Invalid authentication context");
        }
    }
}
