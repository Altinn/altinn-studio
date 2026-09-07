using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto.AppUpgrade;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Upgrades an app to the next major version of the Altinn app libraries.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{repo:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/upgrade")]
public class AppUpgradeController : ControllerBase
{
    private readonly IAppUpgradeService _appUpgradeService;

    public AppUpgradeController(IAppUpgradeService appUpgradeService)
    {
        _appUpgradeService = appUpgradeService;
    }

    [HttpGet("status")]
    public async Task<ActionResult<AppUpgradeStatus>> GetStatus(
        string org,
        string repo,
        CancellationToken cancellationToken
    )
    {
        AppUpgradeStatus status = await _appUpgradeService.GetStatusAsync(
            AltinnRepoContext.FromOrgRepo(org, repo),
            cancellationToken
        );
        return Ok(status);
    }

    [HttpPost("prepare")]
    public async Task<ActionResult<AppUpgradePreparation>> Prepare(
        string org,
        string repo,
        CancellationToken cancellationToken
    )
    {
        AltinnAuthenticatedRepoEditingContext authenticatedContext = await CreateAuthenticatedContext(org, repo);
        AppUpgradePreparation preparation = await _appUpgradeService.PrepareAsync(
            authenticatedContext,
            cancellationToken
        );
        return Ok(preparation);
    }

    [HttpPost]
    public async Task<ActionResult<AppUpgradeResult>> Run(string org, string repo, CancellationToken cancellationToken)
    {
        AltinnAuthenticatedRepoEditingContext authenticatedContext = await CreateAuthenticatedContext(org, repo);
        AppUpgradeResult result = await _appUpgradeService.RunAsync(authenticatedContext, cancellationToken);
        return Ok(result);
    }

    [HttpPost("merge")]
    public async Task<ActionResult<AppUpgradeMergeResult>> Merge(
        string org,
        string repo,
        [FromBody] AppUpgradeMergeRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnAuthenticatedRepoEditingContext authenticatedContext = await CreateAuthenticatedContext(org, repo);
        AppUpgradeMergeResult result = await _appUpgradeService.MergeAsync(
            authenticatedContext,
            request,
            cancellationToken
        );
        return Ok(result);
    }

    private async Task<AltinnAuthenticatedRepoEditingContext> CreateAuthenticatedContext(string org, string repo)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        return AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repo, developer, token);
    }
}
