using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Services.Interfaces;
using Altinn.Studio.Admin.Models;
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
    public async Task<IEnumerable<SimpleInstance>> Get(string org, string env, string app)
    {
        return await _storageService.GetInstances(org, env, app);
    }

    [HttpGet("{org}/{env}/{app}/{instanceOwnerPartyId}/{instanceId}", Name = "Instance")]
    public async Task<ActionResult<Instance>> Get(string org, string env, string app, string instanceOwnerPartyId, string instanceId)
    {
        var instance =  await _storageService.GetInstance(org, env, instanceOwnerPartyId, instanceId);
        if (instance.AppId.Split("/")[1] != app) {
            return NotFound();
        }

        return Ok(instance);
    }
}
