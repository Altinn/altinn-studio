using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Alerts;

namespace Altinn.Studio.Designer.TypedHttpClient.StudioGateway;

public interface IStudioGatewayClient
{
    public Task<IEnumerable<StudioGatewayAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );
}
