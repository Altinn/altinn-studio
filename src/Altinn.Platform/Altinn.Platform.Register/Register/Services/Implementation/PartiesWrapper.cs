using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Register.Services.Implementation
{
    /// <summary>
    /// The parties wrapper
    /// </summary>
    public class PartiesWrapper : IParties
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class
        /// </summary>
        /// <param name="httpClient">HttpClient from default httpclientfactory</param>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public PartiesWrapper(HttpClient httpClient, IOptions<GeneralSettings> generalSettings, ILogger<PartiesWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<Party> GetParty(int partyId)
        {
            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}parties/{partyId}");

            HttpResponseMessage response = await _client.GetAsync(endpointUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                return await JsonSerializer.DeserializeAsync<Party>(await response.Content.ReadAsStreamAsync());
            }
            else
            {
                _logger.LogError($"Getting party with party Id {partyId} failed with statuscode {response.StatusCode}");
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<Party> LookupPartyBySSNOrOrgNo(string lookupValue)
        {
            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}parties/lookupObject");
       
            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookupValue), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _client.PostAsync(endpointUrl, requestBody);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                return await JsonSerializer.DeserializeAsync<Party>(await response.Content.ReadAsStreamAsync());
            }
            else
            {
                _logger.LogError($"Getting party by lookup value failed with statuscode {response.StatusCode}");
            }
       
            return null;
        }

        /// <inheritdoc />
        public async Task<int> LookupPartyIdBySSNOrOrgNo(string lookupValue)
        {
            Uri endpointUrl = new Uri($"{_generalSettings.BridgeApiEndpoint}parties/lookup");

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookupValue), Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _client.PostAsync(endpointUrl, requestBody);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                return await JsonSerializer.DeserializeAsync<int>(await response.Content.ReadAsStreamAsync());
            }
            else
            {
                _logger.LogError($"Getting party id by lookup value failed with statuscode {response.StatusCode}");
            }

            return -1;
        }
    }
}
