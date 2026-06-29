using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NuGet.Versioning;

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
    private readonly IAppVersionService _appVersionService;
    private readonly IAppDevelopmentService _appDevelopmentService;
    private readonly IPublisher _publisher;

    public UiFoldersController(
        IUiFoldersService uiFoldersService,
        IAppVersionService appVersionService,
        IAppDevelopmentService appDevelopmentService,
        IPublisher publisher
    )
    {
        _uiFoldersService = uiFoldersService;
        _appVersionService = appVersionService;
        _appDevelopmentService = appDevelopmentService;
        _publisher = publisher;
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
        if (!IsV9App(editingContext))
        {
            return Ok(await GetLegacyLayoutSetConfigs(editingContext, cancellationToken));
        }
        IEnumerable<UiFolderLayoutSetDto> layoutSets = await _uiFoldersService.GetLayoutSets(
            editingContext,
            cancellationToken
        );
        return Ok(layoutSets.Select(layoutSet => LayoutSetConfigDto.From(layoutSet)));
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
        LayoutSetConfig layoutSetConfig = layoutSetPayload.LayoutSetConfigDto.ToLayoutSetConfig();
        if (!IsV9App(editingContext))
        {
            await _appDevelopmentService.AddLayoutSet(
                editingContext,
                layoutSetConfig,
                layoutSetPayload.TaskType,
                cancellationToken
            );
            await _publisher.Publish(
                new LayoutSetCreatedEvent { EditingContext = editingContext, LayoutSet = layoutSetConfig },
                cancellationToken
            );
            return Ok(await GetLegacyLayoutSetConfigs(editingContext, cancellationToken));
        }
        IEnumerable<UiFolderLayoutSetDto> layoutSets = await _uiFoldersService.AddLayoutSet(
            editingContext,
            layoutSetConfig,
            layoutSetPayload.TaskType,
            cancellationToken
        );
        return Ok(layoutSets.Select(layoutSet => LayoutSetConfigDto.From(layoutSet)));
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
        if (!IsV9App(editingContext))
        {
            await _appDevelopmentService.UpdateLayoutSetName(
                editingContext,
                layoutSetId,
                newLayoutSetName,
                cancellationToken
            );
            await _publisher.Publish(
                new LayoutSetIdChangedEvent
                {
                    EditingContext = editingContext,
                    LayoutSetName = layoutSetId,
                    NewLayoutSetName = newLayoutSetName,
                },
                cancellationToken
            );
            return Ok(await GetLegacyLayoutSetConfigs(editingContext, cancellationToken));
        }
        IEnumerable<UiFolderLayoutSetDto> layoutSets = await _uiFoldersService.UpdateLayoutSetName(
            editingContext,
            layoutSetId,
            newLayoutSetName,
            cancellationToken
        );
        return Ok(layoutSets.Select(layoutSet => LayoutSetConfigDto.From(layoutSet)));
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
        if (!IsV9App(editingContext))
        {
            await _publisher.Publish(
                new LayoutSetDeletedEvent { EditingContext = editingContext, LayoutSetName = layoutSetId },
                cancellationToken
            );
            await _appDevelopmentService.DeleteLayoutSet(editingContext, layoutSetId, cancellationToken);
            return Ok(await GetLegacyLayoutSetConfigs(editingContext, cancellationToken));
        }
        IEnumerable<UiFolderLayoutSetDto> layoutSets = await _uiFoldersService.DeleteLayoutSet(
            editingContext,
            layoutSetId,
            cancellationToken
        );
        return Ok(layoutSets.Select(layoutSet => LayoutSetConfigDto.From(layoutSet)));
    }

    [HttpGet("layout-sets/extended")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetLayoutSetsExtended(string org, string app, CancellationToken cancellationToken)
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);
        IEnumerable<UiFolderLayoutSetDto> uiFolders = await _uiFoldersService.GetLayoutSetsExtended(
            editingContext,
            cancellationToken
        );
        return Ok(uiFolders);
    }

    [HttpGet("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> GetValidationOnNavigation(
        string org,
        string app,
        [FromQuery] ValidationOnNavigationLevel level,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);

        return level switch
        {
            ValidationOnNavigationLevel.Pages => Ok(
                await _uiFoldersService.GetPagesValidationOnNavigation(editingContext, cancellationToken)
            ),
            ValidationOnNavigationLevel.LayoutSets => Ok(
                await _uiFoldersService.GetLayoutSetsValidationOnNavigation(editingContext, cancellationToken)
            ),
            _ => Ok(await _uiFoldersService.GetGlobalValidationOnNavigation(editingContext, cancellationToken)),
        };
    }

    [HttpPost("settings/validation-on-navigation")]
    [UseSystemTextJson]
    public async Task<IActionResult> SaveValidationOnNavigation(
        string org,
        string app,
        [FromQuery] ValidationOnNavigationLevel level,
        [FromBody] JsonElement config,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = CreateContext(org, app);

        try
        {
            switch (level)
            {
                case ValidationOnNavigationLevel.Pages:
                    await _uiFoldersService.SavePagesValidationOnNavigation(
                        editingContext,
                        config.Deserialize<List<PageValidationOnNavigationDto>>() ?? [],
                        cancellationToken
                    );
                    break;
                case ValidationOnNavigationLevel.LayoutSets:
                    await _uiFoldersService.SaveLayoutSetsValidationOnNavigation(
                        editingContext,
                        config.Deserialize<List<ValidationOnNavigationDto>>() ?? [],
                        cancellationToken
                    );
                    break;
                default:
                    await _uiFoldersService.SaveGlobalValidationOnNavigation(
                        editingContext,
                        config.Deserialize<ValidationOnNavigation>(),
                        cancellationToken
                    );
                    break;
            }
        }
        catch (JsonException)
        {
            return BadRequest("Invalid JSON format for the provided configuration.");
        }
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

    private bool IsV9App(AltinnRepoEditingContext editingContext)
    {
        try
        {
            SemanticVersion version = _appVersionService.GetAppLibVersion(editingContext);
            return version != null && version.Major >= 9;
        }
        catch (FileNotFoundException)
        {
            return true;
        }
    }

    private async Task<IEnumerable<LayoutSetConfigDto>> GetLegacyLayoutSetConfigs(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken
    )
    {
        LayoutSets layoutSets = await _appDevelopmentService.GetLayoutSets(editingContext, cancellationToken);
        return layoutSets.Sets.Select(layoutSet => LayoutSetConfigDto.From(layoutSet));
    }
}
