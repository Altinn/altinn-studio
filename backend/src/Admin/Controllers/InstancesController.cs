using Admin.Services.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Controllers;

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
    public async Task<IEnumerable<Instance>> Get(string org, string env, string app)
    {
        return await _storageService.GetInstances(org, env, app);
    }
}
