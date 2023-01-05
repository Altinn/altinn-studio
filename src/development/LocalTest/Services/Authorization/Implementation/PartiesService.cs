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

        public Task<bool> ValidateSelectedParty(int userId, int partyId)
        {
            return Task.FromResult(true);
        }

    }
}
