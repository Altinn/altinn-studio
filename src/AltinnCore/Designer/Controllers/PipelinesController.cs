using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Designer.ModelBinding.Constants;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps;
using AltinnCore.Designer.TypedHttpClients.AzureDevOps.Models;
using AltinnCore.Designer.ViewModels.Request;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for pipelines
    /// </summary>
    [ApiController]
    [Route("/designer/api/v1/")]
    public class PipelinesController : ControllerBase
    {
        private readonly IAzureDevOpsBuildService _buildService;
        private readonly ReleaseDbRepository _releaseDbRepository;

        /// <summary>
        /// Constructor
        /// </summary>
        public PipelinesController(
            IAzureDevOpsBuildService buildService,
            ReleaseDbRepository releaseDbRepository)
        {
            _buildService = buildService;
            _releaseDbRepository = releaseDbRepository;
        }

        /// <summary>
        /// Gets a build status from Azure DevOps and updates a specific entity
        /// </summary>
        /// <returns>Created release</returns>
        [HttpPost("checkreleasebuildstatus")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task Status(Build model)
        {
            string buildId = model.Id.ToString();
            Build build = await _buildService.Get(buildId); // insert build id here
            SqlQuerySpec sqlQuerySpec = new SqlQuerySpec
            {
                QueryText = "SELECT * FROM db WHERE db.build.id = @buildId",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@buildId", buildId) // insert build id here
                }
            };
            IEnumerable<ReleaseEntity> releases = await _releaseDbRepository.GetWithSqlAsync<ReleaseEntity>(sqlQuerySpec);
            ReleaseEntity release = releases.Single();

            release.Build.Started = build.StartTime;
            release.Build.Finished = build.FinishTime;
            release.Build.Result = build.Result;
            release.Build.Status = build.Status;

            await _releaseDbRepository.UpdateAsync(release);
        }
    }
}
