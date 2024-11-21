using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;


namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[FeatureGate(StudioFeatureFlags.AnsattPorten)]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/app-scopes")]
public class AppScopesController(IMaskinPortenHttpClient maskinPortenHttpClient,
    IAppScopesService appScopesService) : ControllerBase
{
    [Authorize(AnsattPortenConstants.AnsattportenAuthorizationPolicy)]
    [HttpGet("maskinporten")]
    public async Task<IActionResult> GetScopesFromMaskinPorten(string org, string app, CancellationToken cancellationToken)
    {
        var scopes = await maskinPortenHttpClient.GetAvailableScopes(cancellationToken);

        var response = new AppScopesResponse()
        {
            Scopes = scopes.Select(x => new MaskinPortenScopeDto()
            {
                Scope = x.Scope,
                Description = x.Description
            }).ToHashSet()
        };

        return Ok(response);
    }

    [Authorize]
    [HttpPut]
    public async Task UpsertAppScopes(string org, string app, [FromBody] AppScopesUpsertRequest appScopesUpsertRequest,
        CancellationToken cancellationToken)
    {
        var scopes = appScopesUpsertRequest.Scopes.Select(x => new MaskinPortenScopeEntity()
        {
            Scope = x.Scope,
            Description = x.Description
        }).ToHashSet();

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await appScopesService.UpsertScopesAsync(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), scopes, cancellationToken);
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetAppScopes(string org, string app, CancellationToken cancellationToken)
    {
        var appScopes = await appScopesService.GetAppScopesAsync(AltinnRepoContext.FromOrgRepo(org, app), cancellationToken);

        var reponse = new AppScopesResponse()
        {
            Scopes = appScopes?.Scopes.Select(x => new MaskinPortenScopeDto()
            {
                Scope = x.Scope,
                Description = x.Description
            }).ToHashSet() ?? []
        };

        return Ok(reponse);
    }
}
