using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
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
using Microsoft.AspNetCore.Routing;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Rest.TransientFaultHandling;
using SqlParameter = Microsoft.Azure.Documents.SqlParameter;
using SqlParameterCollection = Microsoft.Azure.Documents.SqlParameterCollection;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// The business logic service for release
    /// </summary>
    public class ReleaseService : IReleaseService
    {
        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private IReleaseRepositoryPostgres _releaseRepositoryPostgres;
        private readonly HttpContext _httpContext;
        private readonly string _org;
        private readonly string _app;
        private readonly ILogger _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        /// <param name="azureDevOpsBuildClient">IAzureDevOpsBuildClient</param>
        /// <param name="releaseRepositoryPostgres">IReleaseRepositoryPostgres</param>
        /// <param name="azureDevOpsOptions">IOptionsMonitor of Type AzureDevOpsSettings</param>
        /// <param name="logger">The logger.</param>
        public ReleaseService(
            IHttpContextAccessor httpContextAccessor,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IReleaseRepositoryPostgres releaseRepositoryPostgres,
            IOptionsMonitor<AzureDevOpsSettings> azureDevOpsOptions,
            ILogger<ReleaseService> logger)
        {
            _azureDevOpsSettings = azureDevOpsOptions.CurrentValue;
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _releaseRepositoryPostgres = releaseRepositoryPostgres;
            _httpContext = httpContextAccessor.HttpContext;
            _org = _httpContext.GetRouteValue("org")?.ToString();
            _app = _httpContext.GetRouteValue("app")?.ToString();
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<ReleaseEntity> CreateAsync(ReleaseEntity release)
        {
            release.PopulateBaseProperties(_org, _app, _httpContext);

            await ValidateUniquenessOfRelease(release);

            QueueBuildParameters queueBuildParameters = new QueueBuildParameters
            {
                AppCommitId = release.TargetCommitish,
                AppOwner = release.Org,
                AppRepo = release.App,
                TagName = release.TagName
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

            return await _releaseRepositoryPostgres.Create(release);
        }

        /// <inheritdoc/>
        public async Task<SearchResults<ReleaseEntity>> GetAsync(DocumentQueryModel query)
        {
            query.Org = _org;
            query.App = _app;

            IEnumerable<ReleaseEntity> results = await _releaseRepositoryPostgres.Get(query);
            return new SearchResults<ReleaseEntity>
            {
                Results = results
            };
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(ReleaseEntity release, string appOwner)
        {
            IEnumerable<ReleaseEntity> releaseDocuments = await _releaseRepositoryPostgres.Get(appOwner, release.Build.Id);
            ReleaseEntity releaseEntity = releaseDocuments.Single();

            releaseEntity.Build.Status = release.Build.Status;
            releaseEntity.Build.Result = release.Build.Result;
            releaseEntity.Build.Started = release.Build.Started;
            releaseEntity.Build.Finished = release.Build.Finished;

            await _releaseRepositoryPostgres.Update(releaseEntity);
        }

        private async Task ValidateUniquenessOfRelease(ReleaseEntity release)
        {
            List<string> buildStatus = new List<string>();
            buildStatus.Add(BuildStatus.InProgress.ToEnumMemberAttributeValue());
            buildStatus.Add(BuildStatus.NotStarted.ToEnumMemberAttributeValue());

            List<string> buildResult = new List<string>();
            buildResult.Add(BuildResult.Succeeded.ToEnumMemberAttributeValue());

            IEnumerable<ReleaseEntity> existingReleaseEntity = await _releaseRepositoryPostgres.Get(release.Org, release.App, release.TagName, buildStatus, buildResult);
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
