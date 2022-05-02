using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Profile.Models;
using LocalTest.Configuration;
using LocalTest.Services.Profile.Interface;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace LocalTest.Services.Profile.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class UserProfilesWrapper : IUserProfiles
    {
        // Temporary hack to allow testing with different languages in localtest
        public static string STATIC_LANGUAGE_OVERRIDE { get; set; } = "";
        private readonly LocalPlatformSettings _localPlatformSettings;

        private readonly LocalTest.Services.Register.Interface.IParties _partiesService;

        private readonly ILogger<UserProfilesWrapper> _logger;

        public UserProfilesWrapper(IOptions<LocalPlatformSettings> localPlatformSettings, LocalTest.Services.Register.Interface.IParties partiesService, ILogger<UserProfilesWrapper> logger)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _partiesService = partiesService;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(int userId)
        {
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Profile/User/" + userId + ".json";
            if (!File.Exists(path))
            {
                return null;
            }
            string content = File.ReadAllText(path);
            var user = JsonConvert.DeserializeObject<UserProfile>(content);
            if (user == null)
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(STATIC_LANGUAGE_OVERRIDE))
            {
                _logger.LogInformation("Set language by override to {language}", STATIC_LANGUAGE_OVERRIDE);
                user.ProfileSettingPreference.Language = STATIC_LANGUAGE_OVERRIDE;
            }

            user.Party = await _partiesService.GetParty(user.PartyId);
            return user;
        }
    }
}
