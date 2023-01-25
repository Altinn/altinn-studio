using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for creating, getting and updating releases
    /// </summary>
    [ApiController]
    [Route("/designer/api/v1/{org}/{app}/[controller]")]
    [AutoValidateAntiforgeryToken]
    public class ReleasesController : ControllerBase
    {
        private readonly IReleaseService _releaseService;
        private readonly IPipelineService _pipelineService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="releaseService">Release service</param>
        /// <param name="pipelineService">IPipelineService</param>
        public ReleasesController(IReleaseService releaseService, IPipelineService pipelineService)
        {
            _releaseService = releaseService;
            _pipelineService = pipelineService;
        }

        /// <summary>
        /// Gets releases based on a query
        /// </summary>
        /// <param name="query">Document query model</param>
        /// <returns>SearchResults of type ReleaseEntity</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<SearchResults<ReleaseEntity>> Get([FromQuery] DocumentQueryModel query)
        {
            SearchResults<ReleaseEntity> releases = await _releaseService.GetAsync(query);

            List<ReleaseEntity> laggingReleases = releases.Results.Where(d => d.Build.Status.Equals(BuildStatus.InProgress) && d.Build.Started.Value.AddMinutes(10) < DateTime.UtcNow).ToList();

            foreach (ReleaseEntity release in laggingReleases)
            {
                await _pipelineService.UpdateReleaseStatus(release.Build.Id, release.Org);
            }

            return releases;
        }

        /// <summary>
        /// Creates a release
        /// </summary>
        /// <param name="createRelease">Release model</param>
        /// <returns>Created release</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaPushPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<ReleaseEntity>> Create([FromBody] CreateReleaseRequestViewModel createRelease)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(string.Empty, await _releaseService.CreateAsync(createRelease.ToEntityModel()));
        }
    }
}
