#nullable enable

using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[Route("designer/api/admin/[controller]")]
public class InstancesController : ControllerBase
{
    private readonly ILogger<InstancesController> _logger;
    private readonly IAltinnStorageInstancesClient _instancesClient;

    public InstancesController(
        IAltinnStorageInstancesClient instancesClient,
        ILogger<InstancesController> logger
    )
    {
        _instancesClient = instancesClient;
        _logger = logger;
    }

    [HttpGet("{org}/{env}/{app}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<InstancesResponse>> GetInstances(
        string org,
        string env,
        string app,
        [FromQuery] string? continuationToken,
        [FromQuery] string? currentTask,
        [FromQuery] bool? processIsComplete,
        [FromQuery] string? archiveReference,
        CancellationToken ct
    )
    {
        try
        {
            var queryResponse = await _instancesClient.GetInstances(
                org,
                env,
                app,
                continuationToken,
                currentTask,
                processIsComplete,
                archiveReference,
                ct
            );
            return new InstancesResponse()
            {
                Instances = queryResponse.Instances,
                ContinuationToken = queryResponse.Next,
            };
        }
        catch (HttpRequestWithStatusException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
    }
}
