using System.Collections.Generic;
using System.Threading;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

[ApiController]
[Authorize]
[Route("designer/api/{org}")]
public class OrgGeneralController : ControllerBase
{
    private readonly IOrgCodeListService _orgCodeListService;
    private readonly IOrgTextsService _orgTextsService;

    /// <summary>
    /// Initializes a new instance of the <see cref="OrgGeneralController"/> class.
    /// </summary>
    /// <param name="orgCodeListService">The code list service</param>
    /// <param name="orgTextsService">The texts service</param>
    public OrgGeneralController(IOrgCodeListService orgCodeListService, IOrgTextsService orgTextsService)
    {
        _orgCodeListService = orgCodeListService;
        _orgTextsService = orgTextsService;
    }

    /// <summary>
    /// Returns available resources from an organisation, based on the requested type.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="resourceType">The type of resource to return the names of. For example code lists or text resources. </param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The JSON config</returns>
    [HttpGet]
    [Route("resources/{resourceType}")]
    public ActionResult<List<string>> GetListOfResources(string resourceType, string org, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (resourceType == "codeList")
        {
            // Replace with call to orgCodeListService
            List<string> result = ["dummyCodeList1", "dummyCodeList2"];
            return Ok(result);
        }

        if (resourceType == "textResource")
        {
            // Replace with call to orgTextsService
            List<string> result = ["dummyTextResource1", "dummyTextResource2"];
            return Ok(result);
        }

        return NotFound();
    }
}
