using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

/// <summary>
/// Controller for handling organisation metadata
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/orgmetadata/{org}")]
public class OrgMetadataController : ControllerBase
{
    private readonly IRepository _repositoryService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgMetadataController"/> class
    /// </summary>
    /// <param name="repositoryService">The repository service</param>
    public OrgMetadataController(IRepository repositoryService)
    {
        _repositoryService = repositoryService;
    }


   [HttpGet]
   [Route("templates")]
   [ProducesResponseType(StatusCodes.Status200OK)]
   [ProducesResponseType(StatusCodes.Status204NoContent)]
   [ProducesResponseType(StatusCodes.Status401Unauthorized)]
   [ProducesResponseType(StatusCodes.Status403Forbidden)]
   public async Task<ActionResult<List<OrgTemplate>>> GetOrgTemplates(string org)
   {
        var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, ".altinnstudio", developer);
       List<OrgTemplate> orgTemplates = await _repositoryService.GetTemplatesForOrg(editingContext);
       if (orgTemplates == null || orgTemplates.Count == 0)
       {
           return NoContent();
       }

       return Ok(orgTemplates);
   }
}
