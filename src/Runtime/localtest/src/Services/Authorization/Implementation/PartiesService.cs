#nullable enable
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Register.Models;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Authorization.Implementation
{
    public class PartiesService : IParties
    {
        private readonly TestDataService _testDataService;

        public PartiesService(TestDataService testDataService)
        {
            _testDataService = testDataService;
        }

        public async Task<List<Party>?> GetParties(int userId)
        {
            var data = await _testDataService.GetTestData();
            return data.Authorization.PartyList.TryGetValue(userId.ToString(), out var result) ? result : null;
        }

        public async Task<bool> ValidateSelectedParty(int userId, int partyId)
        {
            var parties = await GetParties(userId);
            if (parties == null)
                return false;

            return ContainsParty(parties, partyId);
        }

        private static bool ContainsParty(List<Party> parties, int partyId)
        {
            foreach (var party in parties)
            {
                if (party.PartyId == partyId)
                    return true;

                // Check child parties (sub-units)
                if (party.ChildParties != null && ContainsParty(party.ChildParties, partyId))
                    return true;
            }
            return false;
        }

    }
}
