using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAlertProvider
{
    public Task<IEnumerable<Alert>> GetFiringAlerts(
        string org,
        string env,
        CancellationToken ct
    );
}
