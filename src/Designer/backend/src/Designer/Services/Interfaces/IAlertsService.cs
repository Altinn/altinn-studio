using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAlertsService
{
    public Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    );

    public Task NotifyAlertsUpdatedAsync(string org, AltinnEnvironment environment, Alert alert, CancellationToken cancellationToken);
}
