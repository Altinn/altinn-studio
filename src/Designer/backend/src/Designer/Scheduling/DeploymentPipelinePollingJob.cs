#nullable disable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

// Polls of one build never overlap, so the poll that sees the pipeline finish is the only one to record it.
[DisallowConcurrentExecution]
public class DeploymentPipelinePollingJob : IJob
{
    private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IDeployEventRepository _deployEventRepository;
    private readonly IAltinnStorageAppMetadataClient _altinnStorageAppMetadataClient;
    private readonly IApplicationInformationService _applicationInformationService;
    private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;
    private readonly IPublisher _mediatr;
    private readonly ILogger<DeploymentPipelinePollingJob> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly AppDeployMetrics _metrics;

    public DeploymentPipelinePollingJob(
        IAzureDevOpsBuildClient azureDevOpsBuildClient,
        IDeploymentRepository deploymentRepository,
        IDeployEventRepository deployEventRepository,
        IAltinnStorageAppMetadataClient altinnStorageAppMetadataClient,
        IApplicationInformationService applicationInformationService,
        IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext,
        IPublisher mediatr,
        ILogger<DeploymentPipelinePollingJob> logger,
        TimeProvider timeProvider,
        AppDeployMetrics metrics
    )
    {
        _azureDevOpsBuildClient = azureDevOpsBuildClient;
        _deploymentRepository = deploymentRepository;
        _deployEventRepository = deployEventRepository;
        _altinnStorageAppMetadataClient = altinnStorageAppMetadataClient;
        _applicationInformationService = applicationInformationService;
        _entityUpdatedHubContext = entityUpdatedHubContext;
        _mediatr = mediatr;
        _logger = logger;
        _timeProvider = timeProvider;
        _metrics = metrics;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        Activity activity = null;

        try
        {
            // The job run's own span is the poll's entry span, and the deploy trace's span links to it. Both carry
            // the deploy's attributes, so that searching either finds the poll.
            Activity jobSpan = RootSpan.OfJob();
            activity = TryStartTraceActivity(context);
            Activity[] spans = [.. new[] { jobSpan, activity }.OfType<Activity>()];
            var jobDataMap = context.JobDetail.JobDataMap;

            string org = jobDataMap.GetRequiredString(DeploymentPipelinePollingJobConstants.Arguments.Org);
            string app = jobDataMap.GetRequiredString(DeploymentPipelinePollingJobConstants.Arguments.App);
            string developer = jobDataMap.GetRequiredString(DeploymentPipelinePollingJobConstants.Arguments.Developer);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            string buildId = jobDataMap.GetRequiredString(DeploymentPipelinePollingJobConstants.Arguments.BuildId);
            PipelineType type = Enum.Parse<PipelineType>(
                jobDataMap.GetRequiredString(DeploymentPipelinePollingJobConstants.Arguments.PipelineType),
                true
            );
            string environment = jobDataMap.GetRequiredString(
                DeploymentPipelinePollingJobConstants.Arguments.Environment
            );
            foreach (Activity span in spans)
            {
                span.SetRepository(org, app);
                span.SetTargetEnvironment(environment);
                span.SetAppDeployBuild(buildId);
                span.SetTag(ServiceTelemetry.Attributes.AppDeploy.PipelineType, ServiceTelemetry.EnumValue(type));
            }

            var build = await _azureDevOpsBuildClient.Get(buildId, context.CancellationToken);
            // When Designer saw the run's status: the pipeline's end in its duration and its event, and so Flux's start.
            DateTimeOffset observed = _timeProvider.GetUtcNow();
            foreach (Activity span in spans)
            {
                span.SetTag(
                    ServiceTelemetry.Attributes.AppDeploy.PipelineStatus,
                    ServiceTelemetry.EnumValue(build.Status)
                );
            }

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

            if (
                build.Status == BuildStatus.Completed
                && deploymentEntity.Events.All(e =>
                    e.EventType != DeployEventType.PipelineSucceeded && e.EventType != DeployEventType.PipelineFailed
                )
            )
            {
                await AddDeployEventIfNotExist(build, org, buildId, observed);
            }

            await _deploymentRepository.Update(deploymentEntity);

            if (build.Status == BuildStatus.Completed)
            {
                RecordCompletedPipeline(
                    spans,
                    editingContext,
                    type,
                    environment,
                    buildId,
                    build,
                    deploymentEntity,
                    observed
                );

                if (type == PipelineType.Undeploy && build.Result == BuildResult.Succeeded)
                {
                    await UpdateMetadataInStorage(editingContext, environment);
                    await DeprecateInResourceRegistry(editingContext, environment);
                }
                await _entityUpdatedHubContext
                    .Clients.Group(editingContext.Developer)
                    .EntityUpdated(new EntityUpdated(EntityConstants.Deployment));

                await PublishCompletedEvent(editingContext, type, environment, build.Result == BuildResult.Succeeded);

                CancelJob(context);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
        finally
        {
            activity?.Dispose();
        }
    }

    /// <summary>
    /// Records the pipeline's end, on the poll that first sees it completed. A pipeline that did not succeed ends the
    /// deploy, since Designer asks the runtime to reconcile only after one that succeeded, unless Flux has already
    /// reported a result: Flux also reconciles on its own, and the first result is the deploy's.
    /// </summary>
    private void RecordCompletedPipeline(
        Activity[] spans,
        AltinnRepoEditingContext editingContext,
        PipelineType type,
        string environment,
        string buildId,
        BuildEntity build,
        DeploymentEntity deploymentEntity,
        DateTimeOffset observed
    )
    {
        TimeSpan sinceRequest = observed.UtcDateTime - deploymentEntity.Created;
        string pipelineResult = AppDeployMetrics.PipelineResult(build.Result);
        foreach (Activity span in spans)
        {
            span.SetTag(ServiceTelemetry.Attributes.CicdPipelineResult, pipelineResult);
        }
        _metrics.RecordPipeline(editingContext.Org, type, environment, build.Result, sinceRequest);
        _metrics.RecordPipelineRun(type, environment, build);
        if (build.Result == BuildResult.Succeeded)
        {
            return;
        }

        bool failed = AppDeployMetrics.IsPipelineFailure(build.Result);
        if (!deploymentEntity.HasFinalEvent)
        {
            string result = failed ? AppDeployMetrics.PipelineFailed : AppDeployMetrics.PipelineCanceled;
            foreach (Activity span in spans)
            {
                span.SetTag(ServiceTelemetry.Attributes.AppDeploy.Result, result);
            }
            _metrics.RecordResult(
                editingContext.Org,
                type,
                environment,
                result,
                failed ? AppDeployMetrics.PipelineFailed : null,
                sinceRequest
            );
        }

        // Someone canceled the run on purpose, which is not an error.
        if (!failed)
        {
            return;
        }

        foreach (Activity span in spans)
        {
            span.SetTag(ServiceTelemetry.Attributes.ErrorType, AppDeployMetrics.PipelineFailed);
            span.SetStatus(ActivityStatusCode.Error, $"The pipeline's result is {pipelineResult}");
        }
        _logger.LogError(
            "The {PipelineType} pipeline {BuildId} for {Org}/{App} in {Environment} ended with {BuildResult}",
            ServiceTelemetry.EnumValue(type),
            buildId,
            editingContext.Org,
            editingContext.Repo,
            environment,
            ServiceTelemetry.EnumValue(build.Result)
        );
    }

    // Each poll continues the deploy request's trace on purpose: a deploy is one trace through Designer, Azure DevOps,
    // the gateway and Flux, so it can be followed end to end (https://github.com/Altinn/altinn-studio/issues/21073).
    private Activity TryStartTraceActivity(IJobExecutionContext context)
    {
        var jobDataMap = context.JobDetail.JobDataMap;
        string traceParent = jobDataMap.GetOptionalString(DeploymentPipelinePollingJobConstants.Arguments.TraceParent);
        if (string.IsNullOrWhiteSpace(traceParent))
        {
            return null;
        }

        string traceState = jobDataMap.GetOptionalString(DeploymentPipelinePollingJobConstants.Arguments.TraceState);
        if (!ActivityContext.TryParse(traceParent, traceState, out var parentContext))
        {
            string buildId = jobDataMap.GetOptionalString(DeploymentPipelinePollingJobConstants.Arguments.BuildId);
            _logger.LogWarning("Invalid trace context in polling job for build {BuildId}", buildId ?? "<unknown>");
            return null;
        }

        IEnumerable<ActivityLink> links = null;
        if (Activity.Current?.Context is { } currentContext && !currentContext.Equals(parentContext))
        {
            links = [new ActivityLink(currentContext)];
        }

        var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(DeploymentPipelinePollingJob)}.{nameof(Execute)}",
            kind: ActivityKind.Internal,
            parentContext: parentContext,
            links: links
        );
        activity.SetAlwaysSample();
        return activity;
    }

    private async Task AddDeployEventIfNotExist(BuildEntity build, string org, string buildId, DateTimeOffset observed)
    {
        var eventType =
            build.Result == BuildResult.Succeeded ? DeployEventType.PipelineSucceeded : DeployEventType.PipelineFailed;

        await _deployEventRepository.AddAsync(
            org,
            buildId,
            new DeployEvent
            {
                EventType = eventType,
                Message = $"Pipeline {buildId} {build.Result.ToEnumMemberAttributeValue()}",
                Timestamp = observed,
                Origin = DeployEventOrigin.PollingJob,
            }
        );
    }

    private async Task PublishCompletedEvent(
        AltinnRepoEditingContext editingContext,
        PipelineType type,
        string environment,
        bool succeeded
    )
    {
        try
        {
            await _mediatr.Publish(
                new DeploymentPipelineCompleted
                {
                    EditingContext = editingContext,
                    PipelineType = type,
                    Environment = environment,
                    Succeeded = succeeded,
                }
            );
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error publishing DeploymentPipelineCompleted event");
            throw;
        }
    }

    private async Task UpdateMetadataInStorage(AltinnRepoEditingContext editingContext, string environment)
    {
        string appMetadataJson = await _altinnStorageAppMetadataClient.GetApplicationMetadataJsonAsync(
            editingContext,
            environment
        );
        appMetadataJson = Helpers.ApplicationMetadataJsonHelper.SetCopyInstanceEnabled(appMetadataJson, enabled: false);
        appMetadataJson = Helpers.ApplicationMetadataJsonHelper.SetStatus(appMetadataJson, AppStatus.Deprecated);
        await _altinnStorageAppMetadataClient.UpsertApplicationMetadata(
            editingContext.Org,
            editingContext.Repo,
            appMetadataJson,
            environment
        );
    }

    private async Task DeprecateInResourceRegistry(AltinnRepoEditingContext editingContext, string environment)
    {
        ResourceRegistryPublishResult result = await _applicationInformationService.UpdateResourceRegistryStatusAsync(
            editingContext.Org,
            editingContext.Repo,
            environment,
            AppStatus.Deprecated
        );
        if (!result.Succeeded)
        {
            _logger.LogWarning(
                "Failed to set status {AppStatus} in Resource Registry for {Org}/{App} in {Env}: {ErrorMessage}",
                AppStatus.Deprecated,
                editingContext.Org,
                editingContext.Repo,
                environment,
                result.ErrorMessage
            );
        }
    }

    private static void CancelJob(IJobExecutionContext context)
    {
        context.Scheduler.DeleteJob(context.JobDetail.Key);
    }
}
