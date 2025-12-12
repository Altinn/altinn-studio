using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public interface IRuntimeGatewayClient
{
    Task<bool> IsAppDeployedWithGitOpsAsync(string org, string app, AltinnEnvironment environment, CancellationToken cancellationToken);
}
