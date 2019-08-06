using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the parties api
    /// </summary>
    public class PartiesWrapper : IParties
    {
        private readonly PartyClient _partyClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class
        /// </summary>
        /// <param name="partyClient">the client handler for actor api</param>
        public PartiesWrapper(PartyClient partyClient, ILogger<PartiesWrapper> logger)
        {
            _partyClient = partyClient;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<List<Party>> GetParties(int userId)
        {
            List<Party> partiesList = null;

            string endpointUrl = $"parties?userid={userId}";
            HttpResponseMessage response = await _partyClient.Client.GetAsync(endpointUrl);
            string partiesDataList = await response.Content.ReadAsStringAsync();
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                partiesList = JsonConvert.DeserializeObject<List<Party>>(partiesDataList);
            }

            return partiesList;
        }

        /// <inheritdoc />
        public async Task<bool> ValidateSelectedParty(int userId, int partyId)
        {
            bool result = false;

            List<Party> partyList = await GetParties(userId);

            if (partyList.Count > 0)
            {
                result = partyList.Any(p => p.PartyId == partyId);
            }

            return result;
        }
    }
}
