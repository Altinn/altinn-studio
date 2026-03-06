using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using MediatR;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;

namespace Altinn.Studio.Designer.Services.Implementation;

public class DeploymentDispatchService : IDeploymentDispatchService
{
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IReleaseRepository _releaseRepository;
    private readonly IApplicationInformationService _applicationInformationService;
    private readonly IEnvironmentsService _environmentsService;
    private readonly IDeployPipelineExecutor _deployPipelineExecutor;
    private readonly IDeployEventRepository _deployEventRepository;
    private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;
    private readonly IPublisher _mediatr;
    private readonly GeneralSettings _generalSettings;
    private readonly TimeProvider _timeProvider;
    private readonly IGitOpsConfigurationManager _gitOpsConfigurationManager;
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<DeploymentDispatchService> _logger;
    private readonly IDataProtector _deploymentDispatchTokenProtector;

    public DeploymentDispatchService(
        IDeploymentRepository deploymentRepository,
        IReleaseRepository releaseRepository,
        IApplicationInformationService applicationInformationService,
        IEnvironmentsService environmentsService,
        IDeployPipelineExecutor deployPipelineExecutor,
        IDeployEventRepository deployEventRepository,
        IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext,
        IPublisher mediatr,
        GeneralSettings generalSettings,
        TimeProvider timeProvider,
        IGitOpsConfigurationManager gitOpsConfigurationManager,
        IFeatureManager featureManager,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<DeploymentDispatchService> logger
    )
    {
        _deploymentRepository = deploymentRepository;
        _releaseRepository = releaseRepository;
        _applicationInformationService = applicationInformationService;
        _environmentsService = environmentsService;
        _deployPipelineExecutor = deployPipelineExecutor;
        _deployEventRepository = deployEventRepository;
        _entityUpdatedHubContext = entityUpdatedHubContext;
        _mediatr = mediatr;
        _generalSettings = generalSettings;
        _timeProvider = timeProvider;
        _gitOpsConfigurationManager = gitOpsConfigurationManager;
        _featureManager = featureManager;
        _deploymentDispatchTokenProtector = dataProtectionProvider.CreateProtector(
            DeploymentDispatchTokenProtection.Purpose
        );
        _logger = logger;
    }

    public async Task TryDispatchAsync(
        string org,
        string workflowId,
        string? traceParent,
        string? traceState,
        CancellationToken cancellationToken
    )
    {
        var nowUtc = _timeProvider.GetUtcNow();
        var staleBeforeUtc = nowUtc.AddMinutes(-DeploymentDispatchSweeperJobConstants.ClaimTimeoutMinutes);
        var claimedDispatch = await _deploymentRepository.TryClaimPendingDispatch(
            org,
            workflowId,
            nowUtc,
            staleBeforeUtc,
            cancellationToken
        );

        if (claimedDispatch is null)
        {
            return;
        }

        await DispatchClaimedAsync(claimedDispatch, traceParent, traceState, cancellationToken);
    }

    public async Task DispatchPendingAsync(CancellationToken cancellationToken)
    {
        var nowUtc = _timeProvider.GetUtcNow();
        var staleBeforeUtc = nowUtc.AddMinutes(-DeploymentDispatchSweeperJobConstants.ClaimTimeoutMinutes);
        var claimedDispatches = await _deploymentRepository.ClaimPendingDispatches(
            DeploymentDispatchSweeperJobConstants.BatchSize,
            nowUtc,
            staleBeforeUtc,
            cancellationToken
        );

        foreach (var claimedDispatch in claimedDispatches)
        {
            await DispatchClaimedAsync(claimedDispatch, traceParent: null, traceState: null, cancellationToken);
        }
    }

    private async Task DispatchClaimedAsync(
        ClaimedDeploymentDispatch claimedDispatch,
        string? traceParent,
        string? traceState,
        CancellationToken cancellationToken
    )
    {
        ArgumentNullException.ThrowIfNull(claimedDispatch);

        var deployment = claimedDispatch.Deployment;
        string appDeployToken = _deploymentDispatchTokenProtector.Unprotect(claimedDispatch.ProtectedAppDeployToken);

        try
        {
            var release = await _releaseRepository.GetSucceededReleaseFromDb(
                deployment.Org,
                deployment.App,
                deployment.TagName
            );

            cancellationToken = CancellationToken.None;

            await _applicationInformationService.UpdateApplicationInformationAsync(
                deployment.Org,
                deployment.App,
                release.TargetCommitish,
                deployment.EnvName,
                cancellationToken
            );

            bool useGitOpsDefinition = await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy);
            bool shouldPushSyncRootImage =
                useGitOpsDefinition
                && await AddAppToGitOpsRepoIfNotExists(
                    AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(
                        deployment.Org,
                        deployment.App,
                        deployment.CreatedBy,
                        appDeployToken
                    ),
                    AltinnRepoName.FromName(deployment.App),
                    AltinnEnvironment.FromName(deployment.EnvName)
                );

            var queuedBuild = await _deployPipelineExecutor.QueueAsync(
                new DeployPipelineQueueRequest
                {
                    Org = deployment.Org,
                    App = deployment.App,
                    Environment = deployment.EnvName,
                    TagName = deployment.TagName,
                    AppCommitId = release.TargetCommitish,
                    Hostname = await _environmentsService.GetHostNameByEnvName(deployment.EnvName),
                    AppDeployToken = appDeployToken,
                    GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                    AltinnStudioHostname = _generalSettings.HostName,
                    UseGitOpsDefinition = useGitOpsDefinition,
                    ShouldPushSyncRootImage = shouldPushSyncRootImage,
                    TraceParent = traceParent,
                    TraceState = traceState,
                },
                cancellationToken
            );

            deployment.Build.ExternalId = queuedBuild.Id.ToString();
            deployment.Build.Status = queuedBuild.Status;
            deployment.Build.Result = BuildResult.None;
            deployment.Build.Started = queuedBuild.StartTime;
            await _deploymentRepository.Update(deployment, clearDispatchState: true);

            await _deployEventRepository.AddAsync(
                deployment.Org,
                deployment.Build.Id,
                new DeployEvent
                {
                    EventType = DeployEventType.PipelineScheduled,
                    Message = $"Pipeline {deployment.Build.ExternalId} scheduled",
                    Timestamp = _timeProvider.GetUtcNow(),
                }
            );

            await _mediatr.Publish(
                new DeploymentPipelineQueued
                {
                    EditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                        deployment.Org,
                        deployment.App,
                        deployment.CreatedBy
                    ),
                    WorkflowId = deployment.Build.Id,
                    ExternalBuildId = queuedBuild.Id,
                    PipelineType = PipelineType.Deploy,
                    Environment = deployment.EnvName,
                    TraceParent = traceParent,
                    TraceState = traceState,
                },
                cancellationToken
            );

            await NotifyDeploymentUpdatedAsync(deployment.CreatedBy);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            deployment.Build.Status = BuildStatus.Completed;
            deployment.Build.Result = BuildResult.Failed;
            deployment.Build.Finished = _timeProvider.GetUtcNow().UtcDateTime;
            await _deploymentRepository.Update(deployment, clearDispatchState: true);
            await NotifyDeploymentUpdatedAsync(deployment.CreatedBy);
            _logger.LogError(ex, "Failed to dispatch deployment workflow {WorkflowId}", deployment.Build.Id);
            throw;
        }
    }

    private async Task<bool> AddAppToGitOpsRepoIfNotExists(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        AltinnRepoName app,
        AltinnEnvironment environment
    )
    {
        AltinnOrgEditingContext orgContext = authenticatedContext.OrgEditingContext;
        AltinnRepoEditingContext repoContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            orgContext.Org,
            app.Name,
            orgContext.Developer
        );

        await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(orgContext, environment);

        bool appAlreadyExists = await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(
            orgContext,
            app,
            environment
        );

        if (appAlreadyExists)
        {
            return false;
        }

        await _gitOpsConfigurationManager.AddAppToGitOpsConfigurationAsync(repoContext, environment);
        _gitOpsConfigurationManager.PersistGitOpsConfiguration(orgContext, environment);
        return true;
    }

    private Task NotifyDeploymentUpdatedAsync(string developer) =>
        _entityUpdatedHubContext.Clients.Group(developer).EntityUpdated(new EntityUpdated(EntityConstants.Deployment));
}
