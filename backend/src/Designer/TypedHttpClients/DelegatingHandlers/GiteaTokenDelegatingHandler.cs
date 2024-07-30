using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// Adds the authorization token to the request header.
/// </summary>
public class GiteaTokenDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GiteaTokenDelegatingHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }


    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        string initToken = await _httpContextAccessor.HttpContext!.GetDeveloperAppTokenAsync();
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("token", initToken);

        return await base.SendAsync(request, cancellationToken);
    }
}
