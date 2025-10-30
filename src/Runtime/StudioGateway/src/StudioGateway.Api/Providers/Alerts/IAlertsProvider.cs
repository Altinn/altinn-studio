using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using StudioGateway.Api.Models;

namespace StudioGateway.Api.Providers.Alerts;

public interface IAlertsProvider
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );
}
