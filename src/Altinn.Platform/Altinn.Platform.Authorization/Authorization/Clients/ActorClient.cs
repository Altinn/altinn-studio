using System;
using System.Net.Http;
using Altinn.Platform.Authorization.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Clients
{
    public class ActorClient
    {
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Gets an instance of httpclient from httpclientfactory
        /// </summary>
        public HttpClient Client { get; }

        public ActorClient(HttpClient client, IOptions<GeneralSettings> generalSettings)
        {
            _generalSettings = generalSettings.Value;
            Client = client;
            Client.BaseAddress = new Uri(_generalSettings.GetBridgeApiEndpoint);
            Client.Timeout = new TimeSpan(0, 0, 30);
            Client.DefaultRequestHeaders.Clear();
        }
    }
}
