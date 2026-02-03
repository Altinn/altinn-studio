using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the API controller for functionality related to custom application templates.
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
        public async Task<ActionResult<CustomTemplateListDto>> GetCustomTemplateList()
        {
            List<CustomTemplateDto> templates = await _templateService.GetCustomTemplateList();

            return Ok(new CustomTemplateListDto()
            {
                Templates = templates
            });
        }
    }
}
