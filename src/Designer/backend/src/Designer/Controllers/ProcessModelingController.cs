using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Mime;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions that concerns app-development
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{repo:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/process-modelling")]
public class ProcessModelingController : ControllerBase
{
    private readonly IProcessModelingService _processModelingService;
    private readonly IUiFoldersService _uiFoldersService;
    private readonly IAppVersionService _appVersionService;
    private readonly IMediator _mediator;

    public ProcessModelingController(
        IProcessModelingService processModelingService,
        IUiFoldersService uiFoldersService,
        IAppVersionService appVersionService,
        IMediator mediator
    )
    {
        _processModelingService = processModelingService;
        _uiFoldersService = uiFoldersService;
        _appVersionService = appVersionService;
        _mediator = mediator;
    }

    [HttpGet("process-definition")]
    public FileStreamResult GetProcessDefinition(string org, string repo)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        Stream processDefinitionStream = _processModelingService.GetProcessDefinitionStream(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer)
        );

        return new FileStreamResult(processDefinitionStream, MediaTypeNames.Text.Plain);
    }

    [HttpGet("fiks-arkiv-routing")]
    public Task<FiksArkivRouting> GetFiksArkivRouting(string org, string repo, CancellationToken cancellationToken)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return _processModelingService.GetFiksArkivRouting(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer),
            cancellationToken
        );
    }

    [HttpPut("process-definition")]
    public async Task<IActionResult> UpsertProcessDefinitionAndNotify(
        string org,
        string repo,
        [FromForm] IFormFile? content,
        [FromForm] string? metadata,
        CancellationToken cancellationToken
    )
    {
        Request.EnableBuffering();

        var metadataObject = metadata is not null
            ? JsonSerializer.Deserialize<ProcessDefinitionMetadata>(
                metadata,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            )
            : null;

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);

        // In a v9 app a task id change renames the task's layout set folder, so the new id must follow the
        // layout set naming policy. Validate before the process definition is written.
        if (metadataObject?.TaskIdChange is not null && _appVersionService.IsV9App(editingContext))
        {
            try
            {
                await _uiFoldersService.ValidateTaskIdChange(
                    editingContext,
                    metadataObject.TaskIdChange.OldId,
                    metadataObject.TaskIdChange.NewId,
                    cancellationToken
                );
            }
            catch (Exception exception) when (exception is InvalidLayoutSetIdException or NonUniqueLayoutSetIdException)
            {
                return BadRequest(exception.Message);
            }
        }

        await using Stream stream = content!.OpenReadStream();
        try
        {
            await _processModelingService.SaveProcessDefinitionAsync(editingContext, stream, cancellationToken);
        }
        catch (ArgumentException)
        {
            return BadRequest("BPMN file is not valid XML");
        }

        if (metadataObject?.TaskIdChange is not null)
        {
            await _mediator.Publish(
                new ProcessTaskIdChangedEvent
                {
                    OldId = metadataObject.TaskIdChange.OldId,
                    NewId = metadataObject.TaskIdChange.NewId,
                    EditingContext = editingContext,
                },
                cancellationToken
            );
        }

        // Published last so that handlers reading the saved process see the other files in their settled state.
        await _mediator.Publish(new ProcessDefinitionSavedEvent { EditingContext = editingContext }, cancellationToken);

        return Accepted();
    }

    [HttpPut("data-types")]
    public async Task<IActionResult> ProcessDataTypesChangedNotify(
        string org,
        string repo,
        [FromBody] DataTypesChange dataTypesChange,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);

        if (dataTypesChange is not null)
        {
            await _mediator.Publish(
                new ProcessDataTypesChangedEvent
                {
                    NewDataTypes = dataTypesChange.NewDataTypes,
                    ConnectedTaskId = dataTypesChange.ConnectedTaskId,
                    EditingContext = editingContext,
                },
                cancellationToken
            );
        }

        return Accepted();
    }

    [HttpPost("data-type/{dataTypeId}")]
    public async Task<ActionResult> AddDataTypeToApplicationMetadata(
        string org,
        string repo,
        [FromRoute] string dataTypeId,
        [FromQuery] string taskId,
        CancellationToken cancellationToken,
        [FromBody] List<string>? allowedContributors,
        [FromQuery] List<string>? allowedContentTypes = null
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
        await _processModelingService.AddDataTypeToApplicationMetadataAsync(
            editingContext,
            dataTypeId,
            taskId,
            allowedContributors,
            allowedContentTypes,
            cancellationToken
        );
        return Ok();
    }

    [HttpDelete("data-type/{dataTypeId}")]
    public async Task<ActionResult> DeleteDataTypeFromApplicationMetadata(
        string org,
        string repo,
        [FromRoute] string dataTypeId,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
        await _processModelingService.DeleteDataTypeFromApplicationMetadataAsync(
            editingContext,
            dataTypeId,
            cancellationToken
        );
        return Ok();
    }

    [HttpGet("task-type/{layoutSetId}")]
    public async Task<string> GetTaskTypeFromProcessDefinition(string org, string repo, string layoutSetId)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
        string taskType = await _processModelingService.GetTaskTypeFromProcessDefinition(editingContext, layoutSetId);
        return taskType;
    }
}
