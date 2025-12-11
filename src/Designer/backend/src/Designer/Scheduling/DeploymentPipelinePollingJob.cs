#nullable disable
using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public class DeploymentPipelinePollingJob : IJob
{
    private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IDeployEventRepository _deployEventRepository;
    private readonly IAltinnStorageAppMetadataClient _altinnStorageAppMetadataClient;
    private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;
    private readonly IPublisher _mediatr;
    private readonly ILogger<DeploymentPipelinePollingJob> _logger;
    private readonly TimeProvider _timeProvider;

    public DeploymentPipelinePollingJob(IAzureDevOpsBuildClient azureDevOpsBuildClient, IDeploymentRepository deploymentRepository, IDeployEventRepository deployEventRepository, IAltinnStorageAppMetadataClient altinnStorageAppMetadataClient, IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext, IPublisher mediatr, ILogger<DeploymentPipelinePollingJob> logger, TimeProvider timeProvider)
    {
        _azureDevOpsBuildClient = azureDevOpsBuildClient;
        _deploymentRepository = deploymentRepository;
        _deployEventRepository = deployEventRepository;
        _altinnStorageAppMetadataClient = altinnStorageAppMetadataClient;
        _entityUpdatedHubContext = entityUpdatedHubContext;
        _mediatr = mediatr;
        _logger = logger;
        _timeProvider = timeProvider;
    }


    public async Task Execute(IJobExecutionContext context)
    {
        string org = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.Org);
        string app = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.App);
        string developer = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.Developer);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        string buildId = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.BuildId);
        PipelineType type = Enum.Parse<PipelineType>(context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.PipelineType)!, true);
        string environment = context.JobDetail.JobDataMap.GetString(DeploymentPipelinePollingJobConstants.Arguments.Environment);
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

        if (build.Status == BuildStatus.Completed && deploymentEntity.Events.All(e => e.EventType != DeployEventType.PipelineSucceeded && e.EventType != DeployEventType.PipelineFailed))
        {
            await AddDeployEventIfNotExist(build.Status , build, org, buildId);
        }

        await _deploymentRepository.Update(deploymentEntity);

        if (build.Status == BuildStatus.Completed)
        {
            if (type == PipelineType.Undeploy && build.Result == BuildResult.Succeeded)
            {
                await UpdateMetadataInStorage(editingContext, environment);
            }
            await _entityUpdatedHubContext.Clients.Group(editingContext.Developer)
                .EntityUpdated(new EntityUpdated(EntityConstants.Deployment));

            await PublishCompletedEvent(editingContext, type, environment, build.Result == BuildResult.Succeeded);

            CancelJob(context);
        }

    }

    private async Task AddDeployEventIfNotExist(BuildStatus buildStatus, BuildEntity build, string org, string buildId)
    {
        var eventType = build.Result == BuildResult.Succeeded
            ? DeployEventType.PipelineSucceeded
            : DeployEventType.PipelineFailed;

        await _deployEventRepository.AddAsync(org, buildId, new DeployEvent
        {
            EventType = eventType,
            Message = $"Pipeline {buildId} {build.Result}",
            Timestamp = _timeProvider.GetUtcNow()
        });
    }

    private async Task PublishCompletedEvent(AltinnRepoEditingContext editingContext, PipelineType type,
        string environment, bool succeeded)
    {
        try
        {
            await _mediatr.Publish(new DeploymentPipelineCompleted
            {
                EditingContext = editingContext,
                PipelineType = type,
                Environment = environment,
                Succeeded = succeeded
            });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error publishing DeploymentPipelineCompleted event");
            throw;
        }

    }

    private async Task UpdateMetadataInStorage(AltinnRepoEditingContext editingContext, string environment)
    {
        string appMetadataJson = await _altinnStorageAppMetadataClient.GetApplicationMetadataJsonAsync(editingContext, environment);
        appMetadataJson = Helpers.ApplicationMetadataJsonHelper.SetCopyInstanceEnabled(appMetadataJson, enabled: false);
        await _altinnStorageAppMetadataClient.UpsertApplicationMetadata(editingContext.Org, editingContext.Repo, appMetadataJson, environment);
    }

    private static void CancelJob(IJobExecutionContext context)
    {
        context.Scheduler.DeleteJob(context.JobDetail.Key);
    }
}
