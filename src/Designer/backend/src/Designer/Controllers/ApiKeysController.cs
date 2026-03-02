using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("/designer/api/user/api-keys")]
public class ApiKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;

    public ApiKeysController(IApiKeyService apiKeyService)
    {
        _apiKeyService = apiKeyService;
    }

    [HttpPost]
    public async Task<ActionResult<CreateApiKeyResponse>> Create(
        [FromBody] CreateApiKeyRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var (rawKey, model) = await _apiKeyService.CreateAsync(
            username,
            request.DisplayName,
            request.ExpiresAt,
            cancellationToken);

        return Created(string.Empty, new CreateApiKeyResponse(
            model.Id,
            rawKey,
            model.DisplayName,
            model.ExpiresAt));
    }

    [HttpGet]
    public async Task<ActionResult<List<ApiKeyResponse>>> List(CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var keys = await _apiKeyService.ListByUsernameAsync(username, cancellationToken);

        var response = keys.Select(k => new ApiKeyResponse(
            k.Id,
            k.DisplayName,
            k.ExpiresAt,
            k.Revoked,
            k.CreatedAt)).ToList();

        return Ok(response);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Revoke(long id, CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await _apiKeyService.RevokeAsync(id, username, cancellationToken);
        return NoContent();
    }
}
