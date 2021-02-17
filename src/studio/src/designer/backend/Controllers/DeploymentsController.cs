using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
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
        private readonly IGitea _giteaService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="deploymentService">IDeploymentService</param>
        /// <param name="giteaService">IGiteaService</param>
        public DeploymentsController(IDeploymentService deploymentService, IGitea giteaService)
        {
            _deploymentService = deploymentService;
            _giteaService = giteaService;
        }

        /// <summary>
        /// Gets deployments based on a query
        /// </summary>
        /// <param name="query">Document query model</param>
        /// <returns>SearchResults of type DeploymentEntity</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<SearchResults<DeploymentEntity>> Get([FromQuery] DocumentQueryModel query)
            => await _deploymentService.GetAsync(query);

        /// <summary>
        /// Gets list of environments the user can deploy to.
        /// </summary>
        /// <returns>List of environment names</returns>
        [HttpGet]
        [Route("permissions")]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<List<string>> Permissions([FromRoute] string org)
        {
            List<string> permittedEnvironments;

            List<Team> teams = await _giteaService.GetTeams();
            permittedEnvironments = teams.Where(t =>
            t.Organization.Username.Equals(org, System.StringComparison.OrdinalIgnoreCase)
            && t.Name.StartsWith("Deploy-", System.StringComparison.OrdinalIgnoreCase))
                .Select(t => t.Name.Split('-')[1])
                .ToList();

            return permittedEnvironments;
        }

        /// <summary>
        /// Creates a release
        /// </summary>
        /// <param name="createDeployment">Release model</param>
        /// <returns>Created release</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<DeploymentEntity>> Create([FromBody] CreateDeploymentRequestViewModel createDeployment)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            return Created(string.Empty, await _deploymentService.CreateAsync(createDeployment.ToDomainModel()));
        }
    }
}
