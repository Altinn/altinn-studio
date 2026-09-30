using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[Route("designer/api/v1/studio-oidc")]
[ApiController]
public class StudioOidcController : ControllerBase
{
    [AllowApiKey]
    [AllowAnonymous]
    [HttpGet("userinfo")]
    [ProducesResponseType<UserInfoResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<UserInfoResponse> UserInfo()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return NoContent();
        }

        if (string.IsNullOrWhiteSpace(User.Identity.Name))
        {
            return Problem("Authenticated identity has no username.");
        }

        return Ok(
            new UserInfoResponse(
                User.Identity.Name,
                User.FindFirst("given_name")?.Value,
                User.FindFirst("family_name")?.Value,
                User.Identity.AuthenticationType
            )
        );
    }
}
