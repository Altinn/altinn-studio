using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// A delegating handler that adds subscription keys to requests based on the host of the request URI.
/// </summary>
/// <remarks>
/// The current implementation is not ideal because it checks if the URL contains an environment name.
/// If the name of an application, for example, contains another environment name, the wrong subscription key may be set.
/// </remarks>
/// <param name="platformSettings">A <see cref="PlatformSettings"/> registered in the configuration.</param>
public class PlatformSubscriptionAuthDelegatingHandler(PlatformSettings platformSettings) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var uri = request.RequestUri!;

        if (uri.Host.Contains("at05", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT05);
        }
        else if (uri.Host.Contains("at21", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT21);
        }
        else if (uri.Host.Contains("at22", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT22);
        }
        else if (uri.Host.Contains("at23", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT23);
        }
        else if (uri.Host.Contains("at24", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT24);
        }
        else if (uri.Host.Contains("tt02", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyTT02);
        }
        else if (uri.Host.Contains("yt01", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyYT01);
        }
        else if (uri.Host.Equals("platform.altinn.no", StringComparison.InvariantCultureIgnoreCase))
        {
            request.Headers.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyProd);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
