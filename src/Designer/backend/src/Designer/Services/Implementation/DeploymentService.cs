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
            AlertsSettings alertsSettings)
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
            _timeProvider = timeProvider;
            _gitOpsConfigurationManager = gitOpsConfigurationManager;
            _featureManager = featureManager;
            _runtimeGatewayClient = runtimeGatewayClient;
            _slackClient = slackClient;
            _alertsSettings = alertsSettings;
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(AltinnAuthenticatedRepoEditingContext authenticatedContext, DeploymentModel deployment)
        {
            var traceContext = GetCurrentTraceContext();
            DeploymentEntity deploymentEntity = new();
            deploymentEntity.PopulateBaseProperties(authenticatedContext.Org, authenticatedContext.Repo, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvName = deployment.EnvName;

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(authenticatedContext.Org, authenticatedContext.Repo, deploymentEntity.TagName);
            await _applicationInformationService
                .UpdateApplicationInformationAsync(authenticatedContext.Org, authenticatedContext.Repo, release.TargetCommitish, deployment.EnvName);

            bool shouldPushSyncRootImage = false;

            if (await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
            {
                shouldPushSyncRootImage = await AddAppToGitOpsRepoIfNotExists(authenticatedContext, AltinnRepoName.FromName(authenticatedContext.Repo), AltinnEnvironment.FromName(deployment.EnvName));
            }

            bool useGitOpsDefinition = await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy);
            Build queuedBuild = await QueueDeploymentBuild(
                release,
                deploymentEntity,
                deployment.EnvName,
                shouldPushSyncRootImage,
                useGitOpsDefinition,
                traceContext.TraceParent,
                traceContext.TraceState
            );

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };


            var createdEntity = await _deploymentRepository.Create(deploymentEntity);

            await _deployEventRepository.AddAsync(authenticatedContext.Org, deploymentEntity.Build.Id, new DeployEvent
            {
                EventType = DeployEventType.PipelineScheduled,
                Message = $"Pipeline {queuedBuild.Id} scheduled",
                Timestamp = _timeProvider.GetUtcNow()
            });

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

        private async Task<bool> AddAppToGitOpsRepoIfNotExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, AltinnRepoName app, AltinnEnvironment environment)
        {
            AltinnOrgEditingContext orgContext = authenticatedContext.OrgEditingContext;
            AltinnRepoEditingContext repoContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(orgContext.Org, app.Name, orgContext.Developer);

            await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(orgContext, environment);

            bool appAlreadyExists =
                await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(orgContext, app, environment);

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
        public async Task<SearchResults<DeploymentEntity>> GetAsync(string org, string app, DocumentQueryModel query, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            List<DeploymentEntity> deploymentEntities = (await _deploymentRepository.Get(org, app, query)).ToList();

            IEnumerable<EnvironmentModel> environments = await _environmentsService.GetOrganizationEnvironments(org);
            List<string> environmentNames = environments.Select(environment => environment.Name).ToList();

            return new SearchResults<DeploymentEntity> { Results = deploymentEntities.Where(item => environmentNames.Contains(item.EnvName)).ToList() };
        }

        public async Task UndeployAsync(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env)
        {
            Guard.AssertValidEnvironmentName(env);
            var traceContext = GetCurrentTraceContext();
            GitOpsManagementBuildParameters gitOpsManagementBuildParameters = new()
            {
                AppOwner = authenticatedContext.Org,
                AppRepo = authenticatedContext.Repo,
                AppEnvironment = env,
                AltinnStudioHostname = _generalSettings.HostName,
                AppDeployToken = authenticatedContext.DeveloperAppToken,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                TraceParent = traceContext.TraceParent,
                TraceState = traceContext.TraceState
            };

            // find the deployed tag
            DeploymentEntity lastDeployed = await _deploymentRepository.GetLastDeployed(authenticatedContext.Org, authenticatedContext.Repo, env);

            bool useGitOpsDecommission = await ShouldUseGitOpsDecommission(authenticatedContext, env);
            int definitionId = useGitOpsDecommission
                ? _azureDevOpsSettings.GitOpsManagerDefinitionId
                : _azureDevOpsSettings.DecommissionDefinitionId;

            var build = await _azureDevOpsBuildClient.QueueAsync(gitOpsManagementBuildParameters, definitionId);

            DeploymentEntity deploymentEntity = new()
            {
                EnvName = env,
                DeploymentType = DeploymentType.Decommission,
                TagName = lastDeployed.TagName,
                Build = new BuildEntity
                {
                    Id = build.Id.ToString(),
                    Status = build.Status,
                    Started = build.StartTime
                }
            };
            deploymentEntity.PopulateBaseProperties(authenticatedContext, _timeProvider);

            await _deploymentRepository.Create(deploymentEntity);

            await _deployEventRepository.AddAsync(authenticatedContext.Org, deploymentEntity.Build.Id, new DeployEvent
            {
                EventType = useGitOpsDecommission ? DeployEventType.PipelineScheduled : DeployEventType.DeprecatedPipelineScheduled,
                Message = $"Undeploy pipeline {build.Id} scheduled",
                Timestamp = _timeProvider.GetUtcNow()
            });

            await PublishDeploymentPipelineQueued(
                authenticatedContext,
                build,
                PipelineType.Undeploy,
                env,
                traceContext.TraceParent,
                traceContext.TraceState
            );
        }

        private async Task<bool> ShouldUseGitOpsDecommission(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env)
        {
            if (!await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
            {
                return false;
            }

            bool removedFromGitOps = await RemoveAppFromGitOpsRepoIfExists(authenticatedContext, env);
            if (removedFromGitOps)
            {
                return true;
            }

            var environment = AltinnEnvironment.FromName(env);
            return await _runtimeGatewayClient.IsAppDeployedWithGitOpsAsync(
                authenticatedContext.Org,
                authenticatedContext.Repo,
                environment,
                CancellationToken.None);
        }

        private async Task<bool> RemoveAppFromGitOpsRepoIfExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env)
        {
            var orgContext = AltinnOrgEditingContext.FromOrgDeveloper(authenticatedContext.Org, authenticatedContext.Developer);

            if (!await _gitOpsConfigurationManager.GitOpsConfigurationExistsAsync(orgContext))
            {
                return false;
            }
            var environment = AltinnEnvironment.FromName(env);
            await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(orgContext, environment);

            var appName = AltinnRepoName.FromName(authenticatedContext.Repo);

            bool appExistsInGitOps = await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(orgContext, appName, environment);

            if (!appExistsInGitOps)
            {
                return false;
            }

            await _gitOpsConfigurationManager.RemoveAppFromGitOpsEnvironmentConfigurationAsync(authenticatedContext, environment);
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
            await _mediatr.Publish(new DeploymentPipelineQueued
            {
                EditingContext = editingContext,
                BuildId = build.Id,
                PipelineType = pipelineType,
                Environment = environment,
                TraceParent = traceParent,
                TraceState = traceState
            });

        /// <inheritdoc/>
        public async Task PublishSyncRootAsync(AltinnOrgEditingContext editingContext, AltinnEnvironment environment, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var traceContext = GetCurrentTraceContext();
            GitOpsManagementBuildParameters buildParameters = new()
            {
                AppOwner = editingContext.Org,
                AppEnvironment = environment.Name,
                AltinnStudioHostname = _generalSettings.HostName,
                AppDeployToken = await _httpContext.GetDeveloperAppTokenAsync(),
                GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                TraceParent = traceContext.TraceParent,
                TraceState = traceContext.TraceState
            };

            await _azureDevOpsBuildClient.QueueAsync(buildParameters, _azureDevOpsSettings.GitOpsManagerDefinitionId);
        }

        private async Task<Build> QueueDeploymentBuild(
            ReleaseEntity release,
            DeploymentEntity deploymentEntity,
            string envName,
            bool shouldPushSyncRootImage,
            bool useGitOpsDefinition,
            string traceParent,
            string traceState)
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
                TraceState = traceState
            };
            if (shouldPushSyncRootImage)
            {
                queueBuildParameters.PushSyncRootGitopsImage = "true";
            }

            int definitionId = useGitOpsDefinition
                ? _azureDevOpsSettings.GitOpsManagerDefinitionId
                : _azureDevOpsSettings.DeployDefinitionId;

            return await _azureDevOpsBuildClient.QueueAsync(queueBuildParameters, definitionId);
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
        public async Task SendToSlackAsync(string org, AltinnEnvironment environment, string app, DeployEventType eventType, string buildId, DateTimeOffset? startedDate, CancellationToken cancellationToken)
        {
            if (eventType == DeployEventType.InstallSucceeded || eventType == DeployEventType.UpgradeSucceeded || eventType == DeployEventType.UninstallSucceeded)
            {
                return;
            }

            string studioEnv = _generalSettings.OriginEnvironment;

            var links = new List<SlackText>
            {
                new() { Type = "mrkdwn", Text = $"<{GrafanaPodLogsUrl(org, environment, app, startedDate, _timeProvider.GetUtcNow())}|Grafana>" },
            };

            if (!string.IsNullOrWhiteSpace(buildId))
            {
                links.Add(new SlackText { Type = "mrkdwn", Text = $"<https://dev.azure.com/brreg/altinn-studio/_build/results?buildId={buildId}&view=logs|Build log>" });
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
                    new SlackBlock
                    {
                        Type = "context",
                        Elements = links,
                    },
                ],
            };

            try
            {
                await _slackClient.SendMessageAsync(_alertsSettings.GetSlackWebhookUrl(environment), message, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Failed to send Slack deploy notification");
            }
        }

        private static string GrafanaPodLogsUrl(string org, AltinnEnvironment environment, string app, DateTimeOffset? startedDate, DateTimeOffset finishedDate)
        {
            var baseDomain = environment.IsProd() ? $"https://{org}.apps.altinn.no" : $"https://{org}.apps.tt02.altinn.no";

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
