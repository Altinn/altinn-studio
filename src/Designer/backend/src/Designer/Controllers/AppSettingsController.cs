using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[Route("designer/api/v1/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/app-settings")]
public class AppSettingsController(IAppSettingsService appSettingsService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> Get(string org, string app, CancellationToken cancellationToken)
    {
        var setting = await appSettingsService.GetAsync(
            AltinnRepoContext.FromOrgRepo(org, app),
            environment: null,
            cancellationToken
        );

        return Ok(new AppSettingsResponse
        {
            UndeployOnInactivity = setting?.UndeployOnInactivity ?? false
        });
    }

    [HttpPut]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> Upsert(
        string org,
        string app,
        [FromBody] AppSettingsUpsertRequest request,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await appSettingsService.UpsertAsync(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer),
            request.UndeployOnInactivity,
            environment: null,
            cancellationToken
        );
        return NoContent();
    }
}
