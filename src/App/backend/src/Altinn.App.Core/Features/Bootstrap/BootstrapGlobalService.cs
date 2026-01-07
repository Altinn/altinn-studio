using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.Platform.Profile.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(
    IAppMetadata appMetadata,
    IAppResources appResources,
    IProfileClient profileClient,
    IHttpContextAccessor httpContextAccessor,
    IApplicationLanguage applicationLanguage,
    IOptions<GeneralSettings> generalSettings,
    IOptions<FrontEndSettings> frontEndSettings
) : IBootstrapGlobalService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState(string org, string app, string? language = null)
    {
        var resolvedLanguage = language ?? GetLanguageFromContext();
        var userId = TryGetAuthenticatedUserId();

        // Start all tasks in parallel
        var availableLanguagesTask = applicationLanguage.GetApplicationLanguages();
        var footerLayoutTask = GetFooterLayout();
        var textResourcesTask = appResources.GetTexts(org, app, resolvedLanguage);
        var userProfileTask = userId.HasValue
            ? GetUserProfileOrNull(userId.Value)
            : Task.FromResult<UserProfile?>(null);
        var appMetadataTask = appMetadata.GetApplicationMetadata();

        // Await all tasks
        await Task.WhenAll(
            availableLanguagesTask,
            footerLayoutTask,
            textResourcesTask,
            userProfileTask,
            appMetadataTask
        );

        // Build response immutably from completed tasks
        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = await appMetadataTask,
            AvailableLanguages = await availableLanguagesTask,
            FooterLayout = await footerLayoutTask,
            TextResources = await textResourcesTask,
            UserProfile = await userProfileTask,
        };
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await appResources.GetFooter();
        return string.IsNullOrEmpty(footerJson)
            ? null
            : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
    }

    private async Task<UserProfile?> GetUserProfileOrNull(int userId)
    {
        try
        {
            return await profileClient.GetUserProfile(userId);
        }
        catch
        {
            return null;
        }
    }

    private int? TryGetAuthenticatedUserId()
    {
        var user = httpContextAccessor.HttpContext?.User;
        return user?.Identity?.IsAuthenticated == true ? user.GetUserIdAsInt() : null;
    }

    private string GetLanguageFromContext()
    {
        var acceptLanguageHeader = httpContextAccessor.HttpContext?.Request.Headers["Accept-Language"].ToString();
        if (string.IsNullOrEmpty(acceptLanguageHeader))
        {
            return "nb";
        }

        foreach (var lang in acceptLanguageHeader.Split(','))
        {
            var token = lang.Split(';')[0].Trim();
            if (token.Length < 2)
            {
                continue;
            }

            var cleanLang = token[..2].ToLower(CultureInfo.InvariantCulture);
            if (generalSettings.Value.LanguageCodes?.Contains(cleanLang) == true)
            {
                return cleanLang;
            }
        }

        return "nb";
    }
}
