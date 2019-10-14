using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Options;
using SqlParameter = Microsoft.Azure.Documents.SqlParameter;
using SqlParameterCollection = Microsoft.Azure.Documents.SqlParameterCollection;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// The business logic service for release
    /// </summary>
    public class ReleaseService : IReleaseService
    {
        private readonly IDocumentDbRepository _docDbRepository;
        private readonly IAzureDevOpsBuildService _azureDevOpsBuildService;
        private readonly ISourceControl _sourceControl;
        private readonly AzureDevOpsSettings _azureDevOpsSettings;
        private readonly HttpContext _httpContext;
        private readonly string _org;
        private readonly string _app;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="docDbRepository">Document db repository</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        /// <param name="azureDevOpsBuildService">IAzureDevOpsBuildService</param>
        /// <param name="sourceControl">ISourceControl</param>
        /// <param name="azureDevOpsOptions">IOptionsMonitor of Type AzureDevOpsSettings</param>
        public ReleaseService(
            IDocumentDbRepository docDbRepository,
            IHttpContextAccessor httpContextAccessor,
            IAzureDevOpsBuildService azureDevOpsBuildService,
            ISourceControl sourceControl,
            IOptionsMonitor<AzureDevOpsSettings> azureDevOpsOptions)
        {
            _azureDevOpsSettings = azureDevOpsOptions.CurrentValue;
            _docDbRepository = docDbRepository;
            _azureDevOpsBuildService = azureDevOpsBuildService;
            _sourceControl = sourceControl;
            _httpContext = httpContextAccessor.HttpContext;
            _org = _httpContext.GetRouteValue("org").ToString();
            _app = _httpContext.GetRouteValue("app").ToString();
        }

        /// <inheritdoc/>
        public async Task<ReleaseEntity> CreateAsync(ReleaseEntity release)
        {
            PopulateFieldsInRelease(release);
            Build queuedBuild = await _azureDevOpsBuildService.QueueAsync(
                release.TargetCommitish,
                release.Org,
                release.App,
                _sourceControl.GetDeployToken(),
                _azureDevOpsSettings.BuildDefinitionId);

            release.Build = new BuildEntity
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status,
                Started = queuedBuild.StartTime
            };

            return await _docDbRepository.CreateAsync(release);
        }

        /// <inheritdoc/>
        public async Task<DocumentResults<ReleaseEntity>> GetAsync(DocumentQueryModel query)
        {
            query.Org = _org;
            query.App = _app;
            IEnumerable<ReleaseEntity> results = await _docDbRepository.GetAsync<ReleaseEntity>(query);
            return new DocumentResults<ReleaseEntity>
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
            IEnumerable<ReleaseEntity> releaseDocuments = await _docDbRepository.GetWithSqlAsync<ReleaseEntity>(sqlQuerySpec);
            ReleaseEntity releaseEntity = releaseDocuments.Single();

            releaseEntity.Build.Status = release.Build.Status;
            releaseEntity.Build.Started = release.Build.Started;
            releaseEntity.Build.Finished = release.Build.Finished;

            await _docDbRepository.UpdateAsync(releaseEntity);
        }

        private void PopulateFieldsInRelease(EntityBase release)
        {
            List<Claim> claims = _httpContext.User.Claims.ToList();
            release.Org = _org;
            release.App = _app;
            release.CreatedBy = claims.FirstOrDefault(x => x.Type == AltinnCoreClaimTypes.Developer)?.Value;
        }
    }
}
