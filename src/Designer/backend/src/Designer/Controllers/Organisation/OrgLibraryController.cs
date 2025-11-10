using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers.Organisation;

/// <summary>
/// Controller containing actions related to the organisation library.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="OrgLibraryController"/> class.
/// </remarks>
/// <param name="orgLibraryService">The library service.</param>
/// <param name="logger">The logger.</param>
[ApiController]
[Authorize]
[Route("designer/api/{org}/shared-resources")]
public class OrgLibraryController(IOrgLibraryService orgLibraryService, ILogger<OrgLibraryController> logger) : ControllerBase
{
    /// <summary>
    /// Fetches the contents of all the code lists belonging to the organisation.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="path">Directory path where resources are located.</param>
    /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>List of <see cref="CodeListWrapper" /> which includes all code lists belonging to the organisation.</returns>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<GetSharedResourcesResponse>> GetSharedResourcesByPath(string org, [FromQuery] string? path, [FromQuery] string? reference = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            GetSharedResourcesResponse response = await orgLibraryService.GetSharedResourcesByPath(org, path, reference, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex) when (ex is DirectoryNotFoundException)
        {
            logger.LogWarning(ex, "Directory not found when fetching shared resources for {Org}.", org);
            return BadRequest(ex);
        }
    }

    /// <summary>
    /// Creates or overwrites the code lists.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="requestBody">The body of the request <see cref="UpdateCodeListRequest"/></param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> UpdateSharedResourcesByPath(string org, [FromBody] UpdateSharedResourceRequest requestBody, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        await orgLibraryService.UpdateSharedResourcesByPath(org, developer, requestBody, cancellationToken);

        return Ok();
    }
}
