using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// Forwards the Designer session cookie (including chunked cookies) to the Gitea proxy
/// so it can resolve the authenticated user via Designer's userinfo endpoint.
/// </summary>
public class GiteaWebAuthDelegatingHandler(IDesignerCookieProvider cookieProvider) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        string? cookieHeader = cookieProvider.GetDesignerCookieHeaderValue();
        if (!string.IsNullOrEmpty(cookieHeader))
        {
            request.Headers.Add("Cookie", cookieHeader);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
