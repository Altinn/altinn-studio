using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine;

public interface IAppUpgradeEngineClient
{
    Task<AppUpgradeEngineResponse> RunUpgradeAsync(
        AppUpgradeEngineRequest request,
        CancellationToken cancellationToken
    );
}
