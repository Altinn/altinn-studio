using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[FeatureGate(StudioFeatureFlags.StudioOidc)]
[Route("designer/api/v1/studioctl/auth")]
public class StudioctlAuthController(StudioctlAuthService studioctlAuthService) : ControllerBase
{
    [Authorize]
    [HttpGet("authorize")]
    public async Task<IActionResult> Authorize(
        [FromQuery(Name = "redirect_uri")] string redirectUri,
        [FromQuery] string state,
        [FromQuery(Name = "code_challenge")] string codeChallenge,
        [FromQuery(Name = "client_name")] string? clientName,
        CancellationToken cancellationToken
    )
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        StudioctlAuthResult<string> result = await studioctlAuthService.CreateAuthorizationRequestAsync(
            username,
            new StudioctlAuthorizeRequest(redirectUri, state, codeChallenge, clientName),
            cancellationToken
        );

        return result.Status == StudioctlAuthStatus.Success ? Redirect(result.Value!) : ToStatusCodeResult(result);
    }

    [Authorize]
    [HttpGet("requests/{id}")]
    public async Task<ActionResult<StudioctlAuthRequestResponse>> GetRequest(
        string id,
        CancellationToken cancellationToken
    )
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        StudioctlAuthResult<StudioctlAuthRequestResponse> result = await studioctlAuthService.GetRequestAsync(
            id,
            username,
            cancellationToken
        );
        return ToActionResult(result);
    }

    [Authorize]
    [ValidateAntiForgeryToken]
    [HttpPost("requests/{id}/confirm")]
    public async Task<ActionResult<StudioctlAuthCallbackResponse>> ConfirmRequest(
        string id,
        CancellationToken cancellationToken
    )
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        StudioctlAuthResult<StudioctlAuthCallbackResponse> result = await studioctlAuthService.ConfirmRequestAsync(
            id,
            username,
            cancellationToken
        );
        return ToActionResult(result);
    }

    [Authorize]
    [ValidateAntiForgeryToken]
    [HttpPost("requests/{id}/cancel")]
    public async Task<ActionResult<StudioctlAuthCallbackResponse>> CancelRequest(
        string id,
        CancellationToken cancellationToken
    )
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        StudioctlAuthResult<StudioctlAuthCallbackResponse> result = await studioctlAuthService.CancelRequestAsync(
            id,
            username,
            cancellationToken
        );
        return ToActionResult(result);
    }

    [AllowAnonymous]
    [HttpPost("token")]
    public async Task<ActionResult<StudioctlTokenResponse>> Token(
        [FromBody] StudioctlTokenRequest request,
        CancellationToken cancellationToken
    )
    {
        StudioctlAuthResult<StudioctlTokenResponse> result = await studioctlAuthService.ExchangeCodeAsync(
            request,
            cancellationToken
        );
        return ToActionResult(result);
    }

    [Authorize]
    [AllowApiKey]
    [TypeFilter(typeof(ConditionalAntiforgeryFilter))]
    [HttpDelete("api-key/{id:long}")]
    public async Task<IActionResult> RevokeApiKey(long id, CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await studioctlAuthService.RevokeApiKeyAsync(id, username, cancellationToken);
        return NoContent();
    }

    private ActionResult<T> ToActionResult<T>(StudioctlAuthResult<T> result) =>
        result.Status == StudioctlAuthStatus.Success ? result.Value! : ToStatusCodeResult(result);

    private ActionResult ToStatusCodeResult<T>(StudioctlAuthResult<T> result) =>
        result.Status switch
        {
            StudioctlAuthStatus.BadRequest => BadRequest(result.ErrorMessage),
            StudioctlAuthStatus.NotFound => NotFound(),
            StudioctlAuthStatus.Forbidden => Forbid(),
            StudioctlAuthStatus.Unauthorized => Unauthorized(),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
}
