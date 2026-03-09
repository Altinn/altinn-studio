using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[FeatureGate(StudioFeatureFlags.StudioOidc)]
[Route("designer/api/v1/studio-oidc")]
[ApiController]
public class StudioOidcController(
    IStudioOidcUsernameProvider usernameProvider,
    DeveloperMappingSettings mappingSettings,
    IGiteaClient giteaClient
) : ControllerBase
{
    [Authorize]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery(Name = "redirect_to")] string redirectTo)
    {
        if (!Url.IsLocalUrl(redirectTo))
        {
            return Forbid();
        }

        string? pid = User.FindFirst("pid")?.Value;
        string? sub = User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(sub) || string.IsNullOrEmpty(pid))
        {
            return Unauthorized();
        }

        string? givenName = User.FindFirst("given_name")?.Value;
        string? familyName = User.FindFirst("family_name")?.Value;
        PidHash pidHash = PidHash.FromPid(pid, mappingSettings);
        string computedUsername = await usernameProvider.ResolveUsernameAsync(sub, pidHash, givenName, familyName);

        AuthenticateResult authenticateResult = await HttpContext.AuthenticateAsync();
        AuthenticationProperties? properties = authenticateResult.Properties;

        var claims = new List<Claim> { new(ClaimTypes.Name, computedUsername) };

        if (pid != null)
        {
            claims.Add(new Claim("pid", pid));
        }

        if (sub != null)
        {
            claims.Add(new Claim("sub", sub));
        }

        if (givenName != null)
        {
            claims.Add(new Claim("given_name", givenName));
        }

        if (familyName != null)
        {
            claims.Add(new Claim("family_name", familyName));
        }

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, properties);

        string afterCallbackUrl = Url.Action(nameof(AfterCallback), new { redirect_to = redirectTo })!;
        return LocalRedirect(afterCallbackUrl);
    }

    [Authorize]
    [HttpGet("after-callback")]
    public async Task<IActionResult> AfterCallback([FromQuery(Name = "redirect_to")] string redirectTo)
    {
        if (!Url.IsLocalUrl(redirectTo))
        {
            return Forbid();
        }

        // Ensures user generation in Gitea via reverse proxy auto-registration.
        // DeveloperContextMiddleware has set the context at this point, so the Gitea API call
        // includes X-WEBAUTH-USER header which triggers Gitea to create the user if it doesn't exist.
        await giteaClient.GetCurrentUser();

        return LocalRedirect(redirectTo);
    }

    [Authorize]
    [HttpGet("userinfo")]
    public UserInfoResponse UserInfo()
    {
        return new UserInfoResponse(
            User.Identity?.Name,
            User.FindFirst("given_name")?.Value,
            User.FindFirst("family_name")?.Value
        );
    }
}
