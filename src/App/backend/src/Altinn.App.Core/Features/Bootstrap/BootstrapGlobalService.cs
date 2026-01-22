using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Redirect;
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
    IOptions<FrontEndSettings> frontEndSettings,
    IApplicationLanguage applicationLanguage,
    IReturnUrlService returnUrlService,
    IProfileClient profileClient,
    IHttpContextAccessor httpContextAccessor
) : IBootstrapGlobalService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState(string? redirectUrl)
    {
        var appMetadataTask = appMetadata.GetApplicationMetadata();

        var footerTask = GetFooterLayout();

        var availableLanguagesTask = applicationLanguage.GetApplicationLanguages();

        var userProfileTask = GetUserProfileOrNull();

        await Task.WhenAll(appMetadataTask, footerTask, availableLanguagesTask, userProfileTask);

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            AvailableLanguages = await availableLanguagesTask,
            FrontEndSettings = frontEndSettings.Value,
            UserProfile = await userProfileTask,
            ReturnUrl = redirectUrl is not null ? returnUrlService.Validate(redirectUrl) : null,
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
}
