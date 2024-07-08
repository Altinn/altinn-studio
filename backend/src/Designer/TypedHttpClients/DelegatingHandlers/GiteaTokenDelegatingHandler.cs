using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

public class GiteaTokenDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GiteaTokenDelegatingHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }


    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        string initToken = await _httpContextAccessor.HttpContext!.GetTokenAsync("access_token");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("token", initToken);

        HttpResponseMessage response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {

        }

        return response;
    }
}
