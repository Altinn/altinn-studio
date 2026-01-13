using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to application template manifests.
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/customtemplates")]
    public class CustomTemplateController : ControllerBase
    {
        private readonly ICustomTemplateService _templateService;

        public CustomTemplateController(ICustomTemplateService templateService)
        {
            _templateService = templateService;
        }

        [HttpGet]
        public async Task<ActionResult<List<CustomTemplateListDto>>> GetCustomTemplateList(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            var templates = await _templateService.GetCustomTemplateList(developer, cancellationToken);

            return Ok(new CustomTemplateListDto()
            {
                Templates = [.. templates.Select(t => CustomTemplateDto.From(t))]
            });
        }

        [HttpGet]
        [Route("{owner}/{id}")]
        public async Task<ActionResult<CustomTemplate>> GetCustomTemplate(string owner, string id, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            var template = await _templateService.GetCustomTemplate(developer, owner, id, cancellationToken);
            if (template == null)
            {
                return NotFound();
            }

            return Ok(CustomTemplateDto.From(template));
        }
    }
}
