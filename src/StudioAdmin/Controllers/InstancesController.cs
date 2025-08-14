using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("admin/api/v1/[controller]")]
public class InstancesController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly ILogger<InstancesController> _logger;

    public InstancesController(IStorageService storageService, ILogger<InstancesController> logger)
    {
        _storageService = storageService;
        _logger = logger;
    }

    [HttpGet("{org}/{env}/{app}")]
    public async Task<ActionResult<IEnumerable<SimpleInstance>>> GetInstances(
        string org,
        string env,
        string app,
        [FromQuery] string? continuationToken,
        [FromQuery] string? currentTask,
        CancellationToken ct
    )
    {
        try
        {
            return Ok(
                await _storageService.GetInstances(
                    org,
                    env,
                    app,
                    continuationToken,
                    currentTask,
                    ct
                )
            );
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

    [HttpGet("{org}/{env}/{app}/{instanceId}")]
    public async Task<ActionResult<Instance>> GetInstance(
        string org,
        string env,
        string app,
        string instanceId,
        CancellationToken ct
    )
    {
        try
        {
            var instance = await _storageService.GetInstance(org, env, instanceId, ct);
            if (instance.AppId != $"{org}/{app}")
            {
                return NotFound();
            }

            return Ok(instance);
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

    [HttpGet("{org}/{env}/{app}/{instanceId}/data/{dataElementId}")]
    public async Task<ActionResult<FileStream>> GetInstanceDataElement(
        string org,
        string env,
        string app,
        string instanceId,
        string dataElementId,
        CancellationToken ct
    )
    {
        try
        {
            var instance = await _storageService.GetInstance(org, env, instanceId, ct);
            if (
                instance.AppId != $"{org}/{app}"
                || !instance.Data.Exists(d => d.Id == dataElementId)
            )
            {
                return NotFound();
            }

            var (stream, contentType, fileName) = await _storageService.GetInstanceDataElement(
                org,
                env,
                instanceId,
                dataElementId,
                ct
            );

            return File(stream, contentType, fileName);
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

    [HttpGet("{org}/{env}/{app}/{instanceId}/process-history")]
    public async Task<ActionResult<List<ProcessHistoryItem>>> GetProcessHistory(
        string org,
        string env,
        string app,
        string instanceId,
        CancellationToken ct
    )
    {
        try
        {
            var instance = await _storageService.GetInstance(org, env, instanceId, ct);
            if (instance.AppId != $"{org}/{app}")
            {
                return NotFound();
            }

            var processHistory = await _storageService.GetProcessHistory(org, env, instanceId, ct);

            return Ok(processHistory);
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

    [HttpGet("{org}/{env}/{app}/{instanceId}/events")]
    public async Task<ActionResult<List<InstanceEvent>>> GetInstanceEvents(
        string org,
        string env,
        string app,
        string instanceId,
        CancellationToken ct
    )
    {
        try
        {
            var instance = await _storageService.GetInstance(org, env, instanceId, ct);
            if (instance.AppId != $"{org}/{app}")
            {
                return NotFound();
            }

            var instanceEvents = await _storageService.GetInstanceEvents(org, env, instanceId, ct);

            return Ok(instanceEvents);
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
}
