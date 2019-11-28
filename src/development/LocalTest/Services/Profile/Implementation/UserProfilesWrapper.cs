using System.IO;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Configuration;
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

        public UserProfilesWrapper(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(int userId)
        {
            UserProfile user = null;
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Profile/User/" + userId + ".json";
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                user = (UserProfile)JsonConvert.DeserializeObject(content, typeof(UserProfile));
            }

            return user;
        }
    }
}
