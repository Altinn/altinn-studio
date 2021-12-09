using System;
using System.Net.Http;
using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// Helper for Http Client requests
    /// </summary>
    public static class HttpClientHelper
    {
        /// <summary>
        /// Adds subscription keys for http requests against endpoints in Platform.Storage
        /// </summary>
        /// <param name="httpClient">the http client</param>
        /// <param name="uri">the uri</param>
        /// <param name="platformSettings">the platform settings</param>
        public static void AddSubscriptionKeys(HttpClient httpClient, Uri uri, PlatformSettings platformSettings)
        {
            if (uri.Host.Contains("at05", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT05);
            }
            else if (uri.Host.Contains("at21", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT21);
            }
            else if (uri.Host.Contains("at22", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT22);
            }
            else if (uri.Host.Contains("at23", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT23);
            }
            else if (uri.Host.Contains("at24", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyAT24);
            }
            else if (uri.Host.Contains("tt02", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyTT02);
            }
            else if (uri.Host.Contains("yt01", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyYT01);
            }
            else if (uri.Host.Equals("platform.altinn.no", StringComparison.InvariantCultureIgnoreCase))
            {
                httpClient.DefaultRequestHeaders.Add(platformSettings.SubscriptionKeyHeaderName, platformSettings.SubscriptionKeyProd);
            }
        }
    }
}
