using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.CustomTemplate;
using Altinn.Studio.Designer.Models;
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
        public async Task<ActionResult<CustomTemplateList>> GetCustomTemplateList()
        {
            List<CustomTemplateListObject> templates = await _templateService.GetCustomTemplateList();

            return Ok(new CustomTemplateList()
            {
                Templates = templates
            });
        }

        [HttpGet("{owner}/{id}")]
        public async Task<ActionResult<CustomTemplate>> GetCustomTemplateById(string owner, string id)
        {
            try
            {
                CustomTemplate template = await _templateService.GetCustomTemplateById(owner, id);
                return Ok(template);
            }
            catch (CustomTemplateException ex) when (ex.Code == CustomTemplateErrorCode.NotFound)
            {
                return NotFound(new
                {
                    error = ex.Code,
                    message = ex.Message
                });
            }
            catch (CustomTemplateException ex) when (ex.Code == CustomTemplateErrorCode.DeserializationFailed || ex.Code == CustomTemplateErrorCode.ValidationFailed)
            {
                return StatusCode(500, new
                {
                    error = ex.Code,
                    message = ex.Message,
                    detail = ex.Detail
                });
            }
        }
    }
}
