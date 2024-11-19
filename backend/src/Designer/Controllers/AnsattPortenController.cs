using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[FeatureGate(StudioFeatureFlags.AnsattPorten)]
[Route("designer/api/[controller]")]
[ApiController]
public class AnsattPortenController(IAuthenticationService authService) : ControllerBase
{
    [Authorize(AnsattPortenConstants.AnsattportenAuthorizationPolicy)]
    [HttpGet("login")]
    public async Task<IActionResult> Login([FromQuery(Name = "redirect_to")] string redirectTo)
    {
        await Task.CompletedTask;
        if (!Url.IsLocalUrl(redirectTo))
        {
            return Forbid();
        }

        return LocalRedirect(redirectTo);
    }

    [AllowAnonymous]
    [HttpGet("auth-status")]
    public async Task<IActionResult> AuthStatus()
    {
        var authenticateResult =
            await authService.AuthenticateAsync(HttpContext,
                AnsattPortenConstants.AnsattportenAuthenticationScheme);

        var authStatus = new AuthStatus
        {
            IsLoggedIn = authenticateResult.Succeeded
        };

        return Ok(authStatus);
    }


}
