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
/// Controller for handling UI folder related operations for v9 and newer, such as fetching and saving settings for validation on navigation and task navigation.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/ui-folders")]
public class UiFoldersController : Controller
{
    private readonly IUiFoldersService _uiFoldersService;

    public UiFoldersController(IUiFoldersService uiFoldersService)
    {
        _uiFoldersService = uiFoldersService;
    }

    private AltinnRepoEditingContext CreateContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }

    [HttpGet("layout-sets")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetLayoutSets(string org, string app, CancellationToken cancellationToken)
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<LayoutSetDto> layoutSets = await _uiFoldersService.GetLayoutSets(editingContext, cancellationToken);
        return Ok(layoutSets);
    }

    [HttpPost("layout-sets")]
    [UseSystemTextJson]
    public async Task<IActionResult> AddLayoutSet(
        string org,
        string app,
        [FromBody] LayoutSetPayload layoutSetPayload,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<LayoutSetDto> layoutSets = await _uiFoldersService.AddLayoutSet(
            editingContext,
            layoutSetPayload.LayoutSetConfig,
            layoutSetPayload.TaskType,
            cancellationToken
        );
        return Ok(layoutSets);
    }

    [HttpPut("layout-sets/{layoutSetId}")]
    [UseSystemTextJson]
    public async Task<IActionResult> UpdateLayoutSetName(
        string org,
        string app,
        [FromRoute] string layoutSetId,
        [FromBody] string newLayoutSetName,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<LayoutSetDto> layoutSets = await _uiFoldersService.UpdateLayoutSetName(
            editingContext,
            layoutSetId,
            newLayoutSetName,
            cancellationToken
        );
        return Ok(layoutSets);
    }

    [HttpDelete("layout-sets/{layoutSetId}")]
    [UseSystemTextJson]
    public async Task<IActionResult> DeleteLayoutSet(
        string org,
        string app,
        [FromRoute] string layoutSetId,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<LayoutSetDto> layoutSets = await _uiFoldersService.DeleteLayoutSet(
            editingContext,
            layoutSetId,
            cancellationToken
        );
        return Ok(layoutSets);
    }

    [HttpGet("layout-sets/extended")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetLayoutSetsExtended(string org, string app, CancellationToken cancellationToken)
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<LayoutSetDto> uiFolders = await _uiFoldersService.GetLayoutSetsExtended(
            editingContext,
            cancellationToken
        );
        return Ok(uiFolders);
    }

    [HttpGet("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetGlobalValidationOnNavigation(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        ValidationOnNavigation? config = await _uiFoldersService.GetGlobalValidationOnNavigation(
            editingContext,
            cancellationToken
        );
        return Ok(config);
    }

    [HttpPost("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> SaveGlobalValidationOnNavigation(
        string org,
        string app,
        [FromBody] ValidationOnNavigation config,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        await _uiFoldersService.SaveGlobalValidationOnNavigation(editingContext, config, cancellationToken);
        return Ok();
    }

    [HttpDelete("settings/validation-on-navigation")]
    public async Task<IActionResult> DeleteGlobalValidationOnNavigation(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        await _uiFoldersService.SaveGlobalValidationOnNavigation(editingContext, null, cancellationToken);
        return Ok();
    }

    [HttpGet("settings/task-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetGlobalTaskNavigation(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<TaskNavigationGroupDto> result = await _uiFoldersService.GetGlobalTaskNavigationDto(
            editingContext,
            cancellationToken
        );

        return Ok(result);
    }

    [HttpPost("settings/task-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> UpdateGlobalTaskNavigation(
        string org,
        string app,
        [FromBody] IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList,
        CancellationToken cancellationToken
    )
    {
        try
        {
            AltinnRepoEditingContext editingContext = CreateContext(org, app);
            await _uiFoldersService.UpdateGlobalTaskNavigation(
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
