using System;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Platform.Authorization.Functions.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Functions.Clients
{
    /// <summary>
    /// Client configuration for Bridge API
    /// </summary>
    public class BridgeClient
    {
        /// <summary>
        /// Gets an instance of httpclient from httpclientfactory
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes the http client for access Bridge API
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="platformSettings">the platform settings configured for the authorization functions</param>
        public BridgeClient(HttpClient client, IOptions<PlatformSettings> platformSettings)
        {
            PlatformSettings settings = platformSettings.Value;
            Client = client;
            Client.BaseAddress = new Uri(settings.BridgeApiEndpoint);
            Client.Timeout = new TimeSpan(0, 0, 30);
            Client.DefaultRequestHeaders.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }
}
