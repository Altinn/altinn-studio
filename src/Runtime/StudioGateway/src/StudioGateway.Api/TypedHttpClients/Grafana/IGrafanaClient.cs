using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using StudioGateway.Api.Models;

namespace StudioGateway.Api.TypedHttpClients.Grafana;

public interface IGrafanaClient
{
    public Task<IEnumerable<GrafanaAlert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );
}
