using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// Forwards the Designer session cookie (including chunked cookies) to the Gitea proxy
/// so it can resolve the authenticated user via Designer's userinfo endpoint.
/// </summary>
public class GiteaWebAuthDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GiteaWebAuthDelegatingHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var cookies = _httpContextAccessor.HttpContext?.Request.Cookies
            .Where(c => c.Key.StartsWith(General.DesignerCookieName))
            .Select(c => $"{c.Key}={c.Value}")
            .ToList();

        if (cookies is { Count: > 0 })
        {
            request.Headers.Add("Cookie", string.Join("; ", cookies));
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
