using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(
    IAppMetadata appMetadata,
    IAppResources appResources,
    IOptions<FrontEndSettings> frontEndSettings
) : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IAppResources _appResources = appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings = frontEndSettings;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState()
    {
        var appMetadataTask = _appMetadata.GetApplicationMetadata();
        var footerTask = _appResources.GetFooter();

        await Task.WhenAll(appMetadataTask, footerTask);

        var footer = await footerTask;
        var applicationMetadata = await appMetadataTask;
        var footerJson = string.IsNullOrEmpty(footer)
            ? null
            : JsonSerializer.Deserialize<object>(footer, _jsonSerializerOptions);

        var layoutSets = _appResources.GetLayoutSetsConfig() ?? new LayoutSetsConfig { Sets = [] };
        layoutSets.UiSettings ??= new GlobalPageSettings();

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = applicationMetadata,
            Footer = footerJson,
            LayoutSetsConfig = layoutSets,
            FrontEndSettings = _frontEndSettings.Value,
        };
    }
}
