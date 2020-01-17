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
        private readonly ReleaseRepository _releaseRepository;
        private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly HttpContext _httpContext;
        private readonly string _org;
        private readonly string _app;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="releaseRepository">Document db repository</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        /// <param name="azureDevOpsBuildClient">IAzureDevOpsBuildClient</param>
        /// <param name="azureDevOpsOptions">IOptionsMonitor of Type AzureDevOpsSettings</param>
        public ReleaseService(
            ReleaseRepository releaseRepository,
            IHttpContextAccessor httpContextAccessor,
            IAzureDevOpsBuildClient azureDevOpsBuildClient,
            IOptionsMonitor<AzureDevOpsSettings> azureDevOpsOptions)
        {
            _azureDevOpsSettings = azureDevOpsOptions.CurrentValue;
            _releaseRepository = releaseRepository;
            _azureDevOpsBuildClient = azureDevOpsBuildClient;
            _httpContext = httpContextAccessor.HttpContext;
            _org = _httpContext.GetRouteValue("org")?.ToString();
            _app = _httpContext.GetRouteValue("app")?.ToString();
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

            return await _releaseRepository.CreateAsync(release);
        }

        /// <inheritdoc/>
        public async Task<SearchResults<ReleaseEntity>> GetAsync(DocumentQueryModel query)
        {
            query.Org = _org;
            query.App = _app;
            IEnumerable<ReleaseEntity> results = await _releaseRepository.GetAsync<ReleaseEntity>(query);
            return new SearchResults<ReleaseEntity>
            {
                Results = results
            };
        }

        /// <inheritdoc/>
        public async Task UpdateAsync(ReleaseEntity release)
        {
            SqlQuerySpec sqlQuerySpec = new SqlQuerySpec
            {
                QueryText = "SELECT * FROM db WHERE db.build.id = @buildId",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@buildId", release.Build.Id),
                }
            };
            IEnumerable<ReleaseEntity> releaseDocuments = await _releaseRepository.GetWithSqlAsync<ReleaseEntity>(sqlQuerySpec);
            ReleaseEntity releaseEntity = releaseDocuments.Single();

            releaseEntity.Build.Status = release.Build.Status;
            releaseEntity.Build.Result = release.Build.Result;
            releaseEntity.Build.Started = release.Build.Started;
            releaseEntity.Build.Finished = release.Build.Finished;

            await _releaseRepository.UpdateAsync(releaseEntity);
        }

        private async Task ValidateUniquenessOfRelease(ReleaseEntity release)
        {
            SqlQuerySpec sqlQuery = CreateSqlQueryForUniqueness(release);
            IEnumerable<ReleaseEntity> existingReleaseEntity = await _releaseRepository.GetWithSqlAsync<ReleaseEntity>(sqlQuery);
            if (existingReleaseEntity.Any())
            {
                throw new HttpRequestWithStatusException("A release with the same properties already exist.")
                {
                    StatusCode = HttpStatusCode.Conflict
                };
            }
        }

        private SqlQuerySpec CreateSqlQueryForUniqueness(ReleaseEntity release)
        {
            string resultSucceeded = BuildResult.Succeeded.ToEnumMemberAttributeValue();
            string statusInProgress = BuildStatus.InProgress.ToEnumMemberAttributeValue();
            string statusNotStarted = BuildStatus.NotStarted.ToEnumMemberAttributeValue();
            string queryString = "SELECT * FROM db WHERE " +
                                 "db.org = @org AND " +
                                 "db.app = @app AND " +
                                 "db.tagName = @tagName AND (" +
                                 $"db.build.result = '{resultSucceeded}' OR " +
                                 $"db.build.status = '{statusInProgress}' OR " +
                                 $"db.build.status = '{statusNotStarted}')";
            return new SqlQuerySpec
            {
                QueryText = queryString,
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@org", _org),
                    new SqlParameter("@app", _app),
                    new SqlParameter("@tagName", release.TagName),
                }
            };
        }
    }
}
