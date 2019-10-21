using System;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Platform.Authorization.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Clients
{
    /// <summary>
    /// Client configuration for roles api
    /// </summary>
    public class RolesClient
    {
        /// <summary>
        /// Gets an instance of httpclient from httpclientfactory
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes the http client for roles
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="settings">the general settings configured for the authorization component</param>
        public RolesClient(HttpClient client, IOptions<GeneralSettings> settings)
        {
            GeneralSettings generalSettings = settings.Value;
            Client = client;
            Client.BaseAddress = new Uri(generalSettings.GetBridgeApiEndpoint);
            Client.DefaultRequestHeaders.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }
}
