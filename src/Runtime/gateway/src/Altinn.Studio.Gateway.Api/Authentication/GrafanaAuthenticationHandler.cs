using System.Net.Http.Headers;
using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Authentication;

internal sealed class GrafanaAuthenticationHandler(IOptionsMonitor<GrafanaSettings> _settings) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.CurrentValue.Token);

        return await base.SendAsync(request, cancellationToken);
    }
}
