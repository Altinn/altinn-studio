using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.AnsattPorten;
using Altinn.Studio.Designer.Infrastructure.AnsattPortenIntegration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

public class MaskinPortenTokenDelegatingHandler(IHttpContextAccessor httpContextAccessor) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        string token = await httpContextAccessor.HttpContext!.GetTokenAsync(AnsattPortenConstants.AnsattpotenCookiesAuthenticationScheme, "access_token");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, cancellationToken);
    }
}
