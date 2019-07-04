using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the parties api
    /// </summary>
    public class PartiesWrapper : IParties
    {
        private readonly PartyClient _partyClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class
        /// </summary>
        /// <param name="partyClient">the client handler for actor api</param>
        public PartiesWrapper(PartyClient partyClient)
        {
            _partyClient = partyClient;
        }

        /// <inheritdoc />
        public async Task<List<Party>> GetParties(int userId)
        {            
            List<Party> partiesList = null;

            var request = $"/actors?userid={userId}";

            var response = await _partyClient.Client.GetAsync(request);            
            string partiesDataList = await response.Content.ReadAsStringAsync();
            response.EnsureSuccessStatusCode();
            partiesList = JsonConvert.DeserializeObject<List<Party>>(partiesDataList);
            return partiesList;
        }
    }
}
