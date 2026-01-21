#nullable enable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[AllowAnonymous]
[Route("designer/api/v1/studioctl")]
public class StudioctlController : ControllerBase
{
    private const string ScriptContentType = "text/plain; charset=utf-8";
    private readonly IStudioctlInstallScriptService _installScriptService;

    public StudioctlController(IStudioctlInstallScriptService installScriptService)
    {
        _installScriptService = installScriptService;
    }

    [HttpGet("install.sh")]
    public Task<IActionResult> GetInstallSh(CancellationToken cancellationToken)
        => GetScriptAsync(StudioctlInstallScriptType.Bash, cancellationToken);

    [HttpGet("install.ps1")]
    public Task<IActionResult> GetInstallPs1(CancellationToken cancellationToken)
        => GetScriptAsync(StudioctlInstallScriptType.PowerShell, cancellationToken);

    private async Task<IActionResult> GetScriptAsync(
        StudioctlInstallScriptType scriptType,
        CancellationToken cancellationToken)
    {
        StudioctlInstallScriptResult result =
            await _installScriptService.GetInstallScriptAsync(scriptType, cancellationToken);

        return result.Status switch
        {
            StudioctlInstallScriptStatus.Ok => CreateFileResult(result),
            StudioctlInstallScriptStatus.NotFound => NotFound(),
            _ => StatusCode(StatusCodes.Status503ServiceUnavailable)
        };
    }

    private IActionResult CreateFileResult(StudioctlInstallScriptResult result)
    {
        return File(result.Content, ScriptContentType, result.FileName);
    }
}
