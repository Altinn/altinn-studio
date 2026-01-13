using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(IAppMetadata appMetadata) : IBootstrapGlobalService
{
    public async Task<BootstrapGlobalResponse> GetGlobalState()
    {
        var appMetadataTask = await appMetadata.GetApplicationMetadata();
        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = appMetadataTask,
        };
    }
}
