using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[FeatureGate(StudioFeatureFlags.StudioOidc)]
[Route("/designer/api/v1/user/api-keys")]
public class ApiKeysController(IApiKeyService apiKeyService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CreateApiKeyResponse>> Create(
        [FromBody] CreateApiKeyRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var (rawKey, apiKey) = await apiKeyService.CreateAsync(
            username,
            request.Name,
            ApiKeyType.User,
            request.ExpiresAt,
            cancellationToken
        );

        return Created(string.Empty, new CreateApiKeyResponse(apiKey.Id, rawKey, apiKey.Name, apiKey.ExpiresAt));
    }

    [HttpGet]
    public async Task<ActionResult<List<ApiKeyResponse>>> List(CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var apiKeys = await apiKeyService.ListAsync(username, ApiKeyType.User, cancellationToken);

        var response = apiKeys.Select(k => new ApiKeyResponse(k.Id, k.Name, k.ExpiresAt, k.CreatedAt)).ToList();

        return Ok(response);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Revoke(long id, CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await apiKeyService.RevokeAsync(id, username, cancellationToken);
        return NoContent();
    }
}
