using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for creating and getting deployments
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("/designer/api/v1/{org}/{app}/[controller]")]
    public class DeploymentsController : ControllerBase
    {
        private readonly IDeploymentService _deploymentService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="deploymentService">IDeploymentService</param>
        public DeploymentsController(IDeploymentService deploymentService)
        {
            _deploymentService = deploymentService;
        }

        /// <summary>
        /// Gets deployments based on a query
        /// </summary>
        /// <param name="query">Document query model</param>
        /// <returns>SearchResults of type DeploymentEntity</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<SearchResults<DeploymentEntity>> Get([FromQuery]DocumentQueryModel query)
            => await _deploymentService.GetAsync(query);

        /// <summary>
        /// Creates a release
        /// </summary>
        /// <param name="createDeployment">Release model</param>
        /// <returns>Created release</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<DeploymentEntity>> Create([FromBody]CreateDeploymentRequestViewModel createDeployment)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(string.Empty, await _deploymentService.CreateAsync(createDeployment.ToDomainModel()));
        }
    }
}
