using System;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Microsoft.AspNetCore.SignalR;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DeploymentPipelinePollingJob : IJob
{
    private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IAltinnStorageAppMetadataClient _altinnStorageAppMetadataClient;
    private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;

    public DeploymentPipelinePollingJob(IAzureDevOpsBuildClient azureDevOpsBuildClient, IDeploymentRepository deploymentRepository, IAltinnStorageAppMetadataClient altinnStorageAppMetadataClient, IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext)
    {
        _azureDevOpsBuildClient = azureDevOpsBuildClient;
        _deploymentRepository = deploymentRepository;
        _altinnStorageAppMetadataClient = altinnStorageAppMetadataClient;
        _entityUpdatedHubContext = entityUpdatedHubContext;
    }


    public async Task Execute(IJobExecutionContext context)
    {
        string org = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.Org);
        string app = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.App);
        string developer = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.Developer);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        string buildId = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.BuildId);
        bool hasPipelineTypeArgument = context.JobDetail.JobDataMap.TryGetString(DeploymentPipelinePollingJobConstants.Arguments.PipelineType, out string pipelineType);
        PipelineType type = hasPipelineTypeArgument ? Enum.Parse<PipelineType>(pipelineType!) : PipelineType.Deploy;
        context.JobDetail.JobDataMap.TryGetString(DeploymentPipelinePollingJobConstants.Arguments.Environment, out string environment);
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
            if (type == PipelineType.Undeploy)
            {
                await UpdateMetadataInStorage(editingContext, environment);
            }
            await _entityUpdatedHubContext.Clients.Group(editingContext.Developer)
                .EntityUpdated(new EntityUpdated(EntityConstants.Deployment));
            CancelJob(context);
        }

    }

    private async Task UpdateMetadataInStorage(AltinnRepoEditingContext editingContext, string environment)
    {
        var appMetadata = await _altinnStorageAppMetadataClient.GetApplicationMetadataAsync(editingContext, environment);
        var copyInstanceSettings = appMetadata.CopyInstanceSettings ?? new CopyInstanceSettings();
        copyInstanceSettings.Enabled = false;
        appMetadata.CopyInstanceSettings = copyInstanceSettings;
        await _altinnStorageAppMetadataClient.UpsertApplicationMetadata(editingContext.Org, editingContext.Repo, appMetadata, environment);
    }

    private static void CancelJob(IJobExecutionContext context)
    {
        context.Scheduler.DeleteJob(context.JobDetail.Key);
    }
}
