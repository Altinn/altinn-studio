#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
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
    [Route(
        "/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/deployments"
    )]
    public class DeploymentsController : ControllerBase
    {
        private readonly IDeploymentService _deploymentService;
        private readonly IGiteaClient _giteaClient;
        private readonly IKubernetesDeploymentsService _kubernetesDeploymentsService;

        public DeploymentsController(
            IDeploymentService deploymentService,
            IGiteaClient giteaClient,
            IKubernetesDeploymentsService kubernetesDeploymentsService
        )
        {
            _deploymentService = deploymentService;
            _giteaClient = giteaClient;
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
        public async Task<DeploymentsResponse> Get(
            string org,
            string app,
            [FromQuery] DocumentQueryModel query,
            CancellationToken cancellationToken
        )
        {
            SearchResults<DeploymentEntity> deployments = await _deploymentService.GetAsync(
                org,
                app,
                query,
                cancellationToken
            );

            List<KubernetesDeployment> kubernetesDeploymentList =
                await _kubernetesDeploymentsService.GetAsync(org, app, cancellationToken);

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
            List<Team> teams = await _giteaClient.GetTeams();
            List<string> permittedEnvironments = teams
                .Where(t =>
                    t.Organization.Username.Equals(org, StringComparison.OrdinalIgnoreCase)
                    && (
                        t.Name.StartsWith("Deploy-", StringComparison.OrdinalIgnoreCase)
                        || t.Name.Equals("Owners")
                    )
                )
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
        /// <param name="publishServiceResource">Temporary flag to enable resource publishing for frontend feature flagged testing</param>
        /// <returns>Created deployment</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<DeploymentEntity>> Create(
            string org,
            string app,
            [FromBody] CreateDeploymentRequestViewModel createDeployment,
            [FromQuery] bool publishServiceResource
        )
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            string token = await HttpContext.GetDeveloperAppTokenAsync();
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAuthenticatedRepoEditingContext authenticatedContext =
                AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(
                    org,
                    app,
                    developer,
                    token
                );

            var createResult = await _deploymentService.CreateAsync(
                authenticatedContext,
                createDeployment.ToDomainModel(),
                publishServiceResource);
            return Created(String.Empty, createResult);
    }

        /// <summary>
        /// Initiates the undeployment of an application from a specific environment
        /// </summary>
        /// <param name="org">Organisation name</param>
        /// <param name="app">Application name</param>
        /// <param name="undeployRequest">Undeployment request containing the target environment</param>
        /// <returns>Accepted response with tracking information</returns>
        [HttpPost("undeploy")]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        public async Task<IActionResult> Undeploy(
            string org,
            string app,
            [FromBody] UndeployRequest undeployRequest
        )
        {
            Guard.AssertValidEnvironmentName(undeployRequest.Environment);
            string token = await HttpContext.GetDeveloperAppTokenAsync();
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAuthenticatedRepoEditingContext authenticatedContext =
                AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(
                    org,
                    app,
                    developer,
                    token
                );
            await _deploymentService.UndeployAsync(
                authenticatedContext,
                undeployRequest.Environment
            );

            return Accepted();
        }
    }
}
