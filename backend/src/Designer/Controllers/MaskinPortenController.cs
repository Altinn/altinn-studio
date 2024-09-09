using Altinn.Studio.Designer.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[FeatureGate(StudioFeatureFlags.AnsattPorten)]
[Route("designer/api/[controller]")]
[ApiController]
public class MaskinPortenController : ControllerBase
{

}
