#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IDeployPipelineExecutor
{
    Task<Build> QueueAsync(DeployPipelineQueueRequest request, CancellationToken cancellationToken);
}
