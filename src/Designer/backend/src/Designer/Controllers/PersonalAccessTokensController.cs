using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("/designer/api/user/personal-access-tokens")]
public class PersonalAccessTokensController(IPersonalAccessTokenService personalAccessTokenService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CreatePersonalAccessTokenResponse>> Create(
        [FromBody] CreatePersonalAccessTokenRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        // TODO: resolve UserAccountId from username
        return StatusCode(501, "UserAccount resolution not yet implemented");
    }

    [HttpGet]
    public async Task<ActionResult<List<PersonalAccessTokenResponse>>> List(CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        // TODO: resolve UserAccountId from username, then list with PersonalAccessTokenType.User filter
        return StatusCode(501, "UserAccount resolution not yet implemented");
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Revoke(long id, CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        // TODO: resolve UserAccountId from username
        return StatusCode(501, "UserAccount resolution not yet implemented");
    }
}
