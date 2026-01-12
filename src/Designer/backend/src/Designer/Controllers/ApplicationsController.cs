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
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Authorize]
[Route("designer/api/admin/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly IKubernetesDeploymentsService _kubernetesDeploymentsService;
    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IDeploymentRepository _deploymentRepository;
    private readonly IReleaseRepository _releaseRepository;
    private readonly IAppResourcesService _appResourcesService;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(
        IKubernetesDeploymentsService kubernetesDeploymentsService,
        IRuntimeGatewayClient runtimeGatewayClient,
        IDeploymentRepository deploymentRepository,
        IReleaseRepository releaseRepository,
        IAppResourcesService appResourcesService,
        ILogger<ApplicationsController> logger
    )
    {
        _kubernetesDeploymentsService = kubernetesDeploymentsService;
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
            var deployments = await _kubernetesDeploymentsService.GetAsync(org, ct);
            var applications = deployments.ToDictionary(
                kv => kv.Key,
                kv => kv.Value.Select(PublishedApplication.FromKubernetesDeployment).ToList()
            );
            return Ok(applications);
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

            var (deploymentEntityTask, releaseEntityTask) = (
                _deploymentRepository.Get(org, runtimeAppDeployment.BuildId),
                _releaseRepository.GetSucceededReleaseFromDb(
                    org,
                    app,
                    runtimeAppDeployment.ImageTag
                )
            );
            await Task.WhenAll(deploymentEntityTask, releaseEntityTask);
            var (deploymentEntity, releaseEntity) = (
                deploymentEntityTask.Result,
                releaseEntityTask.Result
            );

            return new PublishedApplicationDetails()
            {
                Org = runtimeAppDeployment.Org,
                App = runtimeAppDeployment.App,
                Version = runtimeAppDeployment.ImageTag,
                Env = deploymentEntity.EnvName,
                Commit = releaseEntity.TargetCommitish,
                CreatedAt = deploymentEntity.Created,
                CreatedBy = deploymentEntity.CreatedBy,
            };
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
