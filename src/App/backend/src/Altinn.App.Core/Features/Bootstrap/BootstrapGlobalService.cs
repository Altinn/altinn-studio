using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(
    IAppMetadata appMetadata,
    IAppResources appResources,
    IOptions<FrontEndSettings> frontEndSettings,
    IApplicationLanguage applicationLanguage
) : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IAppResources _appResources = appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings = frontEndSettings;
    private readonly IApplicationLanguage _applicationLanguage = applicationLanguage;
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState()
    {
        var appMetadataTask = _appMetadata.GetApplicationMetadata();

        var footerTask = GetFooterLayout();

        var availableLanguagesTask = _applicationLanguage.GetApplicationLanguages();

        await Task.WhenAll(appMetadataTask, footerTask, availableLanguagesTask);

        var layoutSets = _appResources.GetLayoutSetsConfig() ?? new LayoutSetsConfig { Sets = [] };
        layoutSets.UiSettings ??= new GlobalPageSettings();

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            LayoutSetsConfig = layoutSets,
            AvailableLanguages = await availableLanguagesTask,
            FrontEndSettings = _frontEndSettings.Value,
        };
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await _appResources.GetFooter();
        return string.IsNullOrEmpty(footerJson)
            ? null
            : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
    }
}
