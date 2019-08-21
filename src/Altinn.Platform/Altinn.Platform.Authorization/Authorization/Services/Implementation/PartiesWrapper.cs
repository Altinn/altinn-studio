using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.ServiceLibrary.Models;
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
        private readonly SBLClient _sblClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class
        /// </summary>
        /// <param name="partyClient">the client handler for parties api in Bridge</param>
        /// <param name="sblClient">the client handler for SBL apis</param>
        /// <param name="logger">The logger</param>
        public PartiesWrapper(PartyClient partyClient, SBLClient sblClient, ILogger<PartiesWrapper> logger)
        {
            _partyClient = partyClient;
            _sblClient = sblClient;
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
        public async Task<bool?> UpdateSelectedParty(int userId, int partyId)
        {
            bool isValid = await ValidateSelectedParty(userId, partyId);

            if (!isValid)
            {
                return null;
            }

            // TODO: set all required cookies.

            string apiUrl = $"ui/Reportee/ChangeReportee/?R={partyId}";
            HttpResponseMessage response = await _sblClient.Client.GetAsync(apiUrl);
            string message = response.Content.ToString();

            if (response.StatusCode == HttpStatusCode.OK && message.Equals("Reportee successfully updated."))
            {
                return true;
            }
            else
            {
                return false;
            }
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
