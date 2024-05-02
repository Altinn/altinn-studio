using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.AnsattPorten;
using Altinn.Studio.Designer.Infrastructure.AnsattPortenIntegration;
using Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[Route("designer/api/[controller]")]
public class MaskinPortenController(IMaskinPortenHttpClient maskinPortenHttpClient) : ControllerBase
{
    [Authorize(AnsattPortenConstants.AnsattportenAuthorizationPolicy)]
    [HttpGet("scopes")]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var scopes = await maskinPortenHttpClient.GetAvailableScopes(cancellationToken);
        return Ok(scopes);
    }
}
