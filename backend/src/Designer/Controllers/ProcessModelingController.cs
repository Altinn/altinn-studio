﻿using System;
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
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions that concerns app-development
    /// </summary>
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
        [Obsolete("This endpoint should be replaced by process-definition-latest, and url fixed after integration with frontend")]
        public async Task<IActionResult> SaveProcessDefinition(string org, string repo,
            CancellationToken cancellationToken)
        {
            Request.EnableBuffering();
            try
            {
                await Guard.AssertValidXmlStreamAndRewindAsync(Request.Body);
            }
            catch (ArgumentException)
            {
                return BadRequest("BPMN file is not valid XML");
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            await _processModelingService.SaveProcessDefinitionAsync(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer), Request.Body, cancellationToken);
            return Ok();
        }

        [HttpPut("process-definition-latest")]
        public async Task<IActionResult> UpsertProcessDefinitionAndNotify(string org, string repo, [FromForm] IFormFile content, [FromForm] string metadata, CancellationToken cancellationToken)
        {
            Request.EnableBuffering();

            var metadataObject = metadata is not null
                ? JsonSerializer.Deserialize<ProcessDefinitionMetadata>(metadata,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                : null;

            Stream stream = content.OpenReadStream();

            try
            {
                await Guard.AssertValidXmlStreamAndRewindAsync(stream);
            }
            catch (ArgumentException)
            {
                return BadRequest("BPMN file is not valid XML");
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
            await _processModelingService.SaveProcessDefinitionAsync(editingContext, stream, cancellationToken);

            if (metadataObject?.TaskIdChange is not null)
            {
                await _mediator.Publish(new ProcessTaskIdChangedEvent
                {
                    OldId = metadataObject.TaskIdChange.OldId,
                    NewId = metadataObject.TaskIdChange.NewId,
                    EditingContext = editingContext
                }, cancellationToken);
            }

            return Accepted();
        }

        [HttpPut("data-type")]
        public async Task<IActionResult> ProcessDataTypeChangedNotify(string org, string repo, [FromBody] DataTypeChange dataTypeChange, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);

            if (dataTypeChange is not null)
            {

                await _mediator.Publish(new ProcessDataTypeChangedEvent
                {
                    NewDataType = dataTypeChange.NewDataType,
                    ConnectedTaskId = dataTypeChange.ConnectedTaskId,
                    EditingContext = editingContext
                }, cancellationToken);
            }

            return Accepted();
        }

        [HttpGet("templates/{appVersion}")]
        public IEnumerable<string> GetTemplates(string org, string repo, SemanticVersion appVersion)
        {
            Guard.AssertArgumentNotNull(appVersion, nameof(appVersion));
            return _processModelingService.GetProcessDefinitionTemplates(appVersion);
        }

        [HttpPut("templates/{appVersion}/{templateName}")]
        public async Task<FileStreamResult> SaveProcessDefinitionFromTemplate(string org, string repo,
            SemanticVersion appVersion, string templateName, CancellationToken cancellationToken)
        {
            Guard.AssertArgumentNotNull(appVersion, nameof(appVersion));
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
            await _processModelingService.SaveProcessDefinitionFromTemplateAsync(editingContext, templateName,
                appVersion, cancellationToken);

            Stream processDefinitionStream = _processModelingService.GetProcessDefinitionStream(editingContext);
            return new FileStreamResult(processDefinitionStream, MediaTypeNames.Text.Plain);
        }
    }
}
