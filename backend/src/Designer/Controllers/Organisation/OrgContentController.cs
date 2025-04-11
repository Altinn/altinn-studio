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
[Route("designer/api/{org}")]
public class OrgContentController : ControllerBase
{
    private readonly IOrgCodeListService _orgCodeListService;
    private readonly IOrgTextsService _orgTextsService;
    private readonly IOrgService _orgService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgContentController"/> class.
    /// </summary>
    /// <param name="orgCodeListService">The code list service</param>
    /// <param name="orgTextsService">The texts service</param>
    /// <param name="orgService">The org service</param>
    public OrgContentController(IOrgCodeListService orgCodeListService, IOrgTextsService orgTextsService, IOrgService orgService)
    {
        _orgCodeListService = orgCodeListService;
        _orgTextsService = orgTextsService;
        _orgService = orgService;
    }

    /// <summary>
    /// Returns names of available resources from an organisation, based on the requested type.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="contentType">The type of resource to return the names of. For example code lists or text resources. </param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Route("content/{contentType}")]
    public async Task<ActionResult<List<string>>> GetOrgContentIds([FromRoute] string org, [FromRoute] string contentType, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await _orgService.IsOrg(org))
        {
            HttpContext.Response.Headers["Reason"] = $"{org} is not a valid organisation.";
            return NoContent();
        }

        ActionResult badRequestResponse = BadRequest($"Invalid content type '{contentType}'.");
        bool didParse = Enum.TryParse<LibraryContentType>(contentType, ignoreCase: true, out var parsedContentType);
        if (!didParse)
        {
            return badRequestResponse;
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        switch (parsedContentType)
        {
            case LibraryContentType.CodeList:
                List<string> codeListResult = _orgCodeListService.GetCodeListIds(org, developer, cancellationToken);
                return Ok(codeListResult);

            case LibraryContentType.TextResource:
                List<string> textResourceResult = await _orgTextsService.GetTextIds(org, developer, cancellationToken);
                return Ok(textResourceResult);

            default:
                return badRequestResponse;
        }
    }
}
