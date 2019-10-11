using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

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
        public ReleaseService(
            IDocumentDbRepository docDbRepository,
            IHttpContextAccessor httpContextAccessor,
            IAzureDevOpsBuildService azureDevOpsBuildService,
            ISourceControl sourceControl)
        {
            _docDbRepository = docDbRepository;
            _azureDevOpsBuildService = azureDevOpsBuildService;
            _sourceControl = sourceControl;
            _httpContext = httpContextAccessor.HttpContext;
            _org = _httpContext.GetRouteValue("org").ToString();
            _app = _httpContext.GetRouteValue("app").ToString();
        }

        /// <inheritdoc/>
        public async Task<ReleaseDocument> Create(ReleaseDocument release)
        {
            PopulateFieldsInRelease(release);
            Build queuedBuild = await _azureDevOpsBuildService.QueueAsync(
                release.TargetCommitish,
                release.Org,
                release.App,
                _sourceControl.GetDeployToken());

            release.Build = new BuildDocument
            {
                Id = queuedBuild.Id.ToString(),
                Status = queuedBuild.Status.ToString(),
                Started = queuedBuild.StartTime
            };

            return await _docDbRepository.CreateAsync(release);
        }

        /// <inheritdoc/>
        public async Task<DocumentResults<ReleaseDocument>> Get(DocumentQueryModel query)
        {
            query.Org = _org;
            query.App = _app;
            var results = await _docDbRepository.GetAsync<ReleaseDocument>(query);
            return new DocumentResults<ReleaseDocument>
            {
                Results = results
            };
        }

        /// <inheritdoc/>
        public async Task Update(ReleaseDocument release)
        {
            ReleaseDocument releaseDocument = await _docDbRepository.GetAsync<ReleaseDocument>(release.Id);

            releaseDocument.Build.Status = release.Build.Status;
            releaseDocument.Build.Started = release.Build.Started;
            releaseDocument.Build.Finished = release.Build.Finished;

            await _docDbRepository.UpdateAsync(releaseDocument);
        }

        private void PopulateFieldsInRelease(ReleaseDocument release)
        {
            release.Org = _org;
            release.App = _app;
            release.CreatedBy = _httpContext.User.Identity.Name;
        }
    }
}
