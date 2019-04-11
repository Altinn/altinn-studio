using System.IO;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service for profile functionality under service development
    /// </summary>
    public class ProfileSILocalDev : IProfile
    {
        private const string TESDATA_USER_DIRECTORY = @"/User/";

        private const string PROFILE_FILENAME = "userprofile.json";

        private RegisterSILocalDev _registerService;

        private TestdataRepositorySettings _testdataRepositorySettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileSILocalDev"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">The settings for test data repository</param>
        public ProfileSILocalDev(IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            this._testdataRepositorySettings = testdataRepositorySettings.Value;
            this._registerService = new RegisterSILocalDev(testdataRepositorySettings);
        }

        /// <summary>
        /// Returns a user profile for a given user
        /// </summary>
        /// <param name="userId">The userId</param>
        /// <returns>The user profile</returns>
        public UserProfile GetUserProfile(int userId)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESDATA_USER_DIRECTORY + userId + @"/" + PROFILE_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            UserProfile userProfile = JsonConvert.DeserializeObject<UserProfile>(textData);

            userProfile.Party = _registerService.GetParty(userProfile.PartyId);

            return userProfile;
        }
    }
}
