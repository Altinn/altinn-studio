using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Maps deployed app versions to the commits they were built from, for apps in any org.
/// </summary>
/// <remarks>
/// Unlike <see cref="ReleasesController"/>, this does not require membership of the org. A commit SHA is only
/// useful to someone with read access to the repository, and Gitea enforces that access.
/// </remarks>
[ApiController]
[Authorize]
[AllowApiKey]
[TypeFilter(typeof(ConditionalAntiforgeryFilter))]
[Route("designer/api/v1/releases")]
public class ReleaseLookupController(IReleaseRepository releaseRepository, ILogger<ReleaseLookupController> logger)
    : ControllerBase
{
    public const int MaxItems = 1000;

    /// <summary>
    /// Gets the commit each app version was built from. Versions without a succeeded release are left out.
    /// </summary>
    [HttpPost("lookup")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<ReleaseLookupResponse>>> Lookup(
        [FromBody] List<ReleaseLookupRequest?> request,
        CancellationToken cancellationToken
    )
    {
        if (request.Count > MaxItems)
        {
            return Problem(
                title: "Too many items",
                detail: $"The request has {request.Count} items. The limit is {MaxItems}.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        for (int i = 0; i < request.Count; i++)
        {
            ValidateItem(request[i], i);
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        List<ReleaseLookupKey> keys = request
            .Select(item => new ReleaseLookupKey(item!.Org, item.App, item.Version))
            .Distinct()
            .ToList();

        var releases = await releaseRepository.GetSucceededReleases(keys, cancellationToken);

        logger.LogInformation(
            "Release lookup by {Username} found {Found} of {Requested} versions.",
            AuthenticationHelper.GetDeveloperUserName(HttpContext).WithoutLineBreaks(),
            releases.Count,
            keys.Count
        );

        return releases
            .Select(r => new ReleaseLookupResponse(r.Org, r.App, r.TagName, r.TargetCommitish, r.Created))
            .ToList();
    }

    private void ValidateItem(ReleaseLookupRequest? item, int index)
    {
        if (item is null)
        {
            ModelState.AddModelError($"[{index}]", "The item is empty.");
            return;
        }

        if (string.IsNullOrEmpty(item.Org) || !AltinnRegexes.AltinnOrganizationNameRegex().IsMatch(item.Org))
        {
            ModelState.AddModelError($"[{index}].org", "The org is not a valid organization name.");
        }

        if (string.IsNullOrEmpty(item.App) || !AltinnRegexes.AltinnAppNameRegex().IsMatch(item.App))
        {
            ModelState.AddModelError($"[{index}].app", "The app is not a valid app name.");
        }

        if (string.IsNullOrWhiteSpace(item.Version))
        {
            ModelState.AddModelError($"[{index}].version", "The version is empty.");
        }
    }
}
