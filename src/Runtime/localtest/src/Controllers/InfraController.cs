using Altinn.Studio.EnvTopology;
using Microsoft.AspNetCore.Mvc;
using LocalTest.Configuration;

namespace LocalTest.Controllers;

[ApiController]
[Route("Home/[controller]/[action]")]
public class InfraController : ControllerBase
{
    private readonly BoundTopologyIndexAccessor _boundTopologyIndex;

    public InfraController(BoundTopologyIndexAccessor boundTopologyIndex)
    {
        _boundTopologyIndex = boundTopologyIndex;
    }

    [HttpGet]
    public IActionResult Grafana()
    {
        return _boundTopologyIndex.Current.TryGetComponentRoute("grafana") is null
            ? StatusCode(StatusCodes.Status204NoContent)
            : Ok();
    }
}
