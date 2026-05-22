using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller for handling layout sets related operations for v9 and newer, such as fetching and saving global settings for validation on navigation and task navigation.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/layout-sets")]
public class LayoutsetsController : Controller
{
    private readonly ILayoutsetsService _layoutsetsService;

    public LayoutsetsController(ILayoutsetsService layoutsetsService)
    {
        _layoutsetsService = layoutsetsService;
    }

    private AltinnRepoEditingContext CreateContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }

    [HttpGet("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetGlobalValidationOnNavigationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        ValidationOnNavigation? config = await _layoutsetsService.GetGlobalValidationOnNavigationSettings(
            editingContext,
            cancellationToken
        );
        return Ok(config);
    }

    [HttpPost("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> SaveGlobalValidationOnNavigationSettings(
        string org,
        string app,
        [FromBody] ValidationOnNavigation config,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        await _layoutsetsService.SaveGlobalValidationOnNavigationSettings(editingContext, config, cancellationToken);
        return Ok();
    }

    [HttpDelete("settings/validation-on-navigation")]
    public async Task<IActionResult> DeleteGlobalValidationOnNavigationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        await _layoutsetsService.SaveGlobalValidationOnNavigationSettings(editingContext, null, cancellationToken);
        return Ok();
    }

    [HttpGet("settings/task-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetGlobalTaskNavigationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<TaskNavigationGroupDto> result = await _layoutsetsService.GetGlobalTaskNavigationSettingsDto(
            editingContext,
            cancellationToken
        );

        return Ok(result);
    }

    [HttpPost("settings/task-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> UpdateGlobalTaskNavigationSettings(
        string org,
        string app,
        [FromBody] IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        try
        {
            AltinnRepoEditingContext editingContext = CreateContext(org, app);
            await _layoutsetsService.UpdateGlobalTaskNavigationSettings(
                editingContext,
                taskNavigationGroupDtoList,
                cancellationToken
            );

            return NoContent();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
    }
}
