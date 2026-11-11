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

    // Gitea refuses org names longer than 40 characters, and Designer app names longer than 30.
    public const int MaxOrgLength = 40;
    public const int MaxAppLength = 30;

    // The longest tag an image can have, and the longest version a release can be created with.
    public const int MaxVersionLength = 128;

    // MaxItems items of maximum length take about 250 kB as JSON, so this leaves room for formatting but stops a
    // client from sending megabytes for the server to parse.
    public const int MaxRequestBytes = 1_000_000;

    /// <summary>
    /// Gets the commit each app version was built from. Versions without a succeeded release are left out.
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

        for (int i = 0; i < items.Count; i++)
        {
            ValidateItem(items[i], i);
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        List<ReleaseLookupKey> keys = items
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

        return new ReleaseLookupResponse(
            releases
                .Select(r => new ReleaseLookupResult(r.Org, r.App, r.TagName, r.TargetCommitish, r.Created))
                .ToList()
        );
    }

    private void ValidateItem(ReleaseLookupItem? item, int index)
    {
        if (item is null)
        {
            ModelState.AddModelError($"items[{index}]", "The item is empty.");
            return;
        }

        // The lengths are checked first, because the app name's regular expression backtracks on long input.
        if (
            string.IsNullOrEmpty(item.Org)
            || item.Org.Length > MaxOrgLength
            || !AltinnRegexes.AltinnOrganizationNameRegex().IsMatch(item.Org)
        )
        {
            ModelState.AddModelError($"items[{index}].org", "The org is not a valid organization name.");
        }

        if (
            string.IsNullOrEmpty(item.App)
            || item.App.Length > MaxAppLength
            || !AltinnRegexes.AltinnAppNameRegex().IsMatch(item.App)
        )
        {
            ModelState.AddModelError($"items[{index}].app", "The app is not a valid app name.");
        }

        if (!IsImageTag(item.Version))
        {
            ModelState.AddModelError($"items[{index}].version", "The version is not a valid release version.");
        }
    }

    /// <summary>
    /// Checks the version against the grammar of an image tag.
    /// </summary>
    /// <remarks>
    /// A succeeded release pushed an image tagged with its version, so a version that is not an image tag cannot
    /// match one. The grammar is wider than the rule for creating a release, which also rejects uppercase letters
    /// and underscores, so the lookup never rejects a version that a release built before that rule could have.
    /// </remarks>
    private static bool IsImageTag(string? version)
    {
        if (string.IsNullOrEmpty(version) || version.Length > MaxVersionLength)
        {
            return false;
        }

        for (int i = 0; i < version.Length; i++)
        {
            char c = version[i];
            bool isWordCharacter = char.IsAsciiLetterOrDigit(c) || c == '_';
            if (!isWordCharacter && (i == 0 || (c != '.' && c != '-')))
            {
                return false;
            }
        }

        return true;
    }
}
