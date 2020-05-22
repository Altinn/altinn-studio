using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;

using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Clients
{
    /// <summary>
    /// Represents an implementation of <see cref="IPartiesWithInstancesClient"/> using a HttpClient.
    /// </summary>
    public class PartiesWithInstancesClient : IPartiesWithInstancesClient
    {
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWithInstancesClient"/> class with the given HttpClient and GeneralSettings.
        /// </summary>
        /// <param name="client">A HttpClient provided by a HttpClientFactory.</param>
        /// <param name="generalSettings">The general settings configured for Storage.</param>
        public PartiesWithInstancesClient(HttpClient client, IOptions<GeneralSettings> generalSettings)
        {
            _client = client;
            _client.BaseAddress = generalSettings.Value.BridgeApiAuthorizationEndpoint;
            _client.Timeout = new TimeSpan(0, 0, 30);
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        /// <inheritdoc />
        public async Task SetHasAltinn3Instances(int instanceOwnerPartyId)
        {
            StringContent content = new StringContent(instanceOwnerPartyId.ToString(), Encoding.UTF8, "application/json");
            await _client.PostAsync("partieswithinstances", content);
        }
    }
}
