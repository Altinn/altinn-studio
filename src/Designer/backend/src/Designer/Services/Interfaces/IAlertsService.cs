using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Alerts;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAlertsService
{
    public Task<IEnumerable<Alert>> GetFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );

    public Task UpsertFiringAlertsAsync(
        string org,
        string env,
        CancellationToken cancellationToken = default
    );
}
