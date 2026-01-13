using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public interface IRuntimeGatewayClient
{
    Task<IEnumerable<AppDeployment>> GetAppDeployments(string org, AltinnEnvironment environment, CancellationToken cancellationToken);

    Task<AppDeployment> GetAppDeployment(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken);

    Task<bool> IsAppDeployedWithGitOpsAsync(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken);

    Task TriggerReconcileAsync(string org, string app, AltinnEnvironment environment, bool isNewApp, bool isUndeploy, CancellationToken cancellationToken);
}
