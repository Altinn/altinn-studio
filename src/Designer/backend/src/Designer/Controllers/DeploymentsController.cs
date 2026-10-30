using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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
    private readonly IEnvironmentsService _environmentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly GeneralSettings _generalSettings;
    private readonly ILogger<DeploymentsController> _logger;

    // TODO(#18666): DeveloperAppToken is unused with OIDC auth; placeholder satisfies
    // the AltinnAuthenticatedRepoEditingContext guard until that model is reworked.
    private const string OidcAuthTokenPlaceholder = "studio-oidc-auth";

    public DeploymentsController(
        IDeploymentService deploymentService,
        IGiteaClient giteaClient,
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        GeneralSettings generalSettings,
        ILogger<DeploymentsController> logger
    )
    {
        _deploymentService = deploymentService;
        _giteaClient = giteaClient;
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _generalSettings = generalSettings;
        _logger = logger;
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

        List<RunningApp> runningAppList = await GetRunningApps(org, app, cancellationToken);

        return new DeploymentsResponse
        {
            PipelineDeploymentList = deployments.Results.ToList(),
            RunningAppList = runningAppList,
        };
    }

    private async Task<List<RunningApp>> GetRunningApps(string org, string app, CancellationToken ct)
    {
        IEnumerable<EnvironmentModel> environments = await _environmentsService.GetOrganizationEnvironments(org, ct);

        RunningApp?[] runningApps = await Task.WhenAll(
            environments.Select(async env =>
            {
                try
                {
                    var deployment = await _runtimeGatewayClient.GetRunningAppDeployment(
                        org,
                        app,
                        AltinnEnvironment.FromName(env.Name),
                        ct
                    );
                    return deployment is null
                        ? null
                        : new RunningApp
                        {
                            EnvName = env.Name,
                            Version = deployment.ImageTag,
                            // Several Studio environments share a runtime cluster. Only a deploy from this one is in
                            // its history.
                            BuildId =
                                deployment.SourceEnvironment == _generalSettings.OriginEnvironment
                                    ? deployment.BuildId
                                    : null,
                        };
                }
                // One unreachable cluster should not hide where the app runs in the others, and a timeout is no reason
                // to fail the whole request either. Only the caller's cancellation is.
                catch (Exception e) when (!ct.IsCancellationRequested)
                {
                    _logger.LogError(
                        e,
                        "Could not get {App} from environment {EnvName} for org {Org}.",
                        app.WithoutLineBreaks(),
                        env.Name,
                        org.WithoutLineBreaks()
                    );
                    return null;
                }
            })
        );
        return runningApps.OfType<RunningApp>().ToList();
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
