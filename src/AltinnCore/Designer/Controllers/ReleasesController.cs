using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Designer.Repository;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;
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
        /// Gets a certain number of releases
        /// </summary>
        /// <param name="query">Release query model</param>
        /// <returns></returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<DocumentResults<ReleaseDocument>> Get([FromQuery]DocumentQueryModel query)
            => await _releaseService.Get(query);

        /// <summary>
        /// Creates a release
        /// </summary>
        /// <param name="release">Release model</param>
        /// <returns>Created release</returns>
        [HttpPost]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ReleaseDocument> Create([FromBody]ReleaseRequestViewModel release)
            => await _releaseService.Create(release.ToDocumentModel());

        /// <summary>
        /// Updates a release document
        /// </summary>
        /// <param name="release">Release document</param>
        [HttpPut]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Put))]
        public async Task<IActionResult> Update([FromBody] ReleaseDocument release)
        {
            await _releaseService.Update(release);
            return NoContent();
        }
    }
}
