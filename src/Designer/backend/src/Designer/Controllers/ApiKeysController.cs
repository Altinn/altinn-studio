using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
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

        var (rawKey, model) = await apiKeyService.CreateAsync(
            username,
            request.Name,
            ApiKeyType.User,
            request.ExpiresAt,
            cancellationToken
        );

        return Created(string.Empty, new CreateApiKeyResponse(model.Id, rawKey, model.Name, model.ExpiresAt));
    }

    [HttpGet]
    public async Task<ActionResult<List<ApiKeyResponse>>> List(CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var tokens = await apiKeyService.ListAsync(username, ApiKeyType.User, cancellationToken);

        var response = tokens.Select(t => new ApiKeyResponse(t.Id, t.Name, t.ExpiresAt, t.CreatedAt)).ToList();

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
