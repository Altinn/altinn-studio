using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// Sets authentication headers for the git server using the configured auth headers provider.
/// </summary>
public class GiteaWebAuthDelegatingHandler(IGitServerAuthHeadersProvider authHeadersProvider) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        foreach (KeyValuePair<string, string> header in authHeadersProvider.GetAuthHeaders())
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
