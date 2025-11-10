#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
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
    [Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/deployments")]
    public class DeploymentsController : ControllerBase
    {
        private readonly IDeploymentService _deploymentService;
        private readonly IGitea _giteaService;
        private readonly IKubernetesDeploymentsService _kubernetesDeploymentsService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="deploymentService">IDeploymentService</param>
        /// <param name="giteaService">IGiteaService</param>
        /// <param name="kubernetesDeploymentsService">IKubernetesDeploymentsService</param>
        public DeploymentsController(IDeploymentService deploymentService, IGitea giteaService, IKubernetesDeploymentsService kubernetesDeploymentsService)
        {
            _deploymentService = deploymentService;
            _giteaService = giteaService;
            _kubernetesDeploymentsService = kubernetesDeploymentsService;
        }

        /// <summary>
        /// Gets deployments based on a query
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="query">Document query model</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>List of Pipeline deployments and Kubernete deployments</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<DeploymentsResponse> Get(string org, string app, [FromQuery] DocumentQueryModel query, CancellationToken cancellationToken)
        {
            SearchResults<DeploymentEntity> deployments = await _deploymentService.GetAsync(org, app, query, cancellationToken);

            List<KubernetesDeployment> kubernetesDeploymentList = await _kubernetesDeploymentsService.GetAsync(org, app, cancellationToken);

            return new DeploymentsResponse
            {
                PipelineDeploymentList = deployments.Results.ToList(),
                KubernetesDeploymentList = kubernetesDeploymentList,
            };
        }

        /// <summary>
        /// Gets list of environments the user can deploy to.
        /// </summary>
        /// <returns>List of environment names</returns>
        [HttpGet]
        [Route("permissions")]
        public async Task<ActionResult<List<string>>> Permissions([FromRoute] string org)
        {
            // Add Owners to permitted environments so that users in Owners team can see deploy page with
            // all environments even though they are not in Deploy-<env> team and cannot deploy to the environment.
            List<Team> teams = await _giteaService.GetTeams();
            List<string> permittedEnvironments = teams.Where(t =>
                        t.Organization.Username.Equals(org, StringComparison.OrdinalIgnoreCase)
                        && (t.Name.StartsWith("Deploy-", StringComparison.OrdinalIgnoreCase) || t.Name.Equals("Owners")))
                    .Select(t => t.Name.Equals("Owners") ? t.Name : t.Name.Split('-')[1])
                    .ToList();

            return Ok(permittedEnvironments);
        }

        /// <summary>
        /// Creates a deployment
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="createDeployment">Release model</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Created deployment</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<DeploymentEntity>> Create(string org, string app, [FromBody] CreateDeploymentRequestViewModel createDeployment, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            return Created(string.Empty, await _deploymentService.CreateAsync(org, app, createDeployment.ToDomainModel(), cancellationToken));
        }

        /// <summary>
        /// Initiates the undeployment of an application from a specific environment
        /// </summary>
        /// <param name="org">Organisation name</param>
        /// <param name="app">Application name</param>
        /// <param name="undeployRequest">Undeployment request containing the target environment</param>
        /// <param name="cancellationToken">Cancellation token to abort the operation</param>
        /// <returns>Accepted response with tracking information</returns>
        [HttpPost("undeploy")]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        public async Task<IActionResult> Undeploy(string org, string app, [FromBody] UndeployRequest undeployRequest, CancellationToken cancellationToken)
        {
            Guard.AssertValidEnvironmentName(undeployRequest.Environment);

            await _deploymentService.UndeployAsync(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, AuthenticationHelper.GetDeveloperUserName(HttpContext)), undeployRequest.Environment, cancellationToken);

            return Accepted();
        }

    }
}
