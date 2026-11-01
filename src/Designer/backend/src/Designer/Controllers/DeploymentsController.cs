using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.Deployments;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Runtime;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller for creating and getting deployments
/// </summary>
[ApiController]
[Authorize]
[AllowApiKey]
[TypeFilter(typeof(ConditionalAntiforgeryFilter))]
[Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/deployments")]
public class DeploymentsController : ControllerBase
{
    private readonly IDeploymentService _deploymentService;
    private readonly IGiteaClient _giteaClient;
    private readonly AppRuntime _appRuntime;

    // TODO(#18666): DeveloperAppToken is unused with OIDC auth; placeholder satisfies
    // the AltinnAuthenticatedRepoEditingContext guard until that model is reworked.
    private const string OidcAuthTokenPlaceholder = "studio-oidc-auth";

    public DeploymentsController(IDeploymentService deploymentService, IGiteaClient giteaClient, AppRuntime appRuntime)
    {
        _deploymentService = deploymentService;
        _giteaClient = giteaClient;
        _appRuntime = appRuntime;
    }

    /// <summary>
    /// Gets deployments based on a query
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application name</param>
    /// <param name="query">Document query model</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>List of Pipeline deployments and the app as it runs in each environment</returns>
    [HttpGet]
    [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
    public async Task<DeploymentsResponse> Get(
        string org,
        string app,
        [FromQuery] DocumentQueryModel? query,
        CancellationToken cancellationToken
    )
    {
        SearchResults<DeploymentEntity> deployments = await _deploymentService.GetAsync(
            org,
            app,
            query,
            cancellationToken
        );

        IReadOnlyList<AppRunState> runStates = await _appRuntime.GetAll(org, app, cancellationToken);

        // A limited list can leave out the deploy that runs.
        IEnumerable<DeploymentEntity> deploymentsToMatch = query?.Top is null
            ? deployments.Results
            : (await AllDeployments(org, app, cancellationToken)).Results;

        return new DeploymentsResponse
        {
            PipelineDeploymentList = deployments.Results.ToList(),
            EnvironmentList = runStates.Select(state => AppInEnvironment.From(state, deploymentsToMatch)).ToList(),
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
                && (t.Name.StartsWith("Deploy-", StringComparison.OrdinalIgnoreCase) || t.Name.Equals("Owners"))
            )
            .Select(t => t.Name.Equals("Owners") ? t.Name : t.Name.Split('-')[1])
            .ToList();

        return Ok(permittedEnvironments);
    }

    /// <summary>
    /// Creates a deployment
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application name</param>
    /// <param name="createDeployment">Release model</param>
    /// <returns>Created deployment</returns>
    [HttpPost]
    [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
    [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Post))]
    public async Task<ActionResult<DeploymentEntity>> Create(
        string org,
        string app,
        [FromBody] CreateDeploymentRequestViewModel createDeployment
    )
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        HttpContext.SetTargetEnvironment(createDeployment.EnvName);
        string token = OidcAuthTokenPlaceholder;
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, developer, token);

        var createResult = await _deploymentService.CreateAsync(authenticatedContext, createDeployment.ToDomainModel());
        return Created(string.Empty, createResult);
    }

    /// <summary>
    /// Restarts the app in an environment, so its instances are replaced with new ones of the same version.
    /// </summary>
    /// <param name="org">Organization name</param>
    /// <param name="app">Application name</param>
    /// <param name="restartRequest">The environment to restart the app in</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The app as the restart left it, or why it could not be restarted</returns>
    [HttpPost("restart")]
    [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
    public async Task<ActionResult<RunningApp>> Restart(
        string org,
        string app,
        [FromBody] RestartRequest restartRequest,
        CancellationToken cancellationToken
    )
    {
        Guard.AssertValidEnvironmentName(restartRequest.Environment);
        HttpContext.SetTargetEnvironment(restartRequest.Environment);
        // The request's trace is the only record of who restarted the app, so sampling must not drop it.
        RootSpan.Of(HttpContext).SetAlwaysSample();

        // Read before restarting, since a restart keeps the deploy that runs, so that a failing read cannot report a
        // restart that started as failed.
        IEnumerable<DeploymentEntity> deployments = (await AllDeployments(org, app, cancellationToken)).Results;
        AppRestart restart = await _appRuntime.Restart(org, app, restartRequest.Environment, cancellationToken);
        return restart switch
        {
            AppRestart.Started started => Accepted(RunningApp.From(started.Running, deployments)),
            AppRestart.NotRunning => RestartProblem(DeploymentErrorCodes.AppNotRunning, HttpStatusCode.NotFound),
            AppRestart.Updating => RestartProblem(DeploymentErrorCodes.AppUpdating, HttpStatusCode.Conflict),
            AppRestart.Paused => RestartProblem(DeploymentErrorCodes.AppPaused, HttpStatusCode.Conflict),
            _ => RestartProblem(DeploymentErrorCodes.AppDeployedElsewhere, HttpStatusCode.Conflict),
        };
    }

    private Task<SearchResults<DeploymentEntity>> AllDeployments(
        string org,
        string app,
        CancellationToken cancellationToken
    ) => _deploymentService.GetAsync(org, app, new DocumentQueryModel(), cancellationToken);

    private ObjectResult RestartProblem(string errorCode, HttpStatusCode statusCode) =>
        StatusCode((int)statusCode, ProblemDetailsUtils.GenerateProblemDetails(errorCode, statusCode));

    /// <summary>
    /// Initiates the undeployment of an application from a specific environment
    /// </summary>
    /// <param name="org">Organization name</param>
    /// <param name="app">Application name</param>
    /// <param name="undeployRequest">Undeployment request containing the target environment</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>Accepted response with tracking information</returns>
    [HttpPost("undeploy")]
    [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
    public async Task<IActionResult> Undeploy(
        string org,
        string app,
        [FromBody] UndeployRequest undeployRequest,
        CancellationToken cancellationToken
    )
    {
        Guard.AssertValidEnvironmentName(undeployRequest.Environment);
        HttpContext.SetTargetEnvironment(undeployRequest.Environment);
        string token = OidcAuthTokenPlaceholder;
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(org, app, developer, token);
        await _deploymentService.UndeployAsync(authenticatedContext, undeployRequest.Environment, cancellationToken);

        return Accepted();
    }
}
