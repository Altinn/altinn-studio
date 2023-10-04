using System;
using System.IO;
using System.Net.Mime;
using System.Text;
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
        public async Task<FileStreamResult> GetProcessDefinition(string org, string repo, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            Stream processDefinitionStream = await _processModelingService.GetProcessDefinition(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer), cancellationToken);

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
            await _processModelingService.SaveProcessDefinition(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer), Request.Body, cancellationToken);
            return Ok();
        }

        [HttpGet("templates")]
        public async Task<string> GetTemplates(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            // return await _appDevelopmentService.GetTemplates(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, developer));
            return null;
        }
    }
}
