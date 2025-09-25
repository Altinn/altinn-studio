using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
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
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
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

        /// <summary>
        /// Constructor
        /// </summary>
        public DeploymentService(
            AzureDevOpsSettings azureDevOpsOptions,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IHttpContextAccessor httpContextAccessor,
            IDeploymentRepository deploymentRepository,
            IReleaseRepository releaseRepository,
            IEnvironmentsService environmentsService,
            IApplicationInformationService applicationInformationService,
            ILogger<DeploymentService> logger,
            IPublisher mediatr,
            GeneralSettings generalSettings, TimeProvider timeProvider, IGitOpsConfigurationManager gitOpsConfigurationManager, IFeatureManager featureManager)
        {
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _deploymentRepository = deploymentRepository;
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
        }

        /// <inheritdoc/>
        public async Task<DeploymentEntity> CreateAsync(string org, string app, DeploymentModel deployment, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            DeploymentEntity deploymentEntity = new();
            deploymentEntity.PopulateBaseProperties(org, app, _httpContext);
            deploymentEntity.TagName = deployment.TagName;
            deploymentEntity.EnvName = deployment.EnvName;

            ReleaseEntity release = await _releaseRepository.GetSucceededReleaseFromDb(org, app, deploymentEntity.TagName);

            await _applicationInformationService
                .UpdateApplicationInformationAsync(org, app, release.TargetCommitish, deployment.EnvName, cancellationToken);

            bool shouldPushSyncRootImage = false;

            if (await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
            {
                shouldPushSyncRootImage = await AddAppToGitOpsRepoIfNotExists(AltinnOrgEditingContext.FromOrgDeveloper(org, deploymentEntity.CreatedBy), AltinnRepoName.FromName(app), AltinnEnvironment.FromName(deployment.EnvName));
            }

            Build queuedBuild = await QueueDeploymentBuild(release, deploymentEntity, deployment.EnvName, shouldPushSyncRootImage);

            deploymentEntity.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };


            var createdEntity = await _deploymentRepository.Create(deploymentEntity);
            await PublishDeploymentPipelineQueued(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, deploymentEntity.CreatedBy), queuedBuild, PipelineType.Deploy, deployment.EnvName, CancellationToken.None);
            return createdEntity;
        }

        private async Task<bool> AddAppToGitOpsRepoIfNotExists(AltinnOrgEditingContext context, AltinnRepoName app, AltinnEnvironment environment)
        {
            await _gitOpsConfigurationManager.EnsureGitOpsConfigurationExistsAsync(context, environment);

            bool appAlreadyExists =
                await _gitOpsConfigurationManager.AppExistsInGitOpsConfigurationAsync(context, app, environment);

            if (appAlreadyExists)
            {
                return false;
            }

            await _gitOpsConfigurationManager.AddAppToGitOpsConfigurationAsync(AltinnRepoEditingContext.FromOrgRepoDeveloper(context.Org, app.Name, context.Developer), environment);

            await _gitOpsConfigurationManager.PersistGitOpsConfigurationAsync(context, environment);
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

        /// <inheritdoc/>
        public async Task UpdateAsync(string buildNumber, string appOwner, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            DeploymentEntity deploymentEntity = await _deploymentRepository.Get(appOwner, buildNumber);

            try
            {
                BuildEntity buildEntity = await _azureDevOpsBuildClient.Get(buildNumber);
                DeploymentEntity deployment = new() { Build = buildEntity };

                deploymentEntity.Build.Status = deployment.Build.Status;
                deploymentEntity.Build.Result = deployment.Build.Result;
                deploymentEntity.Build.Started = deployment.Build.Started;
                deploymentEntity.Build.Finished = deployment.Build.Finished;

                await _deploymentRepository.Update(deploymentEntity);
            }
            catch (HttpRequestException)
            {
                _logger.LogInformation("The requested build number {buildNumber} does not exist, updating it as failed in the database", buildNumber);
                deploymentEntity.Build.Status = BuildStatus.Completed;
                deploymentEntity.Build.Result = BuildResult.Failed;
                deploymentEntity.Build.Finished = DateTime.UtcNow;
                await _deploymentRepository.Update(deploymentEntity);
            }
        }

        public async Task UndeployAsync(AltinnRepoEditingContext editingContext, string env,
            CancellationToken cancellationToken = default)
        {
            Guard.AssertValidEnvironmentName(env);
            DecommissionBuildParameters decommissionBuildParameters = new()
            {
                AppOwner = editingContext.Org,
                AppRepo = editingContext.Repo,
                AppEnvironment = env
            };

            // find the deployed tag
            DeploymentEntity lastDeployed = await _deploymentRepository.GetLastDeployed(editingContext.Org, editingContext.Repo, env);

            var build = await _azureDevOpsBuildClient.QueueAsync(decommissionBuildParameters, _azureDevOpsSettings.DecommissionDefinitionId);

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
            deploymentEntity.PopulateBaseProperties(editingContext, _timeProvider);

            await _deploymentRepository.Create(deploymentEntity);
            await PublishDeploymentPipelineQueued(editingContext, build, PipelineType.Undeploy, env, CancellationToken.None);
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

        private async Task<Build> QueueDeploymentBuild(
            ReleaseEntity release,
            DeploymentEntity deploymentEntity,
            string envName,
            bool shouldPushSyncRootImage = false)
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

            return await _azureDevOpsBuildClient.QueueAsync(
                queueBuildParameters,
                _azureDevOpsSettings.DeployDefinitionId);
        }
    }
}
