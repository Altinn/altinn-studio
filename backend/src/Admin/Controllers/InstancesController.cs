using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("[controller]")]
public class InstancesController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly ILogger<InstancesController> _logger;

    public InstancesController(IStorageService storageService, ILogger<InstancesController> logger)
    {
        _storageService = storageService;
        _logger = logger;
    }

    [HttpGet("{org}/{env}/{app}", Name = "Instances")]
    public async Task<ActionResult<IEnumerable<SimpleInstance>>> Get(
        string org,
        string env,
        string app
    )
    {
        try
        {
            return Ok(await _storageService.GetInstances(org, env, app));
        }
        catch (HttpRequestException ex)
        {
            return StatusCode((int?)ex.StatusCode ?? 500);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{org}/{env}/{app}/{instanceId}", Name = "Instance")]
    public async Task<ActionResult<Instance>> Get(
        string org,
        string env,
        string app,
        string instanceId
    )
    {
        try
        {
            var instance = await _storageService.GetInstance(org, env, instanceId);
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
    }

    [HttpGet("{org}/{env}/{app}/{instanceId}/data/{dataElementId}", Name = "InstanceData")]
    public async Task<ActionResult<FileStream>> Get(
        string org,
        string env,
        string app,
        string instanceId,
        string dataElementId
    )
    {
        try
        {
            var instance = await _storageService.GetInstance(org, env, instanceId);
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
                dataElementId
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
    }
}
