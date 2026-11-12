using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
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

    // MaxItems items with the longest names and versions take about 250 kB as JSON, so this leaves room for
    // formatting but stops a client from sending megabytes for the server to parse.
    public const int MaxRequestBytes = 1_000_000;

    /// <summary>
    /// Gets the commit each app version was built from. Versions without a succeeded release that was built from a
    /// known commit are left out.
    /// </summary>
    [HttpPost("lookup")]
    [RequestSizeLimit(MaxRequestBytes)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReleaseLookupResponse>> Lookup(
        [FromBody] ReleaseLookupRequest request,
        CancellationToken cancellationToken
    )
    {
        IReadOnlyList<ReleaseLookupItem?>? items = request.Items;
        if (items is null)
        {
            ModelState.AddModelError("items", "The items are missing.");
            return ValidationProblem(ModelState);
        }

        if (items.Count > MaxItems)
        {
            return Problem(
                title: "Too many items",
                detail: $"The request has {items.Count} items. The limit is {MaxItems}.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var keys = new HashSet<ReleaseLookupKey>();
        for (int i = 0; i < items.Count; i++)
        {
            if (TryParseItem(items[i], i, out ReleaseLookupKey? key))
            {
                keys.Add(key);
            }
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        // The newest succeeded release is the one that last pushed the image tag, so it is the only one whose commit
        // the running version can have. When it was not built from a commit, the commit is unknown, even if an older
        // build of the same tag had one.
        var releases = new List<ReleaseLookupResult>();
        foreach (var release in await releaseRepository.GetSucceededReleases(keys, cancellationToken))
        {
            // A release can also target a branch, a tag or an abbreviated ID, which could point at another commit than
            // the one it was built from. Git and Gitea resolve 40 hexadecimal digits as an object ID before any ref of
            // that name, so only such a target is certain to be the commit. App repositories are SHA-1, where the 64
            // digits of a SHA-256 ID would be a ref name.
            if (CommitSha.TryParse(release.TargetCommitish, out CommitSha commit))
            {
                releases.Add(
                    new ReleaseLookupResult(release.Org, release.App, release.TagName, commit.Value, release.Created)
                );
            }
        }

        logger.LogInformation(
            "Release lookup by {Username} found {Found} of {Requested} versions.",
            AuthenticationHelper.GetDeveloperUserName(HttpContext).WithoutLineBreaks(),
            releases.Count,
            keys.Count
        );

        return new ReleaseLookupResponse(releases);
    }

    private bool TryParseItem(ReleaseLookupItem? item, int index, [NotNullWhen(true)] out ReleaseLookupKey? key)
    {
        key = null;
        if (item is null)
        {
            ModelState.AddModelError($"items[{index}]", "The item is empty.");
            return false;
        }

        // The lookup is for deployed apps, which a service owner owns, so the org must be a service owner code. A
        // repository whose owner is no service owner's has no deployed version to look up.
        bool hasOrg = ServiceOwnerCode.TryParse(item.Org, out ServiceOwnerCode org);
        if (!hasOrg)
        {
            ModelState.AddModelError($"items[{index}].org", "The org is not a valid service owner code.");
        }

        bool hasApp = AppName.TryParse(item.App, out AppName app);
        if (!hasApp)
        {
            ModelState.AddModelError($"items[{index}].app", "The app is not a valid app name.");
        }

        // A succeeded release pushed an image tagged with its version, so a version that cannot be an image tag has
        // no release.
        bool hasVersion = AppVersion.TryParse(item.Version, out AppVersion version);
        if (!hasVersion)
        {
            ModelState.AddModelError($"items[{index}].version", "The version is not a valid release version.");
        }

        if (!hasOrg || !hasApp || !hasVersion)
        {
            return false;
        }

        key = new ReleaseLookupKey(new AppIdentifier(org, app), version);
        return true;
    }
}
