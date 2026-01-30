using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Redirect;
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
    ILogger<BootstrapGlobalService> logger
) : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IAppResources _appResources = appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings = frontEndSettings;
    private readonly IApplicationLanguage _applicationLanguage = applicationLanguage;
    private readonly IProfileClient _profileClient = profileClient;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
    private readonly IAuthenticationContext _authenticationContext = authenticationContext;
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
    private readonly ILogger<BootstrapGlobalService> _logger = logger;

    private const string DefaultLanguage = LanguageConst.Nb;

    public async Task<BootstrapGlobalResponse> GetGlobalState(
        string org,
        string app,
        string? redirectUrl,
        string? language
    )
    {
        var appMetadataTask = _appMetadata.GetApplicationMetadata();
        var footerTask = GetFooterLayout();
        var textResourcesTask = GetTextResources(org, app, language);
        var availableLanguagesTask = _applicationLanguage.GetApplicationLanguages();

        var layoutSets = _appResources.GetLayoutSets() ?? new LayoutSets { Sets = [] };
        layoutSets.UiSettings ??= new GlobalPageSettings();

        var validatedUrl = returnUrlService.Validate(redirectUrl);

        var userProfileTask = GetUserProfileOrNull();

        await Task.WhenAll(appMetadataTask, footerTask, availableLanguagesTask, userProfileTask, textResourcesTask);

        return new BootstrapGlobalResponse
        {
            AvailableLanguages = await availableLanguagesTask,
            TextResources = await textResourcesTask,
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            LayoutSets = layoutSets,
            FrontEndSettings = _frontEndSettings.Value,
            ReturnUrl = validatedUrl.DecodedUrl is not null ? validatedUrl.DecodedUrl : null,
            UserProfile = await userProfileTask,
        };
    }

    private async Task<UserProfile?> GetUserProfileOrNull()
    {
        var user = _httpContextAccessor.HttpContext?.User;
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

    private async Task<TextResource?> GetTextResources(string org, string app, string? languageFromUrl)
    {
        string[] availableLanguages =
        [
            .. (await _applicationLanguage.GetApplicationLanguages()).Select(it => it.Language),
        ];
        if (availableLanguages.IsNullOrEmpty())
        {
            _logger.LogDebug("No text resources configured for any language on app.");
            return null;
        }

        if (
            languageFromUrl is not null
            && availableLanguages.Contains(languageFromUrl)
            && await _appResources.GetTexts(org, app, languageFromUrl) is TextResource textResourceFromUrl
        )
        {
            _logger.LogDebug("Found text resources with language from query params.");
            return textResourceFromUrl;
        }

        var languageFromCookie = GetLanguageFromCookie(org, app);
        if (
            languageFromCookie is not null
            && availableLanguages.Contains(languageFromCookie)
            && await _appResources.GetTexts(org, app, languageFromCookie) is TextResource textResourceFromCookie
        )
        {
            _logger.LogDebug("Found text resources with language from cookie");
            return textResourceFromCookie;
        }

        string userLanguage = await _authenticationContext.Current.GetLanguage();
        if (
            availableLanguages.Contains(userLanguage)
            && await _appResources.GetTexts(org, app, userLanguage) is TextResource textResourceFromUserLanguage
        )
        {
            _logger.LogDebug("Found text resources with user preferred language {Language}.", userLanguage);
            return textResourceFromUserLanguage;
        }

        _logger.LogDebug("Falling back to default language '{DefaultLanguage}' for text resources.", DefaultLanguage);
        if (await _appResources.GetTexts(org, app, DefaultLanguage) is TextResource textResourceFromDefaultLanguage)
        {
            return textResourceFromDefaultLanguage;
        }

        _logger.LogDebug(
            "Could not find any text resources for the default language. Checking all other available languages"
        );
        foreach (string availableLanguage in availableLanguages)
        {
            TextResource? availableLangTextResource = await _appResources.GetTexts(org, app, availableLanguage);
            if (availableLangTextResource is not null)
            {
                _logger.LogDebug("Found text resource with language {AvailableLanguage}", availableLanguage);
                return availableLangTextResource;
            }
        }

        return null;
    }

    private string? GetLanguageFromCookie(string org, string app)
    {
        if (_authenticationContext.Current is not Authenticated.User user)
        {
            return null;
        }

        if (_httpContextAccessor.HttpContext is null)
        {
            return null;
        }

        string cookieKey = $"{org}_{app}_{user.UserPartyId}_lang";
        if (!_httpContextAccessor.HttpContext.Request.Cookies.TryGetValue(cookieKey, out var languageCookie))
        {
            _logger.LogInformation("No language cookie found for cookieKey {CookieKey}", cookieKey);
            return null;
        }

        try
        {
            var languageCookieValue = JsonSerializer.Deserialize<string>(languageCookie);
            _logger.LogInformation(
                "Successfully deserialized language cookie value for cookieKey {CookieKey}",
                cookieKey
            );
            return languageCookieValue;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Language cookie with key {CookieKey} found, but failed deserialize it.", cookieKey);
            return null;
        }
    }
}
