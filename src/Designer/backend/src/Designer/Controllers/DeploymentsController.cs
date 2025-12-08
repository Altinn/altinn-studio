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
using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Microsoft.AspNetCore.SignalR;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Altinn.Studio.Designer.Constants;
using Microsoft.FeatureManagement.Mvc;

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
        private readonly IGiteaClient _giteaClient;
        private readonly IKubernetesDeploymentsService _kubernetesDeploymentsService;
        private readonly IDeployEventRepository _deployEventRepository;
        private readonly IHubContext<EntityUpdatedHub, IEntityUpdateClient> _entityUpdatedHubContext;
        private readonly IDeploymentRepository _deploymentRepository;

        public DeploymentsController(IDeploymentService deploymentService, IGiteaClient giteaClient, IKubernetesDeploymentsService kubernetesDeploymentsService, IDeployEventRepository deployEventRepository, IHubContext<EntityUpdatedHub, IEntityUpdateClient> entityUpdatedHubContext, IDeploymentRepository deploymentRepository)
        {
            _deploymentService = deploymentService;
            _giteaClient = giteaClient;
            _kubernetesDeploymentsService = kubernetesDeploymentsService;
            _deployEventRepository = deployEventRepository;
            _entityUpdatedHubContext = entityUpdatedHubContext;
            _deploymentRepository = deploymentRepository;
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
            List<Team> teams = await _giteaClient.GetTeams();
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

        /// <summary>
        /// Webhook endpoint for receiving deploy events
        /// </summary>
        /// <param name="org">Organisation name</param>
        /// <param name="app">Application name</param>
        /// <param name="request">Deploy event details</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Ok response</returns>
        [HttpPost("events")]
        [AllowAnonymous]
        [IgnoreAntiforgeryToken]
        [FeatureGate(StudioFeatureFlags.GitOpsDeploy)]
        public async Task<IActionResult> ReceiveDeployEvent(string org, string app, [FromBody] DeployEventRequest request, CancellationToken cancellationToken)
        {
            if (!TryParseEventType(request.EventType, out var eventType))
            {
                return BadRequest($"Invalid event type: {request.EventType}");
            }

            var resolveResult = await TryResolveDeploymentAsync(org, app, request, eventType);
            if (resolveResult.ErrorResult != null)
            {
                return resolveResult.ErrorResult;
            }

            var deployment = resolveResult.Deployment!;
            var buildId = resolveResult.BuildId!;

            if (deployment.HasFinalEvent)
            {
                return Ok();
            }

            var deployEvent = CreateDeployEvent(eventType, request);

            await _deployEventRepository.AddAsync(org, buildId, deployEvent, cancellationToken);

            await PublishEntityUpdatedAsync(deployment);

            return Ok();
        }

        private static bool TryParseEventType(string eventTypeString, out DeployEventType eventType)
        {
            return Enum.TryParse(eventTypeString, out eventType);
        }

        private record DeploymentResolveResult(
            DeploymentEntity Deployment,
            string BuildId,
            IActionResult ErrorResult);

        private async Task<DeploymentResolveResult> TryResolveDeploymentAsync(
            string org,
            string app,
            DeployEventRequest request,
            DeployEventType eventType)
        {
            bool isUninstallEvent = eventType is DeployEventType.UninstallSucceeded or DeployEventType.UninstallFailed;

            if (isUninstallEvent)
            {
                var deployment = await _deploymentRepository.GetPendingDecommission(org, app, request.Environment);
                if (deployment == null)
                {
                    return new DeploymentResolveResult(null, null, NotFound($"No pending decommission deployment found for {org}/{app} in {request.Environment}"));
                }

                return new DeploymentResolveResult(deployment, deployment.Build.Id, null);
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.BuildId))
                {
                    return new DeploymentResolveResult(null, null, BadRequest("BuildId is required for non-uninstall events"));
                }

                var deployment = await _deploymentRepository.Get(org, request.BuildId);
                if (deployment == null)
                {
                    return new DeploymentResolveResult(null, null, NotFound($"Deployment with build ID {request.BuildId} not found"));
                }

                return new DeploymentResolveResult(deployment, request.BuildId, null);
            }
        }

        private static DeployEvent CreateDeployEvent(DeployEventType eventType, DeployEventRequest request)
        {
            return new DeployEvent
            {
                EventType = eventType,
                Message = request.Message,
                Timestamp = request.Timestamp
            };
        }

        private async Task PublishEntityUpdatedAsync(DeploymentEntity deployment)
        {
            await _entityUpdatedHubContext.Clients.Group(deployment.CreatedBy)
                .EntityUpdated(new EntityUpdated(EntityConstants.Deployment));
        }
    }
}
