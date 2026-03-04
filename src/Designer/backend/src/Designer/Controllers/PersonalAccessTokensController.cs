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
[FeatureGate(StudioFeatureFlags.ApiKeyAuth)]
[Route("/designer/api/user/personal-access-tokens")]
public class PersonalAccessTokensController(IPersonalAccessTokenService personalAccessTokenService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CreatePersonalAccessTokenResponse>> Create(
        [FromBody] CreatePersonalAccessTokenRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var (rawKey, model) = await personalAccessTokenService.CreateAsync(
            username,
            request.DisplayName,
            PersonalAccessTokenType.User,
            request.ExpiresAt,
            cancellationToken
        );

        return Created(
            string.Empty,
            new CreatePersonalAccessTokenResponse(model.Id, rawKey, model.DisplayName, model.ExpiresAt)
        );
    }

    [HttpGet]
    public async Task<ActionResult<List<PersonalAccessTokenResponse>>> List(CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var tokens = await personalAccessTokenService.ListAsync(
            username,
            PersonalAccessTokenType.User,
            cancellationToken
        );

        var response = tokens
            .Select(t => new PersonalAccessTokenResponse(t.Id, t.DisplayName, t.ExpiresAt, t.Revoked, t.CreatedAt))
            .ToList();

        return Ok(response);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Revoke(long id, CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await personalAccessTokenService.RevokeAsync(id, username, cancellationToken);
        return NoContent();
    }
}
