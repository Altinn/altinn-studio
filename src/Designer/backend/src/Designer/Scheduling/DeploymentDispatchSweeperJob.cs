#nullable enable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DeploymentDispatchSweeperJob(IDeploymentDispatchService deploymentDispatchService) : IJob
{
    public Task Execute(IJobExecutionContext context) =>
        deploymentDispatchService.DispatchPendingAsync(context.CancellationToken);
}
