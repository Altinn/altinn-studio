#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
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
    private readonly IAppResourcesService _appResourcesService;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(
        IKubernetesDeploymentsService kubernetesDeploymentsService,
        IAppResourcesService appResourcesService,
        ILogger<ApplicationsController> logger
    )
    {
        _kubernetesDeploymentsService = kubernetesDeploymentsService;
        _appResourcesService = appResourcesService;
        _logger = logger;
    }

    [HttpGet("{org}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<Dictionary<string, List<PublishedApplication>>>> GetApps(
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

    [HttpGet("{org}/{env}/{app}/process-tasks")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IEnumerable<ProcessTask>>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        try
        {
            return Ok(await _appResourcesService.GetProcessTasks(org, env, app, ct));
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
