using Altinn.App.Core.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller that exposes profile
/// </summary>
[Authorize]
[Route("{org}/{app}/api/v1/profile")]
[ApiController]
public class ProfileController : Controller
{
    private readonly IAuthenticationContext _authenticationContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProfileController"/> class
    /// </summary>
    public ProfileController(IAuthenticationContext authenticationContext)
    {
        _authenticationContext = authenticationContext;
    }

    /// <summary>
    /// Method that returns the user information about the user that is logged in
    /// </summary>
    [Authorize]
    [HttpGet("user")]
    public async Task<ActionResult> GetUser()
    {
        var context = _authenticationContext.Current;
        switch (context)
        {
            case Authenticated.User user:
            {
                var details = await user.LoadDetails(validateSelectedParty: false);
                return Ok(details.Profile);
            }
            case Authenticated.SelfIdentifiedUser selfIdentifiedUser:
            {
                var details = await selfIdentifiedUser.LoadDetails();
                return Ok(details.Profile);
            }
            default:
                return BadRequest($"Unknown authentication context: {context.GetType().Name}");
        }
    }
}
