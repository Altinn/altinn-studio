using System.Text.Json;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(IAppMetadata appMetadata, IAppResources appResources)
    : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IAppResources _appResources = appResources;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState()
    {
        var appMetadataTask = await _appMetadata.GetApplicationMetadata();

        var footer = await _appResources.GetFooter();

        var footerJson = string.IsNullOrEmpty(footer)
            ? null
            : JsonSerializer.Deserialize<object>(footer, _jsonSerializerOptions);
        var layoutSets = _appResources.GetLayoutSets();

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = appMetadataTask,
            Footer = footerJson,
            LayoutSets = layoutSets?.Sets ?? [],
            GlobalPageSettings = layoutSets?.UiSettings ?? new GlobalPageSettings(),
        };
    }
}
