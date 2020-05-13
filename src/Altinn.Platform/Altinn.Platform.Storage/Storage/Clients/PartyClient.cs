using System;
using System.Net.Http;
using System.Net.Http.Headers;

using Altinn.Platform.Storage.Configuration;

using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Clients
{
    /// <summary>
    /// Represents a container for a HttpClient that is initialized with settings to communicate with the Authorization API in SBL Bridge.
    /// </summary>
    public class PartyClient
    {        
        /// <summary>
        /// Gets an instance of HttpClient from HttpClientFactory.
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes a new instance of <see cref="PartyClient"/> with the given HttpClient and GeneralSettings.
        /// </summary>
        /// <param name="client">The HttpClient provided by a HttpClientFactory.</param>
        /// <param name="generalSettings">The general settings configured for Storage.</param>
        public PartyClient(HttpClient client, IOptions<GeneralSettings> generalSettings)
        {
            GeneralSettings settings = generalSettings.Value;
            Client = client;
            Client.BaseAddress = settings.BridgeApiAuthorizationEndpoint;
            Client.Timeout = new TimeSpan(0, 0, 30);
            Client.DefaultRequestHeaders.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }
}
