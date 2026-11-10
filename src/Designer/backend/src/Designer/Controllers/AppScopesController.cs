using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/app-scopes")]
public class AppScopesController(
    IMaskinPortenHttpClient maskinPortenHttpClient,
    IAppScopesService appScopesService,
    IEnvironmentsService environmentsService
) : ControllerBase
{
    [Authorize(StudioOidcConstants.OrgAccessAuthorizationPolicy)]
    [HttpGet("maskinporten")]
    public async Task<IActionResult> GetScopesFromMaskinPorten(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        var scopes = await maskinPortenHttpClient.GetAvailableScopes(cancellationToken);

        var response = new AppScopesResponse()
        {
            Scopes = scopes
                .Select(x => new MaskinPortenScopeDto() { Scope = x.Scope, Description = x.Description })
                .ToHashSet(),
        };

        return Ok(response);
    }

    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    [Authorize(StudioOidcConstants.OrgAccessAuthorizationPolicy)]
    [HttpPut]
    public async Task<IActionResult> UpsertAppScopes(
        string org,
        string app,
        [FromBody] AppScopesUpsertRequest appScopesUpsertRequest,
        CancellationToken cancellationToken
    )
    {
        if (!await environmentsService.IsAltinnOrg(org, cancellationToken))
        {
            return BadRequest(CreateAppScopesNotSupportedProblemDetails(org));
        }

        var scopes = appScopesUpsertRequest
            .Scopes.Select(x => new MaskinPortenScopeEntity() { Scope = x.Scope, Description = x.Description })
            .ToHashSet();

        var currentAppScopes = await appScopesService.GetAppScopesAsync(
            AltinnRepoContext.FromOrgRepo(org, app),
            cancellationToken
        );
        var unavailableScopeNames = await GetUnavailableScopeNames(scopes, currentAppScopes, cancellationToken);
        if (unavailableScopeNames.Count > 0)
        {
            return BadRequest(CreateScopesNotAvailableProblemDetails(unavailableScopeNames));
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await appScopesService.UpsertScopesAsync(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer),
            scopes,
            cancellationToken
        );

        return Ok();
    }

    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    [HttpGet]
    public async Task<IActionResult> GetAppScopes(string org, string app, CancellationToken cancellationToken)
    {
        if (!await environmentsService.IsAltinnOrg(org, cancellationToken))
        {
            return BadRequest(CreateAppScopesNotSupportedProblemDetails(org));
        }

        var appScopes = await appScopesService.GetAppScopesAsync(
            AltinnRepoContext.FromOrgRepo(org, app),
            cancellationToken
        );

        var response = new AppScopesResponse()
        {
            Scopes =
                appScopes
                    ?.Scopes.Select(x => new MaskinPortenScopeDto() { Scope = x.Scope, Description = x.Description })
                    .ToHashSet()
                ?? [],
        };

        return Ok(response);
    }

    // Already selected scopes are accepted so that scopes no longer offered by Maskinporten
    // do not block other changes to the app's selection.
    private async Task<IReadOnlyList<string>> GetUnavailableScopeNames(
        ISet<MaskinPortenScopeEntity> requestedScopes,
        AppScopesEntity? currentAppScopes,
        CancellationToken cancellationToken
    )
    {
        var acceptedScopeNames = DefaultMaskinportenScopes
            .ScopeNames.Concat(currentAppScopes?.Scopes.Select(x => x.Scope) ?? [])
            .ToHashSet(StringComparer.Ordinal);
        var scopeNamesToVerify = requestedScopes
            .Select(x => x.Scope)
            .Where(scopeName => !acceptedScopeNames.Contains(scopeName))
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (scopeNamesToVerify.Count == 0)
        {
            return [];
        }

        var availableScopes = await maskinPortenHttpClient.GetAvailableScopes(cancellationToken);
        var availableScopeNames = availableScopes.Select(x => x.Scope).ToHashSet(StringComparer.Ordinal);
        return scopeNamesToVerify.Where(scopeName => !availableScopeNames.Contains(scopeName)).ToList();
    }

    private static ProblemDetails CreateScopesNotAvailableProblemDetails(IEnumerable<string> unavailableScopeNames) =>
        new()
        {
            Title = AppScopesErrorMessages.ScopesNotAvailableTitle,
            Detail = AppScopesErrorMessages.ScopesNotAvailableDetail(unavailableScopeNames),
            Status = StatusCodes.Status400BadRequest,
        };

    private static ProblemDetails CreateAppScopesNotSupportedProblemDetails(string org) =>
        new()
        {
            Title = AppScopesErrorMessages.NotSupportedTitle,
            Detail = AppScopesErrorMessages.NotSupportedDetail(org),
            Status = StatusCodes.Status400BadRequest,
        };
}
