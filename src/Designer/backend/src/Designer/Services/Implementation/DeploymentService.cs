#nullable disable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the business logic
    /// </summary>
    public class DeploymentService : IDeploymentService
    {
        // Avoid duplicate undeploy runs while still allowing recovery from stale stuck decommissions.
        private static readonly TimeSpan s_pendingDecommissionSkipThreshold = TimeSpan.FromMinutes(10);

        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
        private readonly IDeploymentRepository _deploymentRepository;
        private readonly IDeployEventRepository _deployEventRepository;
        private readonly IReleaseRepository _releaseRepository;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly HttpContext _httpContext;
        private readonly IApplicationInformationService _applicationInformationService;
        private readonly IEnvironmentsService _environmentsService;
        private readonly ILogger<DeploymentService> _logger;
        private readonly IPublisher _mediatr;
        private readonly GeneralSettings _generalSettings;
        private readonly GitOpsSettings _gitOpsSettings;
        private readonly TimeProvider _timeProvider;
        private readonly IGitOpsConfigurationManager _gitOpsConfigurationManager;
        private readonly IFeatureManager _featureManager;
        private readonly IRuntimeGatewayClient _runtimeGatewayClient;
        private readonly ISlackClient _slackClient;
        private readonly AlertsSettings _alertsSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        public DeploymentService(
            AzureDevOpsSettings azureDevOpsOptions,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IHttpContextAccessor httpContextAccessor,
            IDeploymentRepository deploymentRepository,
            IDeployEventRepository deployEventRepository,
            IReleaseRepository releaseRepository,
            IEnvironmentsService environmentsService,
            IApplicationInformationService applicationInformationService,
            ILogger<DeploymentService> logger,
            IPublisher mediatr,
            GeneralSettings generalSettings,
            TimeProvider timeProvider,
            IGitOpsConfigurationManager gitOpsConfigurationManager,
            IFeatureManager featureManager,
            IRuntimeGatewayClient runtimeGatewayClient,
            ISlackClient slackClient,
            AlertsSettings alertsSettings,
            GitOpsSettings gitOpsSettings = null
        )
        {
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _deploymentRepository = deploymentRepository;
            _deployEventRepository = deployEventRepository;
            _releaseRepository = releaseRepository;
            _applicationInformationService = applicationInformationService;
            _environmentsService = environmentsService;
            _azureDevOpsSettings = azureDevOpsOptions;
            _httpContext = httpContextAccessor.HttpContext;
            _logger = logger;
            _mediatr = mediatr;
            _generalSettings = generalSettings;
            _gitOpsSettings = gitOpsSettings ?? new GitOpsSettings();
            _timeProvider = timeProvider;
            _gitOpsConfigurationManager = gitOpsConfigurationManager;
            _featureManager = featureManager;
            _runtimeGatewayClient = runtimeGatewayClient;
            _slackClient = slackClient;
            _alertsSettings = alertsSettings;
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(
            AltinnAuthenticatedRepoEditingContext authenticatedContext,
            DeploymentModel deployment
        )
        {
            var cancellationToken = _httpContext?.RequestAborted ?? CancellationToken.None;
            cancellationToken.ThrowIfCancellationRequested();

            var traceContext = GetCurrentTraceContext();
            DeploymentEntity deploymentEntity = new();
            deploymentEntity.PopulateBaseProperties(authenticatedContext.Org, authenticatedContext.Repo, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvName = deployment.EnvName;

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(
                authenticatedContext.Org,
                authenticatedContext.Repo,
                deploymentEntity.TagName
            );

            await _applicationInformationService.UpdateApplicationInformationAsync(
                authenticatedContext.Org,
                authenticatedContext.Repo,
                release.TargetCommitish,
                deployment.EnvName
            );

            // NOTE: these codepaths are sensitive to leaving partial state/progress if the user/caller
            // cancels the request, but we prefer to at least attempt completion once we've started mutating state
            // This particular multi-step process can start mutating state via `AddAppToGitOpsRepoIfNotExists`
            cancellationToken = CancellationToken.None;

            bool shouldPushSyncRootImage = false;

            if (await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
            {
                shouldPushSyncRootImage = await AddAppToGitOpsRepoIfNotExists(
                    authenticatedContext,
                    AltinnRepoName.FromName(authenticatedContext.Repo),
                    AltinnEnvironment.FromName(deployment.EnvName)
                );
            }

            bool useGitOpsDefinition = await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy);
            Build queuedBuild = await QueueDeploymentBuild(
                release,
                deploymentEntity,
                deployment.EnvName,
                shouldPushSyncRootImage,
                useGitOpsDefinition,
                traceContext.TraceParent,
                traceContext.TraceState,
                cancellationToken
            );

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime,
            };

            var createdEntity = await _deploymentRepository.Create(deploymentEntity);

            await _deployEventRepository.AddAsync(
                authenticatedContext.Org,
                deploymentEntity.Build.Id,
                new DeployEvent
                {
                    EventType = DeployEventType.PipelineScheduled,
                    Message = $"Pipeline {queuedBuild.Id} scheduled",
                    Timestamp = _timeProvider.GetUtcNow(),
                }
            );

            await PublishDeploymentPipelineQueued(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(
                    authenticatedContext.Org,
                    authenticatedContext.Repo,
                    deploymentEntity.CreatedBy
                ),
                queuedBuild,
                PipelineType.Deploy,
                deployment.EnvName,
                traceContext.TraceParent,
                traceContext.TraceState
            );
            return createdEntity;
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

        /// <inheritdoc/>
        /// TODO: https://github.com/Altinn/altinn-studio/issues/11377
        public async Task<SearchResults<DeploymentEntity>> GetAsync(
            string org,
            string app,
            DocumentQueryModel query,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            List<DeploymentEntity> deploymentEntities = (await _deploymentRepository.Get(org, app, query)).ToList();

            IEnumerable<EnvironmentModel> environments = await _environmentsService.GetOrganizationEnvironments(
                org,
                cancellationToken
            );
            List<string> environmentNames = environments.Select(environment => environment.Name).ToList();

            return new SearchResults<DeploymentEntity>
            {
                Results = deploymentEntities.Where(item => environmentNames.Contains(item.EnvName)).ToList(),
            };
        }

        public async Task UndeployAsync(
            AltinnAuthenticatedRepoEditingContext authenticatedContext,
            string env,
            CancellationToken cancellationToken = default
        )
        {
            await UndeployInternalAsync(
                authenticatedContext,
                env,
                authenticatedContext.DeveloperAppToken,
                cancellationToken: cancellationToken
            );
        }

        public async Task UndeploySystemAsync(
            AltinnRepoEditingContext editingContext,
            string env,
            CancellationToken cancellationToken = default
        )
        {
            await UndeployInternalAsync(
                editingContext,
                env,
                _gitOpsSettings.BotPersonalAccessToken,
                cancellationToken,
                isSystemContext: true
            );
        }

        private async Task UndeployInternalAsync(
            AltinnRepoEditingContext editingContext,
            string env,
            string appDeployToken,
            CancellationToken cancellationToken = default,
            bool isSystemContext = false
        )
        {
            Guard.AssertValidEnvironmentName(env);
            cancellationToken.ThrowIfCancellationRequested();
            if (await ShouldSkipUndeployAsync(editingContext, env))
            {
                return;
            }

            // NOTE: these codepaths are sensitive to leaving partial state/progress if the user/caller
            // cancels the request, but we prefer to at least attempt completion once we've started mutating state
            // This particular multi-step process can start mutating state via `ShouldUseGitOpsDecommission` since
            // it calls `RemoveAppFromGitOpsRepoIfExists` (which is a bit unexpected)
            cancellationToken = CancellationToken.None;

            bool useGitOpsDecommission = await ShouldUseGitOpsDecommission(editingContext, env, cancellationToken);

            // find the deployed tag
            DeploymentEntity lastDeployed = await _deploymentRepository.GetLastDeployed(
                editingContext.Org,
                editingContext.Repo,
                env
            );

            if (isSystemContext)
            {
                appDeployToken = useGitOpsDecommission ? appDeployToken : null;
            }

            if (useGitOpsDecommission && string.IsNullOrWhiteSpace(appDeployToken))
            {
                throw new InvalidOperationException(
                    "GitOps bot token is required for system undeploy when GitOps decommission pipeline is selected."
                );
            }

            int definitionId = useGitOpsDecommission
                ? _azureDevOpsSettings.GitOpsManagerDefinitionId
                : _azureDevOpsSettings.DecommissionDefinitionId;

            var traceContext = GetCurrentTraceContext();
            GitOpsManagementBuildParameters gitOpsManagementBuildParameters = new()
            {
                AppOwner = editingContext.Org,
                AppRepo = editingContext.Repo,
                AppEnvironment = env,
                AltinnStudioHostname = _generalSettings.HostName,
                AppDeployToken = appDeployToken,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                TraceParent = traceContext.TraceParent,
                TraceState = traceContext.TraceState,
            };

            var build = await _azureDevOpsBuildClient.QueueAsync(
                gitOpsManagementBuildParameters,
                definitionId,
                cancellationToken
            );

            DeploymentEntity deploymentEntity = new()
            {
                EnvName = env,
                DeploymentType = DeploymentType.Decommission,
                TagName = lastDeployed.TagName,
                Build = new BuildEntity
                {
                    Id = build.Id.ToString(),
                    Status = build.Status,
                    Started = build.StartTime,
                },
            };
            deploymentEntity.PopulateBaseProperties(editingContext, _timeProvider);

            await _deploymentRepository.Create(deploymentEntity);

            await _deployEventRepository.AddAsync(
                editingContext.Org,
                deploymentEntity.Build.Id,
                new DeployEvent
                {
                    EventType = useGitOpsDecommission
                        ? DeployEventType.PipelineScheduled
                        : DeployEventType.DeprecatedPipelineScheduled,
                    Message = $"Undeploy pipeline {build.Id} scheduled",
                    Timestamp = _timeProvider.GetUtcNow(),
                }
            );

            await PublishDeploymentPipelineQueued(
                editingContext,
                build,
                PipelineType.Undeploy,
                env,
                traceContext.TraceParent,
                traceContext.TraceState
            );
        }

        private async Task<bool> ShouldSkipUndeployAsync(AltinnRepoEditingContext editingContext, string env)
        {
            var pendingDecommission = await _deploymentRepository.GetPendingDecommission(
                editingContext.Org,
                editingContext.Repo,
                env
            );
            if (pendingDecommission is not null)
            {
                DateTime nowUtc = _timeProvider.GetUtcNow().UtcDateTime;
                DateTime pendingCreatedUtc = NormalizeToUtc(pendingDecommission.Created);
                TimeSpan pendingAge = nowUtc - pendingCreatedUtc;
                bool shouldSkip = pendingAge >= TimeSpan.Zero && pendingAge <= s_pendingDecommissionSkipThreshold;

                if (shouldSkip)
                {
                    Activity.Current?.AddEvent(
                        new ActivityEvent(
                            "undeploy_skipped",
                            tags: new ActivityTagsCollection
                            {
                                ["skip.reason"] = "pending_decommission_recent",
                                ["org"] = editingContext.Org,
                                ["app"] = editingContext.Repo,
                                ["environment"] = env,
                                ["build.id"] = pendingDecommission.Build?.Id ?? string.Empty,
                                ["pending.age_seconds"] = pendingAge.TotalSeconds,
                            }
                        )
                    );
                    return true;
                }

                Activity.Current?.AddEvent(
                    new ActivityEvent(
                        "undeploy_stale_pending_decommission_ignored",
                        tags: new ActivityTagsCollection
                        {
                            ["org"] = editingContext.Org,
                            ["app"] = editingContext.Repo,
                            ["environment"] = env,
                            ["build.id"] = pendingDecommission.Build?.Id ?? string.Empty,
                            ["pending.age_seconds"] = pendingAge.TotalSeconds,
                            ["pending.skip_threshold_seconds"] = s_pendingDecommissionSkipThreshold.TotalSeconds,
                        }
                    )
                );
            }

            return false;
        }

        private static DateTime NormalizeToUtc(DateTime value) =>
            value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
                _ => value,
            };

        private async Task<bool> ShouldUseGitOpsDecommission(
            AltinnRepoEditingContext editingContext,
            string env,
            CancellationToken cancellationToken = default
        )
        {
            if (!await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
            {
                return false;
            }

            bool removedFromGitOps = await RemoveAppFromGitOpsRepoIfExists(editingContext, env);
            if (removedFromGitOps)
            {
                return true;
            }

            var environment = AltinnEnvironment.FromName(env);
            return await _runtimeGatewayClient.IsAppDeployedWithGitOpsAsync(
                editingContext.Org,
                editingContext.Repo,
                environment,
                cancellationToken
            );
        }

        private async Task<bool> RemoveAppFromGitOpsRepoIfExists(AltinnRepoEditingContext editingContext, string env)
        {
            var orgContext = AltinnOrgEditingContext.FromOrgDeveloper(editingContext.Org, editingContext.Developer);

            if (!await _gitOpsConfigurationManager.GitOpsConfigurationExistsAsync(orgContext))
            {
                return false;
            }
            var environment = AltinnEnvironment.FromName(env);
            await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(orgContext, environment);

            var appName = AltinnRepoName.FromName(editingContext.Repo);

            bool appExistsInGitOps = await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(
                orgContext,
                appName,
                environment
            );

            if (!appExistsInGitOps)
            {
                return false;
            }

            await _gitOpsConfigurationManager.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                editingContext,
                environment
            );
            _gitOpsConfigurationManager.PersistGitOpsConfiguration(orgContext, environment);

            return true;
        }

        private async Task PublishDeploymentPipelineQueued(
            AltinnRepoEditingContext editingContext,
            Build build,
            PipelineType pipelineType,
            string environment,
            string traceParent,
            string traceState
        ) =>
            await _mediatr.Publish(
                new DeploymentPipelineQueued
                {
                    EditingContext = editingContext,
                    BuildId = build.Id,
                    PipelineType = pipelineType,
                    Environment = environment,
                    TraceParent = traceParent,
                    TraceState = traceState,
                }
            );

        /// <inheritdoc/>
        public async Task PublishSyncRootAsync(
            AltinnOrgEditingContext editingContext,
            AltinnEnvironment environment,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            // NOTE: these codepaths are sensitive to leaving partial state/progress if the user/caller
            // cancels the request, but we prefer to atleast attempt the completion once we've started mutating some state
            // This particular multi-step process starts mutating state by queueing the ADO build
            cancellationToken = CancellationToken.None;
            var traceContext = GetCurrentTraceContext();
            GitOpsManagementBuildParameters buildParameters = new()
            {
                AppOwner = editingContext.Org,
                AppEnvironment = environment.Name,
                AltinnStudioHostname = _generalSettings.HostName,
                AppDeployToken = await _httpContext.GetDeveloperAppTokenAsync(),
                GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                TraceParent = traceContext.TraceParent,
                TraceState = traceContext.TraceState,
            };

            await _azureDevOpsBuildClient.QueueAsync(
                buildParameters,
                _azureDevOpsSettings.GitOpsManagerDefinitionId,
                cancellationToken
            );
        }

        private async Task<Build> QueueDeploymentBuild(
            ReleaseEntity release,
            DeploymentEntity deploymentEntity,
            string envName,
            bool shouldPushSyncRootImage,
            bool useGitOpsDefinition,
            string traceParent,
            string traceState,
            CancellationToken cancellationToken
        )
        {
            QueueBuildParameters queueBuildParameters = new()
            {
                AppCommitId = release.TargetCommitish,
                AppOwner = deploymentEntity.Org,
                AppRepo = deploymentEntity.App,
                AppEnvironment = deploymentEntity.EnvName,
                Hostname = await _environmentsService.GetHostNameByEnvName(envName),
                TagName = deploymentEntity.TagName,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                AppDeployToken = await _httpContext.GetDeveloperAppTokenAsync(),
                AltinnStudioHostname = _generalSettings.HostName,
                TraceParent = traceParent,
                TraceState = traceState,
            };
            if (shouldPushSyncRootImage)
            {
                queueBuildParameters.PushSyncRootGitopsImage = "true";
            }

            int definitionId = useGitOpsDefinition
                ? _azureDevOpsSettings.GitOpsManagerDefinitionId
                : _azureDevOpsSettings.DeployDefinitionId;

            return await _azureDevOpsBuildClient.QueueAsync(queueBuildParameters, definitionId, cancellationToken);
        }

        private static (string TraceParent, string TraceState) GetCurrentTraceContext()
        {
            var activity = Activity.Current;
            if (activity is null || activity.IdFormat != ActivityIdFormat.W3C)
            {
                return (null, null);
            }

            activity.SetAlwaysSample();

            var traceParent = activity.Id;
            if (string.IsNullOrWhiteSpace(traceParent))
            {
                return (null, null);
            }

            var traceState = string.IsNullOrWhiteSpace(activity.TraceStateString) ? null : activity.TraceStateString;

            return (traceParent, traceState);
        }

        /// <inheritdoc />
        public async Task SendToSlackAsync(
            string org,
            AltinnEnvironment environment,
            string app,
            DeployEventType eventType,
            string buildId,
            DateTimeOffset? startedDate,
            CancellationToken cancellationToken
        )
        {
            if (
                eventType == DeployEventType.InstallSucceeded
                || eventType == DeployEventType.UpgradeSucceeded
                || eventType == DeployEventType.UninstallSucceeded
            )
            {
                return;
            }

            string studioEnv = _generalSettings.OriginEnvironment;

            var links = new List<SlackText>
            {
                new()
                {
                    Type = "mrkdwn",
                    Text =
                        $"<{GrafanaPodLogsUrl(org, environment, app, startedDate, _timeProvider.GetUtcNow())}|Grafana>",
                },
            };

            if (!string.IsNullOrWhiteSpace(buildId))
            {
                links.Add(
                    new SlackText
                    {
                        Type = "mrkdwn",
                        Text =
                            $"<https://dev.azure.com/brreg/altinn-studio/_build/results?buildId={buildId}&view=logs|Build log>",
                    }
                );
            }

            string emoji = ":x:";
            var status = eventType switch
            {
                DeployEventType.InstallFailed or DeployEventType.UpgradeFailed => "Deploy failed",
                DeployEventType.UninstallFailed => "Undeploy failed",
                _ => eventType.ToString(),
            };

            var message = new SlackMessage
            {
                Text = $"{emoji} `{org}` - `{environment.Name}` - `{app}` - *{status}*",
                Blocks =
                [
                    new SlackBlock
                    {
                        Type = "section",
                        Text = new SlackText { Type = "mrkdwn", Text = $"{emoji} *{status}*" },
                    },
                    new SlackBlock
                    {
                        Type = "context",
                        Elements = new List<SlackText>
                        {
                            new() { Type = "mrkdwn", Text = $"Org: `{org}`" },
                            new() { Type = "mrkdwn", Text = $"Env: `{environment.Name}`" },
                            new() { Type = "mrkdwn", Text = $"App: `{app}`" },
                            new() { Type = "mrkdwn", Text = $"Studio env: `{studioEnv}`" },
                        },
                    },
                    new SlackBlock { Type = "context", Elements = links },
                ],
            };

            try
            {
                await _slackClient.SendMessageAsync(
                    _alertsSettings.GetSlackWebhookUrl(environment),
                    message,
                    cancellationToken
                );
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Failed to send Slack deploy notification");
            }
        }

        private static string GrafanaPodLogsUrl(
            string org,
            AltinnEnvironment environment,
            string app,
            DateTimeOffset? startedDate,
            DateTimeOffset finishedDate
        )
        {
            var baseDomain = environment.IsProd()
                ? $"https://{org}.apps.altinn.no"
                : $"https://{org}.apps.tt02.altinn.no";

            var path = "/monitor/d/ae1906c2hbjeoe/pod-console-error-logs";

            var queryParams = new Dictionary<string, string>
            {
                ["var-rg"] = $"altinnapps-{org}-{(environment.IsProd() ? "prod" : environment.Name)}-rg",
                ["var-PodName"] = $"{org}-{app}-deployment-v2",
            };

            if (startedDate is not null)
            {
                queryParams["from"] = startedDate.Value.ToUnixTimeMilliseconds().ToString();
                queryParams["to"] = finishedDate.ToUnixTimeMilliseconds().ToString();
            }

            return QueryHelpers.AddQueryString($"{baseDomain}{path}", queryParams);
        }
    }
}
