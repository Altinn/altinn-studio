using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public interface IRuntimeGatewayClient
{
    Task<IEnumerable<AppDeployment>> GetAppDeployments(string org, AltinnEnvironment environment, CancellationToken cancellationToken);
    Task<AppDeployment> GetAppDeployment(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken);
    Task<bool> IsAppDeployedWithGitOpsAsync(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken);
    Task<IEnumerable<AlertRule>> GetAlertRulesAsync(string org, AltinnEnvironment environment, CancellationToken cancellationToken);
    Task<IEnumerable<ErrorMetric>> GetErrorMetricsAsync(string org, AltinnEnvironment environment, int range, CancellationToken cancellationToken);
    Task<IEnumerable<AppMetric>> GetAppMetricsAsync(string org, AltinnEnvironment environment, string app, int range, CancellationToken cancellationToken);
    Task<IEnumerable<AppErrorMetric>> GetAppErrorMetricsAsync(string org, AltinnEnvironment environment, string app, int range, CancellationToken cancellationToken);
    Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(string org, AltinnEnvironment environment, string app, CancellationToken cancellationToken);
    Task TriggerReconcileAsync(string org, string app, AltinnEnvironment environment, bool isUndeploy, CancellationToken cancellationToken);
}
