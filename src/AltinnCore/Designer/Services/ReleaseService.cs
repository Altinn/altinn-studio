using System;
using System.Globalization;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Models;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

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

            return await _docDbRepository.Create(release);
        }

        private void PopulateFieldsInRelease(ReleaseDocument release)
        {
            release.Org = _httpContext.GetRouteValue("org").ToString();
            release.App = _httpContext.GetRouteValue("app").ToString();
            release.CreatedBy = _httpContext.User.Identity.Name;
        }
    }
}
