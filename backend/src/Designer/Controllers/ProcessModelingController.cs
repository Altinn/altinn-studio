using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
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
        private readonly IAppDevelopmentService _appDevelopmentService;

        public ProcessModelingController(IAppDevelopmentService appDevelopmentService)
        {
            _appDevelopmentService = appDevelopmentService;
        }

        [HttpGet("definition")]
        public Task<string> GetProcessDefinition(string org, string repo)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            return _appDevelopmentService.GetBpmnFile(org, repo, developer);
        }

        [HttpPut("definition")]
        public async Task<IActionResult> SaveProcessDefinition(string org, string repo)
        {
            string bpmnFileContent = await ReadRequestBodyContentAsync();

            if(bpmnFileContent.Length > 100_000) return BadRequest("BPMN file is too large");
            Guard.AssertValidXmlContent(bpmnFileContent);

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            await _appDevelopmentService.SaveBpmnFile(org, repo, developer, bpmnFileContent);
            return Ok();
        }

        private async Task<string> ReadRequestBodyContentAsync()
        {
            using StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8);
            return await reader.ReadToEndAsync();
        }
    }
}
