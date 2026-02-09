using System.Net.Http.Headers;
using Altinn.Studio.Gateway.Api.Settings;

namespace Altinn.Studio.Gateway.Api.Authentication;

internal sealed class GrafanaAuthenticationHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public GrafanaAuthenticationHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var settings = _httpContextAccessor.HttpContext?.RequestServices.GetRequiredService<GrafanaSettings>();

        if (settings != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.Token);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
