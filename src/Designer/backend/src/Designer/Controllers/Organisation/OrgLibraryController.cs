using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Exceptions.OrgLibrary;
using Altinn.Studio.Designer.Exceptions.SharedContent;
using Altinn.Studio.Designer.Exceptions.SourceControl;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using LibGit2Sharp;
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
[Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
[Route("designer/api/{org}/shared-resources")]
public class OrgLibraryController(IOrgLibraryService orgLibraryService, ILogger<OrgLibraryController> logger) : ControllerBase
{

    /// <summary>
    /// Gets the latest commit sha for a given branch.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="branchName">The branch name. Fallback to default branch.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The latest commit sha.</returns>
    [HttpGet]
    [Route("latest-commit")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<LatestCommitShaResponse>> GetLatestCommitOnBranch(string org, [FromQuery] string branchName = General.DefaultBranch, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            string latestCommit = await orgLibraryService.GetLatestCommitOnBranch(org, branchName, cancellationToken);
            return Ok(new LatestCommitShaResponse(latestCommit));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error fetching latest commit for {Org} on branch {BranchName}.", org, branchName);
            throw;
        }
    }

    /// <summary>
    /// Fetches the shared resources belonging to the organisation.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="path">Directory path where resources are located.</param>
    /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A <see cref="GetSharedResourcesResponse" /> with org library resources.</returns>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GetSharedResourcesResponse>> GetSharedResources(string org, [FromQuery] string? path, [FromQuery] string? reference = null, CancellationToken cancellationToken = default)
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
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Directory not found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error fetching shared resources for {Org}.", org);
            throw;
        }
    }

    /// <summary>
    /// Creates or overwrites the shared resources.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="requestBody">The body of the request <see cref="UpdateSharedResourceRequest"/></param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpPut]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> UpdateSharedResources(string org, [FromBody] UpdateSharedResourceRequest requestBody, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        try
        {
            await orgLibraryService.UpdateSharedResourcesByPath(org, developer, requestBody, cancellationToken);
            return Ok();
        }
        catch (Exception ex) when (ex is InvalidOperationException or IllegalCommitMessageException)
        {
            logger.LogWarning(ex, "Error updating shared resources for {Org} by {Developer}.", org, developer);
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Unable to update shared resources",
                Detail = ex.Message
            });
        }
        catch (Exception ex) when (ex is NonFastForwardException)
        {
            logger.LogWarning(ex, "Merge conflict when updating shared resources for {Org} by {Developer}.", org, developer);
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Merge conflict when updating shared resources",
                Detail = ex.Message
            });
        }
        catch (Exception ex) when (ex is BranchNotFoundException)
        {
            logger.LogWarning(ex, "Branch not found when updating shared resources for {Org} by {Developer}.", org, developer);
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "The local branch was not found",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error updating shared resources for {Org} by {Developer}.", org, developer);
            throw;
        }
    }

    /// <summary>Fetches a list of published resources.</summary>
    /// <param name="org">Unique identifier of the organisation.</param>
    /// <param name="path">Directory path in which to search.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    [HttpGet]
    [Route("published")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<string>>> GetPublishedResources(string org, [FromQuery] string path = "", CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            List<string> resources = await orgLibraryService.GetPublishedResourcesForOrg(org, path, cancellationToken);
            return Ok(resources);
        }
        catch (Exception ex) when (ex is SharedContentRequestException)
        {
            logger.LogWarning(
                ex,
                "A request error occured in the shared content client when fetching resources for {Org}.",
                org.WithoutLineBreaks()
            );
            return BadRequest(
                new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error fetching published resources",
                    Detail = ex.Message
                }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error fetching published resources for {Org}.", org.WithoutLineBreaks());
            throw;
        }
    }
}
