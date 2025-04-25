using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

[ApiController]
[Authorize]
[Route("designer/api/{orgName}")]
public class OrgResourceController : ControllerBase
{
    private readonly IOrgCodeListService _orgCodeListService;
    private readonly IOrgTextsService _orgTextsService;
    private readonly IOrgService _orgService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgResourceController"/> class.
    /// </summary>
    /// <param name="orgCodeListService">The code list service</param>
    /// <param name="orgTextsService">The texts service</param>
    /// <param name="orgService">The org service</param>
    public OrgResourceController(IOrgCodeListService orgCodeListService, IOrgTextsService orgTextsService, IOrgService orgService)
    {
        _orgCodeListService = orgCodeListService;
        _orgTextsService = orgTextsService;
        _orgService = orgService;
    }

    /// <summary>
    /// Returns names of available resources from an organisation, based on the requested type.
    /// </summary>
    /// <param name="orgName">Unique identifier of the organisation.</param>
    /// <param name="resourceType">The type of resource to return the names of. For example code lists or text resources. </param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Route("resource/{resourceType}")]
    public async Task<ActionResult<List<string>>> GetOrgResourceIds([FromRoute] string orgName, [FromRoute] string resourceType, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await _orgService.IsOrg(orgName))
        {
            HttpContext.Response.Headers["Reason"] = $"{orgName} is not a valid organisation.";
            return NoContent();
        }

        ActionResult badRequestResponse = BadRequest($"Invalid resource type '{resourceType}'.");
        bool didParse = Enum.TryParse<LibraryResourceType>(resourceType, ignoreCase: true, out var parsedResourceType);
        if (!didParse)
        {
            return badRequestResponse;
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        switch (parsedResourceType)
        {
            case LibraryResourceType.CodeList:
                List<string> codeListResult = _orgCodeListService.GetCodeListIds(orgName, developer, cancellationToken);
                return Ok(codeListResult);

            case LibraryResourceType.TextResource:
                List<string> textResourceResult = await _orgTextsService.GetTextIds(orgName, developer, cancellationToken);
                return Ok(textResourceResult);

            default:
                return badRequestResponse;
        }
    }
}
