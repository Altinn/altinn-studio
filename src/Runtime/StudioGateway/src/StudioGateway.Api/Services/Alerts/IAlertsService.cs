using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using StudioGateway.Api.Models;

namespace StudioGateway.Api.Services.Alerts;

public interface IAlertsService
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );
}
