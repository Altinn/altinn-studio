using System.Collections.Generic;
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
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.FeatureManagement.Mvc;


namespace Altinn.Studio.Designer.Controllers;

[FeatureGate(StudioFeatureFlags.AnsattPorten)]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/maskinporten")]

public class MaskinPortenController(IMaskinPortenHttpClient maskinPortenHttpClient,
    IAppScopesService appScopesService,
    IDistributedCache cache) : ControllerBase
{
    // TODO: Cleanup model and create separation between presentation dto, domain model and external api model
    // Will be done under: https://github.com/Altinn/altinn-studio/issues/12767 and https://github.com/Altinn/altinn-studio/issues/12766
    [Authorize(AnsattPortenConstants.AnsattportenAuthorizationPolicy)]
    [HttpGet("scopes")]
    public async Task<IActionResult> Get(string org, string app, CancellationToken cancellationToken)
    {
        var scopes = await maskinPortenHttpClient.GetAvailableScopes(cancellationToken);

        var reponse = new AppScopesResponse()
        {
            Scopes = scopes.Select(x => new MaskinPortenScopeDto()
            {
                Scope = x.Scope,
                Description = x.Description
            }).ToHashSet()
        };

        return Ok(reponse);
    }


    [Authorize]
    [HttpPut("scopes")]
    public async Task Put(string org, string app, [FromBody] AppScopesRequest appScopesRequest,
        CancellationToken cancellationToken)
    {
        var scopes = appScopesRequest.Scopes.Select(x => new MaskinPortenScopeEntity()
        {
            Scope = x.Scope,
            Description = x.Description
        }).ToHashSet();

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await appScopesService.UpsertScopesAsync(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), scopes, cancellationToken);
    }


    [Authorize]
    [HttpGet("scopes/available")]
    public async Task<IActionResult> GetAvailableScopes(string org, string app, CancellationToken cancellationToken)
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
