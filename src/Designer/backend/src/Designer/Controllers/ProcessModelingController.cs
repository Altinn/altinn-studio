#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Mime;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using JetBrains.Annotations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
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
        private readonly IMediator _mediator;

        public ProcessModelingController(IProcessModelingService processModelingService, IMediator mediator)
        {
            _processModelingService = processModelingService;
            _mediator = mediator;
        }

        [HttpGet("process-definition")]
        public FileStreamResult GetProcessDefinition(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            Stream processDefinitionStream =
                _processModelingService.GetProcessDefinitionStream(
                    AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer));

            return new FileStreamResult(processDefinitionStream, MediaTypeNames.Text.Plain);
        }

        [HttpPut("process-definition")]
        public async Task<IActionResult> UpsertProcessDefinitionAndNotify(string org, string repo,
            [FromForm] IFormFile content, [FromForm] string metadata, CancellationToken cancellationToken)
        {
            Request.EnableBuffering();

            var metadataObject = metadata is not null
                ? JsonSerializer.Deserialize<ProcessDefinitionMetadata>(metadata,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                : null;

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);

            await using Stream stream = content.OpenReadStream();
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
                        EditingContext = editingContext
                    }, cancellationToken);
            }

            return Accepted();
        }

        [HttpPut("data-types")]
        public async Task<IActionResult> ProcessDataTypesChangedNotify(string org, string repo,
            [FromBody] DataTypesChange dataTypesChange, CancellationToken cancellationToken)
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
                        EditingContext = editingContext
                    }, cancellationToken);
            }

            return Accepted();
        }

        [HttpPost("data-type/{dataTypeId}")]
        public async Task<ActionResult> AddDataTypeToApplicationMetadata(string org, string repo,
            [FromRoute] string dataTypeId, [FromQuery] string taskId,
            CancellationToken cancellationToken,
            [FromBody][CanBeNull] List<string> allowedContributers)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
            await _processModelingService.AddDataTypeToApplicationMetadataAsync(editingContext, dataTypeId, taskId,
                allowedContributers, cancellationToken);
            return Ok();
        }

        [HttpDelete("data-type/{dataTypeId}")]
        public async Task<ActionResult> DeleteDataTypeFromApplicationMetadata(string org, string repo,
            [FromRoute] string dataTypeId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
            await _processModelingService.DeleteDataTypeFromApplicationMetadataAsync(editingContext, dataTypeId,
                cancellationToken);
            return Ok();
        }

        [HttpGet("task-type/{layoutSetId}")]
        public async Task<string> GetTaskTypeFromProcessDefinition(string org, string repo, string layoutSetId)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
            string taskType =
                await _processModelingService.GetTaskTypeFromProcessDefinition(editingContext, layoutSetId);
            return taskType;
        }
    }
}
