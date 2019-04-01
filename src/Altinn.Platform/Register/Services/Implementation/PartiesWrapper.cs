using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Helpers;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class 
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public PartiesWrapper(IOptions<GeneralSettings> generalSettings, ILogger<PartiesWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Party> GetParty(int partyId)
        {
            Party party = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Party));
            Uri endpointUrl = new Uri($"{_generalSettings.GetApiBaseUrl()}/parties/{partyId}");
            using (HttpClient client = HttpApiHelper.GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    party = serializer.ReadObject(stream) as Party;
                }
                else
                {
                    _logger.LogError($"Getting party with party Id {partyId} failed with statuscode {response.StatusCode}");
                }
            }

            return party;
        }
    }
}
