using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Profile.Models;
using LocalTest.Configuration;
using LocalTest.Services.Profile.Interface;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace LocalTest.Services.Profile.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class UserProfilesWrapper : IUserProfiles
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        private readonly LocalTest.Services.Register.Interface.IParties _partiesService;

        public UserProfilesWrapper(IOptions<LocalPlatformSettings> localPlatformSettings, LocalTest.Services.Register.Interface.IParties partiesService)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _partiesService = partiesService;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(int userId)
        {
            UserProfile user = null;
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Profile/User/" + userId + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                user = (UserProfile)JsonConvert.DeserializeObject(content, typeof(UserProfile));
            }

            user.Party = await _partiesService.GetParty(user.PartyId);
           return user;
        }
    }
}
