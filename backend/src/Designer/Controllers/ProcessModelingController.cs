using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Mime;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
        public ProcessModelingController(IProcessModelingService processModelingService)
        {
            _processModelingService = processModelingService;
        }

        [HttpGet("process-definition")]
        public FileStreamResult GetProcessDefinition(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            Stream processDefinitionStream = _processModelingService.GetProcessDefinitionStream(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer));

            return new FileStreamResult(processDefinitionStream, MediaTypeNames.Text.Plain);
        }

        [HttpPut("process-definition")]
        public async Task<IActionResult> SaveProcessDefinition(string org, string repo, CancellationToken cancellationToken)
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
            await _processModelingService.SaveProcessDefinitionAsync(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer), Request.Body, cancellationToken);
            return Ok();
        }

        [HttpGet("templates/{appVersion}")]
        public IEnumerable<string> GetTemplates(string org, string repo, Version appVersion)
        {
            Guard.AssertArgumentNotNull(appVersion, nameof(appVersion));
            return _processModelingService.GetProcessDefinitionTemplates(appVersion);
        }

        [HttpPost("templates/{appVersion}/{templateName}")]
        public async Task<FileStreamResult> SaveProcessDefinitionFromTemplate(string org, string repo, Version appVersion, string templateName, CancellationToken cancellationToken)
        {
            Guard.AssertArgumentNotNull(appVersion, nameof(appVersion));
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer);
            await _processModelingService.SaveProcessDefinitionFromTemplateAsync(editingContext, templateName, appVersion, cancellationToken);

            Stream processDefinitionStream = _processModelingService.GetProcessDefinitionStream(editingContext);
            return new FileStreamResult(processDefinitionStream, MediaTypeNames.Text.Plain);
        }
    }
}
