using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;


namespace Altinn.Studio.Designer.Controllers;

[FeatureGate(StudioFeatureFlags.AnsattPorten)]
[Route("designer/api/[controller]")]
public class MaskinPortenController(IMaskinPortenHttpClient maskinPortenHttpClient) : ControllerBase
{

    // TODO: Cleanup model and create separation between presentation dto, domain model and external api model
    // Will be done under: https://github.com/Altinn/altinn-studio/issues/12767 and https://github.com/Altinn/altinn-studio/issues/12766
    [Authorize(AnsattPortenConstants.AnsattportenAuthorizationPolicy)]
    [HttpGet("scopes")]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var scopes = await maskinPortenHttpClient.GetAvailableScopes(cancellationToken);
        return Ok(scopes);
    }
}
