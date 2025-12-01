using Altinn.App.Core.Features.Bootstrap.Models;

namespace Altinn.App.Core.Features.Bootstrap;

public interface IBootstrapGlobalService
{
    Task<BootstrapGlobalResponse> GetGlobalState(
        string org,
        string app,
        string? instanceId = null,
        int? partyId = null,
        string? language = null,
        CancellationToken cancellationToken = default
    );
}
