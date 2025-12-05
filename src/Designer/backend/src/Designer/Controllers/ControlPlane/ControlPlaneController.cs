using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers.ControlPlane;

[ApiController]
[FeatureGate(StudioFeatureFlags.Maskinporten)]
[Authorize(MaskinportenConstants.AuthorizationPolicy)]
[Route("designer/api/v1/controlplane")]
public class ControlPlaneController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok();
    }
}
