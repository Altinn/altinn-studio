using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Redirect;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
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
    IAuthenticationContext authenticationContext,
    IHttpContextAccessor httpContextAccessor,
    IAltinnCdnClient altinnCdnClient,
    ILogger<BootstrapGlobalService> logger
) : IBootstrapGlobalService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private const string DefaultLanguage = LanguageConst.Nb;

    public async Task<BootstrapGlobalResponse> GetGlobalState(
        string org,
        string app,
        string? redirectUrl,
        string? language
    )
    {
        var appMetadataTask = appMetadata.GetApplicationMetadata();
        var footerTask = GetFooterLayout();
        var textResourcesTask = GetTextResources(org, app, language);
        var availableLanguagesTask = applicationLanguage.GetApplicationLanguages();

        var layoutSets = appResources.GetLayoutSets() ?? new LayoutSets { Sets = [] };
        layoutSets.UiSettings ??= new GlobalPageSettings();

        var validatedUrl = returnUrlService.Validate(redirectUrl);

        var userProfileTask = GetUserProfileOrNull();

        var orgDataTask = GetOrgData();

        await Task.WhenAll(
            appMetadataTask,
            footerTask,
            availableLanguagesTask,
            userProfileTask,
            textResourcesTask,
            orgDataTask
        );

        var (orgName, orgLogoUrl) = await orgDataTask;

        return new BootstrapGlobalResponse
        {
            AvailableLanguages = await availableLanguagesTask,
            TextResources = await textResourcesTask,
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            LayoutSets = layoutSets,
            FrontEndSettings = frontEndSettings.Value,
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

        return await profileClient.GetUserProfile(userId.Value);
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await appResources.GetFooter();
        return string.IsNullOrEmpty(footerJson)
            ? null
            : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
    }

    private async Task<TextResource?> GetTextResources(string org, string app, string? languageFromUrl)
    {
        string[] availableLanguages =
        [
            .. (await applicationLanguage.GetApplicationLanguages()).Select(it => it.Language),
        ];
        if (availableLanguages.IsNullOrEmpty())
        {
            logger.LogDebug("No text resources configured for any language on app.");
            return null;
        }

        if (
            languageFromUrl is not null
            && availableLanguages.Contains(languageFromUrl)
            && await appResources.GetTexts(org, app, languageFromUrl) is TextResource textResourceFromUrl
        )
        {
            return textResourceFromUrl;
        }

        var languageFromCookie = GetLanguageFromCookie();
        if (
            languageFromCookie is not null
            && availableLanguages.Contains(languageFromCookie)
            && await appResources.GetTexts(org, app, languageFromCookie) is TextResource textResourceFromCookie
        )
        {
            return textResourceFromCookie;
        }

        string userLanguage = await authenticationContext.Current.GetLanguage();
        if (
            availableLanguages.Contains(userLanguage)
            && await appResources.GetTexts(org, app, userLanguage) is TextResource textResourceFromUserLanguage
        )
        {
            return textResourceFromUserLanguage;
        }

        if (await appResources.GetTexts(org, app, DefaultLanguage) is TextResource textResourceFromDefaultLanguage)
        {
            return textResourceFromDefaultLanguage;
        }

        foreach (string availableLanguage in availableLanguages)
        {
            TextResource? availableLangTextResource = await appResources.GetTexts(org, app, availableLanguage);
            if (availableLangTextResource is not null)
            {
                return availableLangTextResource;
            }
        }

        return null;
    }

    private string? GetLanguageFromCookie()
    {
        if (authenticationContext.Current is not Authenticated.User user)
        {
            return null;
        }

        if (httpContextAccessor.HttpContext is null)
        {
            return null;
        }

        string cookieKey = $"lang_{user.UserPartyId}";
        if (!httpContextAccessor.HttpContext.Request.Cookies.TryGetValue(cookieKey, out var languageCookie))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<string>(languageCookie);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Language cookie with key {CookieKey} found, but failed deserialize it.", cookieKey);
            return null;
        }
    }

    private async Task<(AltinnCdnOrgName? OrgName, string? OrgLogoUrl)> GetOrgData()
    {
        var orgDetails = await altinnCdnClient.GetOrgDetails();
        if (orgDetails is null)
        {
            return (null, null);
        }

        return (orgDetails.Name, orgDetails.Logo);
    }
}
