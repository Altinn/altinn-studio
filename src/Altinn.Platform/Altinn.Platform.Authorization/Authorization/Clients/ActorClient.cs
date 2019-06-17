using System;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Platform.Authorization.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Clients
{
    /// <summary>
    /// Client configuration for actor api
    /// </summary>
    public class ActorClient
    {
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Gets an instance of httpclient from httpclientfactory
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes the http client for actor
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="generalSettings">the general settings configured for the authorization component</param>
        public ActorClient(HttpClient client, IOptions<GeneralSettings> generalSettings)
        {
            _generalSettings = generalSettings.Value;
            Client = client;
            Client.BaseAddress = new Uri(_generalSettings.GetBridgeApiEndpoint);
            Client.Timeout = new TimeSpan(0, 0, 30);
            Client.DefaultRequestHeaders.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }
}
