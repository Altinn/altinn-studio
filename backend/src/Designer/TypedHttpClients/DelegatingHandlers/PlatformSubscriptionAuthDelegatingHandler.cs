using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// A delegating handler that adds subscription keys to requests based on the host of the request URI.
/// </summary>
/// <param name="platformSettings">A <see cref="PlatformSettings"/> registered in the configuration.</param>
public class PlatformSubscriptionAuthDelegatingHandler(PlatformSettings platformSettings) : DelegatingHandler
{
    private readonly HashSet<KeyValuePair<string, string>> _environmentSubscriptions =
    [
        new("at05", platformSettings.SubscriptionKeyAT05),
        new("at21", platformSettings.SubscriptionKeyAT21),
        new("at22", platformSettings.SubscriptionKeyAT22),
        new("at23", platformSettings.SubscriptionKeyAT23),
        new("at24", platformSettings.SubscriptionKeyAT24),
        new("tt02", platformSettings.SubscriptionKeyTT02),
        new("yt01", platformSettings.SubscriptionKeyYT01)
    ];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var uri = request.RequestUri!;
        string host = uri.Host;

        if (host.Equals("platform.altinn.no", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyProd);
        }
        else
        {
            foreach (var entry in _environmentSubscriptions.Where(entry => host.Contains(entry.Key, StringComparison.InvariantCultureIgnoreCase)))
            {
                request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, entry.Value);
                break;
            }
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
