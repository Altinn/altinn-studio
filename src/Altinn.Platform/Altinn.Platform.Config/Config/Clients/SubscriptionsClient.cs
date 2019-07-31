using Altinn.Platform.Config.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace Altinn.Platform.Config.Clients
{
  /// <summary>
  /// Client configuration for subscriptions api
  /// </summary>
    public class SubscriptionsClient
    {
        /// <summary>
        /// Gets an instance of httpclient from httpclientfactory
        /// </summary>
        public HttpClient Client { get; }

        /// <summary>
        /// Initializes the http client for subscriptions
        /// </summary>
        /// <param name="client">the http client</param>
        /// <param name="generalSettings">the general settings configured for the config component</param>
        public SubscriptionsClient(HttpClient client, IOptions<GeneralSettings> generalSettings)
        {
            GeneralSettings settings = generalSettings.Value;
            Client = client;
            Client.BaseAddress = new Uri(settings.GetBridgeApiEndpoint);
            Client.Timeout = new TimeSpan(0, 0, 30);
            Client.DefaultRequestHeaders.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }
    }
}
