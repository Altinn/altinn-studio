using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.TypedHttpclients.DelegatingHandlers;

public class OidcTokenDelegatingHandler(IHttpContextAccessor httpContextAccessor) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            throw new HttpRequestException("No HttpContext available to retrieve access token from");
        }

        string? token = await httpContext.GetTokenAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            "access_token"
        );
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new HttpRequestException("No access token available in HttpContext");
        }

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, cancellationToken);
    }
}
