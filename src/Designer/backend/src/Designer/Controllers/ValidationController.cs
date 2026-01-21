using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route(
        "/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/validation"
    )]
    public class ValidationController(
        IAltinnAppServiceResourceService altinnAppServiceResourceService
    ) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult> ValidateAltinnAppResource(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppServiceResource serviceResource =
                await altinnAppServiceResourceService.GenerateServiceResourceFromApp(
                    org,
                    app,
                    developer
                );

            (bool isValid, ValidationProblemDetails? errors) =
                altinnAppServiceResourceService.ValidateAltinnAppServiceResource(serviceResource);

            return Ok(new { errors?.Errors, isValid });
        }
    }
}
