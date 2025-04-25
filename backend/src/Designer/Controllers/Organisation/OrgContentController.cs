using System;
using System.Collections.Generic;
using System.Threading;
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
    /// Returns names of available resources from an organisation, based on the requested type.
    /// </summary>
    /// <param name="orgName">Unique identifier of the organisation.</param>
    /// <param name="contentType">The type of resource to return the names of. For example code lists or text resources. </param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Route("content/{contentType}")]
    public async Task<ActionResult<List<LibraryContentReference>>> GetOrgContentList([FromRoute] string orgName, [FromRoute] string contentType, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await _orgService.IsOrg(orgName))
        {
            HttpContext.Response.Headers["Reason"] = $"{orgName} is not a valid organisation.";
            return NoContent();
        }

        bool didParse = Enum.TryParse<LibraryContentType>(contentType, ignoreCase: true, out var parsedContentType);
        if (!didParse)
        {
            return BadRequest($"Invalid content type '{contentType}'.");
        }

        string developerName = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnOrgContext editingContext = AltinnOrgContext.FromOrg(orgName, developerName);

        return await _orgContentService.GetContentList(parsedContentType, editingContext, cancellationToken);
    }
}
