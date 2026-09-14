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

    [HttpPost("start")]
    public async Task<ActionResult<AppUpgradeStart>> Start(string org, string repo, CancellationToken cancellationToken)
    {
        AppUpgradeStart start = await _appUpgradeService.StartAsync(
            AltinnRepoContext.FromOrgRepo(org, repo),
            cancellationToken
        );
        return Ok(start);
    }

    [HttpGet("runs/{**branchName}")]
    public async Task<ActionResult<AppUpgradeRun>> GetRun(
        string org,
        string repo,
        string branchName,
        CancellationToken cancellationToken
    )
    {
        AppUpgradeRun run = await _appUpgradeService.GetRunAsync(
            AltinnRepoContext.FromOrgRepo(org, repo),
            branchName,
            cancellationToken
        );
        return Ok(run);
    }

    [HttpPost("merge")]
    public async Task<ActionResult<AppUpgradeMergeResult>> Merge(
        string org,
        string repo,
        [FromBody] AppUpgradeMergeRequest request,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string token = await HttpContext.GetDeveloperAppTokenAsync();
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, repo, developer, token);
        AppUpgradeMergeResult result = await _appUpgradeService.MergeAsync(
            authenticatedContext,
            request,
            cancellationToken
        );
        return Ok(result);
    }
}
