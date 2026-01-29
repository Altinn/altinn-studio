using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Redirect;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(
    IAppMetadata appMetadata,
    IAppResources appResources,
    IOptions<FrontEndSettings> frontEndSettings,
    IApplicationLanguage applicationLanguage,
    IReturnUrlService returnUrlService,
    IProfileClient profileClient,
    IHttpContextAccessor httpContextAccessor,
    IAltinnCdnClient altinnCdnClient,
    ILogger<BootstrapGlobalService> logger
) : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IAppResources _appResources = appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings = frontEndSettings;
    private readonly IApplicationLanguage _applicationLanguage = applicationLanguage;
    private readonly IProfileClient _profileClient = profileClient;
    private readonly IAltinnCdnClient _altinnCdnClient = altinnCdnClient;
    private readonly ILogger<BootstrapGlobalService> _logger = logger;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState(string? redirectUrl)
    {
        var appMetadataTask = _appMetadata.GetApplicationMetadata();

        var footerTask = GetFooterLayout();

        var availableLanguagesTask = _applicationLanguage.GetApplicationLanguages();

        var layoutSets = _appResources.GetLayoutSets() ?? new LayoutSets { Sets = [] };
        layoutSets.UiSettings ??= new GlobalPageSettings();

        var validatedUrl = returnUrlService.Validate(redirectUrl);

        var userProfileTask = GetUserProfileOrNull();

        var orgDataTask = GetOrgData();

        await Task.WhenAll(appMetadataTask, footerTask, availableLanguagesTask, userProfileTask, orgDataTask);

        var (orgName, orgLogoUrl) = await orgDataTask;

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            LayoutSets = layoutSets,
            AvailableLanguages = await availableLanguagesTask,
            FrontEndSettings = _frontEndSettings.Value,
            ReturnUrl = validatedUrl.DecodedUrl is not null ? validatedUrl.DecodedUrl : null,
            UserProfile = await userProfileTask,
            OrgName = orgName,
            OrgLogoUrl = orgLogoUrl,
        };
    }

    private async Task<UserProfile?> GetUserProfileOrNull()
    {
        var user = httpContextAccessor.HttpContext?.User;
        var userId = user?.GetUserIdAsInt();
        if (userId == null)
        {
            return null;
        }

        return await _profileClient.GetUserProfile(userId.Value);
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await _appResources.GetFooter();
        return string.IsNullOrEmpty(footerJson)
            ? null
            : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
    }

    private async Task<(Dictionary<string, string>? OrgName, string? OrgLogoUrl)> GetOrgData()
    {
        var appMeta = await _appMetadata.GetApplicationMetadata();
        var org = appMeta.Org;
        if (string.IsNullOrEmpty(org))
        {
            return (null, null);
        }

        var cdnOrgs = await _altinnCdnClient.GetOrgs();
        if (cdnOrgs.Orgs is null || !cdnOrgs.Orgs.TryGetValue(org, out var orgDetails))
        {
            return (null, null);
        }

        Dictionary<string, string>? orgName = null;
        if (orgDetails.Name is { } name)
        {
            // TODO: Copy this directly from the source, do not hard-code it to three languages
            orgName = new Dictionary<string, string>();
            if (name.Nb is not null)
                orgName["nb"] = name.Nb;
            if (name.Nn is not null)
                orgName["nn"] = name.Nn;
            if (name.En is not null)
                orgName["en"] = name.En;
        }

        return (orgName, orgDetails.Logo);
    }
}
