using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Clients;

namespace Altinn.Platform.Storage.Wrappers
{
    /// <summary>
    /// Represents a wrapper for a HttpClient targeting the SBL Bridge Register API endpoints.
    /// </summary>
    public class PartiesWrapper : IParties
    {
        private readonly PartyClient _partyClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class with the given <see cref="PartyClient"/>.
        /// </summary>
        /// <param name="partyClient">The client handler for the SBL Bridge Register APIs.</param>
        public PartiesWrapper(PartyClient partyClient)
        {
            _partyClient = partyClient;
        }

        /// <inheritdoc />
        public async Task SetHasAltinn3Instances(int instanceOwnerPartyId)
        {
            StringContent content = new StringContent(instanceOwnerPartyId.ToString());
            await _partyClient.Client.PostAsync("partieswithinstances", content);
        }
    }
}
