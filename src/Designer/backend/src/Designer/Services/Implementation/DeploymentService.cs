#nullable disable
using System;
using System.Collections.Generic;
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
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using MediatR;
using Microsoft.AspNetCore.Http;
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
            IRuntimeGatewayClient runtimeGatewayClient)
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
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(AltinnAuthenticatedRepoEditingContext authenticatedContext, string app, DeploymentModel deployment, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            DeploymentEntity deploymentEntity = new();
            deploymentEntity.PopulateBaseProperties(authenticatedContext.Org, app, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvName = deployment.EnvName;

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(authenticatedContext.Org, app, deploymentEntity.TagName);
            await _applicationInformationService
                .UpdateApplicationInformationAsync(authenticatedContext.Org, app, release.TargetCommitish, deployment.EnvName, cancellationToken);

            bool shouldPushSyncRootImage = false;

            if (await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
            {
                shouldPushSyncRootImage = await AddAppToGitOpsRepoIfNotExists(authenticatedContext, AltinnRepoName.FromName(app), AltinnEnvironment.FromName(deployment.EnvName));
            }

            bool useGitOpsDefinition = await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy);
            Build queuedBuild = await QueueDeploymentBuild(release, deploymentEntity, deployment.EnvName, shouldPushSyncRootImage, useGitOpsDefinition);

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
            }, cancellationToken);

            await PublishDeploymentPipelineQueued(AltinnRepoEditingContext.FromOrgRepoDeveloper(authenticatedContext.Org, app, deploymentEntity.CreatedBy), queuedBuild, PipelineType.Deploy, deployment.EnvName, CancellationToken.None);
            return createdEntity;
        }

        private async Task<bool> AddAppToGitOpsRepoIfNotExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, AltinnRepoName app, AltinnEnvironment environment)
        {
            await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(authenticatedContext, environment);

            AltinnOrgEditingContext orgContext = authenticatedContext.OrgEditingContext;
            AltinnRepoEditingContext repoContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(orgContext.Org, app.Name, orgContext.Developer);

            bool appAlreadyExists =
                await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(orgContext, app, environment);

            if (appAlreadyExists)
            {
                return false;
            }

            await _gitOpsConfigurationManager.AddAppToGitOpsConfigurationAsync(repoContext, environment);

            await _gitOpsConfigurationManager.PersistGitOpsConfigurationAsync(orgContext, environment);
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

        public async Task UndeployAsync(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env,
            CancellationToken cancellationToken = default)
        {
            Guard.AssertValidEnvironmentName(env);
            GitOpsManagementBuildParameters gitOpsManagementBuildParameters = new()
            {
                AppOwner = authenticatedContext.Org,
                AppRepo = authenticatedContext.Repo,
                AppEnvironment = env,
                AltinnStudioHostname = _generalSettings.HostName,
                AppDeployToken = authenticatedContext.DeveloperAppToken,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos"
            };

            // find the deployed tag
            DeploymentEntity lastDeployed = await _deploymentRepository.GetLastDeployed(authenticatedContext.Org, authenticatedContext.Repo, env);

            bool useGitOpsDecommission = await ShouldUseGitOpsDecommission(authenticatedContext, env, cancellationToken);
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
            }, cancellationToken);

            await PublishDeploymentPipelineQueued(authenticatedContext, build, PipelineType.Undeploy, env, CancellationToken.None);
        }

        private async Task<bool> ShouldUseGitOpsDecommission(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env, CancellationToken cancellationToken)
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
                cancellationToken);
        }

        private async Task<bool> RemoveAppFromGitOpsRepoIfExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env)
        {
            var orgContext = AltinnOrgEditingContext.FromOrgDeveloper(authenticatedContext.Org, authenticatedContext.Developer);

            if (!await _gitOpsConfigurationManager.GitOpsConfigurationExistsAsync(orgContext))
            {
                return false;
            }
            var environment = AltinnEnvironment.FromName(env);
            await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(authenticatedContext, environment);

            var appName = AltinnRepoName.FromName(authenticatedContext.Repo);

            bool appExistsInGitOps = await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(orgContext, appName, environment);

            if (!appExistsInGitOps)
            {
                return false;
            }

            await _gitOpsConfigurationManager.RemoveAppFromGitOpsEnvironmentConfigurationAsync(authenticatedContext, environment);
            await _gitOpsConfigurationManager.PersistGitOpsConfigurationAsync(orgContext, environment);

            return true;
        }

        private async Task PublishDeploymentPipelineQueued(AltinnRepoEditingContext editingContext, Build build, PipelineType pipelineType, string environment,
            CancellationToken cancellationToken) =>
            await _mediatr.Publish(new DeploymentPipelineQueued
            {
                EditingContext = editingContext,
                BuildId = build.Id,
                PipelineType = pipelineType,
                Environment = environment
            }, cancellationToken);

        /// <inheritdoc/>
        public async Task PublishSyncRootAsync(AltinnOrgEditingContext editingContext, AltinnEnvironment environment, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            GitOpsManagementBuildParameters buildParameters = new()
            {
                AppOwner = editingContext.Org,
                AppEnvironment = environment.Name,
                AltinnStudioHostname = _generalSettings.HostName,
                AppDeployToken = await _httpContext.GetDeveloperAppTokenAsync(),
                GiteaEnvironment = $"{_generalSettings.HostName}/repos"
            };

            await _azureDevOpsBuildClient.QueueAsync(buildParameters, _azureDevOpsSettings.GitOpsManagerDefinitionId);
        }

        private async Task<Build> QueueDeploymentBuild(
            ReleaseEntity release,
            DeploymentEntity deploymentEntity,
            string envName,
            bool shouldPushSyncRootImage,
            bool useGitOpsDefinition)
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
                AltinnStudioHostname = _generalSettings.HostName
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
    }
}
