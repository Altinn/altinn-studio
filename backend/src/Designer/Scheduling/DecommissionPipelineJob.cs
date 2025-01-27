using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DecommissionPipelineJob : IJob
{
    private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
    private readonly IDeploymentRepository _deploymentRepository;

    public DecommissionPipelineJob(IAzureDevOpsBuildClient azureDevOpsBuildClient, IDeploymentRepository deploymentRepository)
    {
        _azureDevOpsBuildClient = azureDevOpsBuildClient;
        _deploymentRepository = deploymentRepository;
    }


    public async Task Execute(IJobExecutionContext context)
    {
        string org = context.JobDetail.JobDataMap.GetString("org");
        string app = context.JobDetail.JobDataMap.GetString("app");
        string buildId = context.JobDetail.JobDataMap.GetString("buildId");

        var build = await _azureDevOpsBuildClient.Get(buildId);

        var deploymentEntity = await _deploymentRepository.Get(org, buildId);

        if (deploymentEntity.Build.Status == BuildStatus.Completed)
        {
            CancelJob(context);
            return;
        }
        deploymentEntity.Build.Status = build.Status;
        deploymentEntity.Build.Finished = build.Finished;
        deploymentEntity.Build.Result = build.Result;
        await _deploymentRepository.Update(deploymentEntity);

        if (build.Status == BuildStatus.Completed)
        {
            CancelJob(context);

            // Notify frontend
        }

    }

    private void CancelJob(IJobExecutionContext context)
    {
        context.Scheduler.DeleteJob(context.JobDetail.Key);
    }
}
