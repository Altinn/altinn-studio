using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
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

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgContentController"/> class.
    /// </summary>
    /// <param name="orgCodeListService">The code list service</param>
    /// <param name="orgTextsService">The texts service</param>
    public OrgContentController(IOrgCodeListService orgCodeListService, IOrgTextsService orgTextsService)
    {
        _orgCodeListService = orgCodeListService;
        _orgTextsService = orgTextsService;
    }

    /// <summary>
    /// Returns names of available resources from an organisation, based on the requested type.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="contentType">The type of resource to return the names of. For example code lists or text resources. </param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Route("content/{contentType}")]
    public async Task<ActionResult<List<string>>> GetOrgContentIds([FromRoute] LibraryContentType contentType, [FromRoute] string org, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        switch (contentType)
        {
            case LibraryContentType.CodeList:
                List<string> codeListResult = _orgCodeListService.GetCodeListIds(org, developer, cancellationToken);
                return Ok(codeListResult);

            case LibraryContentType.TextResource:
                List<string> textResourceResult = await _orgTextsService.GetTextIds(org, developer, cancellationToken);
                return Ok(textResourceResult);

            default:
                return BadRequest($"Invalid resource type '{contentType}'.");
        }
    }
}
