using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.ProcessEditing;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Reads and saves the versioned process state of a v9 app.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[ProcessEditingExceptionFilter]
[Route(
    "designer/api/{org}/{repo:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/process-modelling/process-state"
)]
public sealed class ProcessEditingController(
    IProcessEditingService processEditingService,
    IAppVersionService appVersionService
) : ControllerBase
{
    private const string V9AppRequiredMessage = "This operation requires a v9 app.";

    [HttpGet]
    [UseSystemTextJson]
    public ActionResult<ProcessState> GetState(string org, string repo)
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, repo);
        if (!appVersionService.IsV9App(editingContext))
        {
            return new ContentResult { StatusCode = StatusCodes.Status400BadRequest, Content = V9AppRequiredMessage };
        }

        return processEditingService.GetState(editingContext);
    }

    [HttpPut]
    [UseSystemTextJson]
    public async Task<ActionResult<ProcessState>> SaveState(
        string org,
        string repo,
        [FromBody] ProcessEditRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, repo);
        if (!appVersionService.IsV9App(editingContext))
        {
            return new ContentResult { StatusCode = StatusCodes.Status400BadRequest, Content = V9AppRequiredMessage };
        }

        return await processEditingService.Save(editingContext, request, cancellationToken);
    }

    private AltinnRepoEditingContext CreateContext(string org, string repo) =>
        AltinnRepoEditingContext.FromOrgRepoDeveloper(
            org,
            repo,
            AuthenticationHelper.GetDeveloperUserName(HttpContext)
        );
}
