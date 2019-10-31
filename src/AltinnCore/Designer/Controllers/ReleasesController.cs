using System.Threading.Tasks;
using AltinnCore.Designer.ModelBinding.Constants;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for creating, getting and updating releases
    /// </summary>
    [ApiController]
    [Route("/designer/api/v1/{org}/{app}/[controller]")]
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
        /// <param name="query">Document query model</param>
        /// <returns>SearchResults of type ReleaseEntity</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<SearchResults<ReleaseEntity>> Get([FromQuery]DocumentQueryModel query)
            => await _releaseService.GetAsync(query);

        /// <summary>
        /// Creates a release
        /// </summary>
        /// <param name="createRelease">Release model</param>
        /// <returns>Created release</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaPushPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<ReleaseEntity>> Create([FromBody]CreateReleaseRequestViewModel createRelease)
            => Created(string.Empty, await _releaseService.CreateAsync(createRelease.ToEntityModel()));
    }
}
