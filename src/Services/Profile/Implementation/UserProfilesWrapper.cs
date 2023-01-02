#nullable enable
using Altinn.Platform.Profile.Models;
using LocalTest.Services.Profile.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Profile.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class UserProfilesWrapper : IUserProfiles
    {
        private readonly TestDataService _testDataService;

        private readonly LocalTest.Services.Register.Interface.IParties _partiesService;

        public UserProfilesWrapper(TestDataService testDataService, LocalTest.Services.Register.Interface.IParties partiesService)
        {
            _testDataService = testDataService;
            _partiesService = partiesService;
        }

        /// <inheritdoc />
        public async Task<UserProfile?> GetUser(int userId)
        {
            var data = await _testDataService.GetTestData();
            if (data.Profile.User.TryGetValue(userId.ToString(), out UserProfile? user))
            {
                user.Party = await _partiesService.GetParty(user.PartyId);
                return user;
            }

            return null;
        }
    }
}
