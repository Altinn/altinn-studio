using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Microsoft.AspNetCore.SignalR;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DeploymentPipelinePollingJob : IJob
{
    private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;

    public DeploymentPipelinePollingJob(IAzureDevOpsBuildClient azureDevOpsBuildClient, IDeploymentRepository deploymentRepository, IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext)
    {
        _azureDevOpsBuildClient = azureDevOpsBuildClient;
        _deploymentRepository = deploymentRepository;
        _entityUpdatedHubContext = entityUpdatedHubContext;
    }


    public async Task Execute(IJobExecutionContext context)
    {
        string org = context.JobDetail.JobDataMap.GetString("org");
        string app = context.JobDetail.JobDataMap.GetString("app");
        string developer = context.JobDetail.JobDataMap.GetString("developer");
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        string buildId = context.JobDetail.JobDataMap.GetString("buildId");
        Guard.ArgumentNotNull(buildId, nameof(buildId));

        var build = await _azureDevOpsBuildClient.Get(buildId);

        var deploymentEntity = await _deploymentRepository.Get(editingContext.Org, buildId);

        if (deploymentEntity.Build.Status == BuildStatus.Completed)
        {
            CancelJob(context);
            return;
        }
        deploymentEntity.Build.Status = build.Status;
        deploymentEntity.Build.Started = build.Started;
        deploymentEntity.Build.Finished = build.Finished;
        deploymentEntity.Build.Result = build.Result;
        await _deploymentRepository.Update(deploymentEntity);

        if (build.Status == BuildStatus.Completed)
        {
            await _entityUpdatedHubContext.Clients.Group(editingContext.Developer)
                            .EntityUpdated(new EntityUpdated(EntityConstants.Deployment));
            CancelJob(context);
        }

    }

    private static void CancelJob(IJobExecutionContext context)
    {
        context.Scheduler.DeleteJob(context.JobDetail.Key);
    }
}
