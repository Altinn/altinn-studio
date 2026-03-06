using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DeploymentDispatchJob : IJob
{
    private readonly IDeploymentDispatchService _deploymentDispatchService;

    public DeploymentDispatchJob(IDeploymentDispatchService deploymentDispatchService)
    {
        _deploymentDispatchService = deploymentDispatchService;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var jobDataMap = context.JobDetail.JobDataMap;
        await _deploymentDispatchService.TryDispatchAsync(
            jobDataMap.GetRequiredString(DeploymentDispatchJobConstants.Arguments.Org),
            jobDataMap.GetRequiredString(DeploymentDispatchJobConstants.Arguments.WorkflowId),
            jobDataMap.GetOptionalString(DeploymentDispatchJobConstants.Arguments.TraceParent),
            jobDataMap.GetOptionalString(DeploymentDispatchJobConstants.Arguments.TraceState),
            context.CancellationToken
        );
    }
}
