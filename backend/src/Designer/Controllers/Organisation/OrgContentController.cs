using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

/// <summary>
/// Controller for handling general organisation content library operations.
/// </summary>
[ApiController]
[Authorize]
[Route("designer/api/{orgName}")]
public class OrgContentController : ControllerBase
{
    private readonly IOrgContentService _orgContentService;
    private readonly IOrgService _orgService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgContentController"/> class.
    /// </summary>
    /// <param name="orgContentService">The general org library content service</param>
    /// <param name="orgService">The org service</param>
    public OrgContentController(IOrgContentService orgContentService, IOrgService orgService)
    {
        _orgContentService = orgContentService;
        _orgService = orgService;
    }


    /// <summary>
    /// Retrieves a list of available library content from the organisation.
    /// </summary>
    /// <param name="orgName">Unique identifier of the organisation.</param>
    /// <param name="contentType">The type of content to return the names of. Returns all types if not given.</param>
    [HttpGet]
    [Route("content")]
    public async Task<ActionResult<List<LibraryContentReference>>> GetOrgLibraryContentReferences([FromRoute] string orgName, [FromQuery] string contentType)
    {
        if (!await _orgService.IsOrg(orgName))
        {
            HttpContext.Response.Headers["Reason"] = $"{orgName} is not a valid organisation";
            return NoContent();
        }

        var editingContext = CreateAltinnOrgContext(orgName);
        if (!_orgContentService.OrgContentRepoExists(editingContext))
        {
            HttpContext.Response.Headers["Reason"] = $"{orgName}-content repo does not exist";
            return NoContent();
        }

        if (string.IsNullOrEmpty(contentType))
        {
            return await _orgContentService.GetOrgContentReferences(null, orgName);
        }

        bool didParse = Enum.TryParse<LibraryContentType>(contentType, ignoreCase: true, out var parsedContentType);
        if (!didParse)
        {
            return BadRequest($"Invalid content type '{contentType}'.");
        }

        return await _orgContentService.GetOrgContentReferences(parsedContentType, orgName);
    }

    private AltinnOrgContext CreateAltinnOrgContext(string orgName)
    {
        string developerName = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnOrgContext.FromOrg(orgName, developerName);
    }
}
