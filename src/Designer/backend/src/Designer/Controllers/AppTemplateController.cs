using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// API controller for the app scaffolds a new application can be created from.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/apptemplates")]
public class AppTemplateController : ControllerBase
{
    private readonly IAppTemplateCatalog _appTemplateCatalog;

    public AppTemplateController(IAppTemplateCatalog appTemplateCatalog)
    {
        _appTemplateCatalog = appTemplateCatalog;
    }

    [HttpGet]
    public ActionResult<IReadOnlyList<AppTemplate>> GetAppTemplates()
    {
        return Ok(_appTemplateCatalog.GetAppTemplates());
    }
}
