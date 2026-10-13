using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[Route("designer/api/v1/orgs/{org}/inactivity-undeploy-settings")]
public class OrgInactivityUndeploySettingsController(IOrgSettingsService orgSettingsService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<InactivityUndeploySettingsResponse>> Get(
        string org,
        CancellationToken cancellationToken
    )
    {
        var settings = await orgSettingsService.GetInactivityUndeploySettingsAsync(org, cancellationToken);
        return Ok(
            new InactivityUndeploySettingsResponse
            {
                UndeployOnInactivity = settings.UndeployOnInactivity,
                InactivityPeriodDays = settings.InactivityPeriodDays,
            }
        );
    }

    [HttpPut]
    [Authorize(Policy = AltinnPolicy.MustBeOrgOwner)]
    public async Task<IActionResult> Upsert(
        string org,
        [FromBody] InactivityUndeploySettingsRequest request,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await orgSettingsService.UpsertInactivityUndeploySettingsAsync(
            AltinnOrgEditingContext.FromOrgDeveloper(org, developer),
            new InactivityUndeploySettings(request.UndeployOnInactivity!.Value, request.InactivityPeriodDays!.Value),
            cancellationToken
        );
        return NoContent();
    }
}
