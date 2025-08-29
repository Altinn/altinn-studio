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
    [Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/releases")]
    [AutoValidateAntiforgeryToken]
    public class ReleasesController : ControllerBase
    {
        private readonly IReleaseService _releaseService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="releaseService">Release service</param>
        public ReleasesController(IReleaseService releaseService)
        {
            _releaseService = releaseService;
        }

        /// <summary>
        /// Gets releases based on a query
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="query">Document query model</param>
        /// <returns>SearchResults of type ReleaseEntity</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<SearchResults<ReleaseEntity>> Get(string org, string app, [FromQuery] DocumentQueryModel query)
        {
            SearchResults<ReleaseEntity> releases = await _releaseService.GetAsync(org, app, query);

            List<ReleaseEntity> laggingReleases = releases.Results.Where(d => d.Build.Status.Equals(BuildStatus.InProgress) && d.Build.Started.Value.AddMinutes(2) < DateTime.UtcNow).ToList();

            foreach (ReleaseEntity release in laggingReleases)
            {
                await _releaseService.UpdateAsync(release.Build.Id, release.Org);
            }

            return releases;
        }

        /// <summary>
        /// Creates a release
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="createRelease">Release model</param>
        /// <returns>Created release</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaPushPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<ReleaseEntity>> Create(string org, string app, [FromBody] CreateReleaseRequestViewModel createRelease)
        {
            ReleaseEntity release = createRelease.ToEntityModel();
            release.Org = org;
            release.App = app;

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(string.Empty, await _releaseService.CreateAsync(release));
        }
    }
}
