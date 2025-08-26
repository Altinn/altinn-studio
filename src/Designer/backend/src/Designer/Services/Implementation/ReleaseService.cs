using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// The business logic service for release
    /// </summary>
    public class ReleaseService : IReleaseService
    {
        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly IReleaseRepository _releaseRepository;
        private readonly HttpContext _httpContext;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        /// <param name="azureDevOpsBuildClient">IAzureDevOpsBuildClient</param>
        /// <param name="releaseRepository">IReleaseRepository</param>
        /// <param name="azureDevOpsOptions">AzureDevOpsSettings</param>
        /// <param name="generalSettings"></param>
        public ReleaseService(
            IHttpContextAccessor httpContextAccessor,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IReleaseRepository releaseRepository,
            AzureDevOpsSettings azureDevOpsOptions,
            GeneralSettings generalSettings)
        {
            _azureDevOpsSettings = azureDevOpsOptions;
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _releaseRepository = releaseRepository;
            _httpContext = httpContextAccessor.HttpContext;
            _generalSettings = generalSettings;
        }

        /// <inheritdoc/>
        public async Task<ReleaseEntity> CreateAsync(ReleaseEntity release)
        {
            release.PopulateBaseProperties(release.Org, release.App, _httpContext);

            await ValidateUniquenessOfRelease(release);

            QueueBuildParameters queueBuildParameters = new()
            {
                AppCommitId = release.TargetCommitish,
                AppOwner = release.Org,
                AppRepo = release.App,
                TagName = release.TagName,
                GiteaEnvironment = $"{_generalSettings.HostName}/repos",
                AppDeployToken = await _httpContext.GetDeveloperAppTokenAsync(),
                AltinnStudioHostname = _generalSettings.HostName
            };

            Build queuedBuild = await _azureDevOpsBuildClient.QueueAsync(
                queueBuildParameters,
                _azureDevOpsSettings.BuildDefinitionId);

            release.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Result = BuildResult.None,
                Started = queuedBuild.StartTime
            };

            return await _releaseRepository.Create(release);
        }

        /// <inheritdoc/>
        public async Task<SearchResults<ReleaseEntity>> GetAsync(string org, string app, DocumentQueryModel query)
        {

            IEnumerable<ReleaseEntity> results = await _releaseRepository.Get(org, app, query);
            return new SearchResults<ReleaseEntity>
            {
                Results = results
            };
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(string buildNumber, string appOwner)
        {
            IEnumerable<ReleaseEntity> releaseDocuments = await _releaseRepository.Get(appOwner, buildNumber);
            ReleaseEntity releaseEntity = releaseDocuments.Single();

            BuildEntity buildEntity = await _azureDevOpsBuildClient.Get(buildNumber);
            ReleaseEntity release = new() { Build = buildEntity };

            releaseEntity.Build.Status = release.Build.Status;
            releaseEntity.Build.Result = release.Build.Result;
            releaseEntity.Build.Started = release.Build.Started;
            releaseEntity.Build.Finished = release.Build.Finished;

            await _releaseRepository.Update(releaseEntity);
        }

        private async Task ValidateUniquenessOfRelease(ReleaseEntity release)
        {
            List<string> buildStatus = new()
                {
                    BuildStatus.InProgress.ToEnumMemberAttributeValue(),
                    BuildStatus.NotStarted.ToEnumMemberAttributeValue()
                };

            List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

            IEnumerable<ReleaseEntity> existingReleaseEntity = await _releaseRepository.Get(release.Org, release.App, release.TagName, buildStatus, buildResult);
            if (existingReleaseEntity.Any())
            {
                throw new HttpRequestWithStatusException("A release with the same properties already exist.")
                {
                    StatusCode = HttpStatusCode.Conflict
                };
            }
        }
    }
}
