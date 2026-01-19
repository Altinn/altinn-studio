using System.Text.Json;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(IAppMetadata appMetadata, IAppResources appResources)
    : IBootstrapGlobalService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState()
    {
        var appMetadataTask = await appMetadata.GetApplicationMetadata();

        var footer = await appResources.GetFooter();

        var footerJson = string.IsNullOrEmpty(footer)
            ? null
            : JsonSerializer.Deserialize<object>(footer, _jsonSerializerOptions);

        return new BootstrapGlobalResponse { ApplicationMetadata = appMetadataTask, Footer = footerJson };
    }
}
