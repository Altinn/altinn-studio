using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Redirect;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(
    IAppMetadata appMetadata,
    IAppResources appResources,
    IOptions<FrontEndSettings> frontEndSettings,
    IApplicationLanguage applicationLanguage,
    IReturnUrlValidator returnUrlValidator
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

        await Task.WhenAll(appMetadataTask, footerTask, availableLanguagesTask);
        if (redirectUrl == null)
        {
            return new BootstrapGlobalResponse
            {
                ApplicationMetadata = await appMetadataTask,
                Footer = await footerTask,
                AvailableLanguages = await availableLanguagesTask,
                FrontEndSettings = frontEndSettings.Value,
            };
        }

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            AvailableLanguages = await availableLanguagesTask,
            FrontEndSettings = frontEndSettings.Value,
            ReturnUrl = returnUrlValidator.Validate(redirectUrl),
        };
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await appResources.GetFooter();
        return string.IsNullOrEmpty(footerJson)
            ? null
            : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
    }
}
