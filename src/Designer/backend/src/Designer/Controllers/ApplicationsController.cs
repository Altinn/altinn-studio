#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Authorize]
[Route("designer/api/admin/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly IEnvironmentsService _environmentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IReleaseRepository _releaseRepository;
    private readonly IAppResourcesService _appResourcesService;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(
        IEnvironmentsService environmentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        IDeploymentRepository deploymentRepository,
        IReleaseRepository releaseRepository,
        IAppResourcesService appResourcesService,
        ILogger<ApplicationsController> logger
    )
    {
        _environmentsService = environmentsService;
        _runtimeGatewayClient = runtimeGatewayClient;
        _deploymentRepository = deploymentRepository;
        _releaseRepository = releaseRepository;
        _appResourcesService = appResourcesService;
        _logger = logger;
    }

    [HttpGet("{org}")]
    public async Task<ActionResult<Dictionary<string, List<PublishedApplication>>>> GetApplications(
        string org,
        CancellationToken ct
    )
    {
        try
        {
            IEnumerable<EnvironmentModel> environments =
                await _environmentsService.GetOrganizationEnvironments(org);

            var getDeploymentsTasks = environments.Select(async env =>
            {
                try
                {
                    var deployments = await _runtimeGatewayClient.GetAppDeployments(
                        org,
                        AltinnEnvironment.FromName(env.Name),
                        ct
                    );

                    return (env, deployments.ToList());
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (HttpRequestException e)
                {
                    _logger.LogError(e, $"Could not reach environment {env.Name} for org {org}.");
                    return (env, new List<AppDeployment>());
                }
            });

            (EnvironmentModel, List<AppDeployment>)[] deployments = await Task.WhenAll(
                getDeploymentsTasks
            );

            var applications = deployments.ToDictionary(
                g => g.Item1.Name,
                g =>
                    g.Item2.Select(deployment => new PublishedApplication()
                    {
                        Org = deployment.Org,
                        App = deployment.App,
                        Env = g.Item1.Name, // deployment.Env uses prod (not production)
                        Version = deployment.ImageTag,
                    })
            );

            return Ok(applications);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Invalid deployment data for org {Org}.", org);
            return StatusCode(502);
        }
    }

    [HttpGet("{org}/{env}/{app}")]
    public async Task<ActionResult<PublishedApplicationDetails>> GetApplicationDetails(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        try
        {
            var runtimeAppDeployment = await _runtimeGatewayClient.GetAppDeployment(
                org,
                app,
                AltinnEnvironment.FromName(env),
                ct
            );

            var deploymentEntity = await _deploymentRepository.Get(
                org,
                runtimeAppDeployment.BuildId
            );
            var releaseEntity = await _releaseRepository.GetSucceededReleaseFromDb(
                org,
                app,
                runtimeAppDeployment.ImageTag
            );

            var application = new PublishedApplicationDetails()
            {
                Org = runtimeAppDeployment.Org,
                App = runtimeAppDeployment.App,
                Version = runtimeAppDeployment.ImageTag,
                Env = deploymentEntity.EnvName, // runtimeAppDeployment.Env uses prod (not production)
                Commit = releaseEntity.TargetCommitish,
                CreatedAt = deploymentEntity.Created,
                CreatedBy = deploymentEntity.CreatedBy,
            };

            return Ok(application);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
    }

    [HttpGet("{org}/{env}/{app}/application-metadata")]
    public async Task<ActionResult<ApplicationMetadata>> GetApplicationMetadata(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        try
        {
            return Ok(await _appResourcesService.GetApplicationMetadata(org, env, app, ct));
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
    }

    [HttpGet("{org}/{env}/{app}/process-metadata")]
    public async Task<ActionResult<IEnumerable<ProcessTaskMetadata>>> GetProcessMetadata(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        try
        {
            return Ok(await _appResourcesService.GetProcessMetadata(org, env, app, ct));
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(
                ex,
                "Invalid process task data for app {Org}/{Env}/{App}.",
                org,
                env,
                app
            );
            return StatusCode(502);
        }
    }
}
