using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
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
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="query">Document query model</param>
        /// <returns>SearchResults of type DeploymentEntity</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<SearchResults<DeploymentEntity>> Get(string org, string app, [FromQuery] DocumentQueryModel query)
        {
            SearchResults<DeploymentEntity> deployments = await _deploymentService.GetAsync(org, app, query);
            List<DeploymentEntity> laggingDeployments = deployments.Results.Where(d => d.Build.Status.Equals(BuildStatus.InProgress) && d.Build.Started.Value.AddMinutes(5) < DateTime.UtcNow).ToList();

            foreach (DeploymentEntity deployment in laggingDeployments)
            {
                await _deploymentService.UpdateAsync(deployment.Build.Id, deployment.Org);
            }

            return deployments;
        }

        /// <summary>
        /// Gets list of environments the user can deploy to.
        /// </summary>
        /// <returns>List of environment names</returns>
        [HttpGet]
        [Route("permissions")]
        public async Task<List<string>> Permissions([FromRoute] string org)
        {
            List<string> permittedEnvironments;

            List<Team> teams = await _giteaService.GetTeams();
            permittedEnvironments = teams.Where(t =>
            t.Organization.Username.Equals(org, StringComparison.OrdinalIgnoreCase)
            && t.Name.StartsWith("Deploy-", StringComparison.OrdinalIgnoreCase))
                .Select(t => t.Name.Split('-')[1])
                .ToList();

            return permittedEnvironments;
        }

        /// <summary>
        /// Creates a deployment
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="createDeployment">Release model</param>
        /// <returns>Created deployment</returns>
        [HttpPost]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
        public async Task<ActionResult<DeploymentEntity>> Create(string org, string app, [FromBody] CreateDeploymentRequestViewModel createDeployment)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            return Created(string.Empty, await _deploymentService.CreateAsync(org, app, createDeployment.ToDomainModel()));
        }
    }
}
