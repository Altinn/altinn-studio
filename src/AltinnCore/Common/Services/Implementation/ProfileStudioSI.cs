using System.IO;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service for profile functionality under service development
    /// </summary>
    public class ProfileStudioSI : IProfile
    {
        private const string TESDATA_USER_DIRECTORY = @"/User/";

        private const string PROFILE_FILENAME = "userprofile.json";

        private RegisterStudioSI _registerService;

        private TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IDSF _dsfService;
        private readonly IER _erService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileStudioSI"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">The settings for test data repository</param>
        /// <param name="dsfService">The dsf service</param>
        /// <param name="erService">The er service</param>
        public ProfileStudioSI(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IDSF dsfService, IER erService)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _dsfService = dsfService;
            _erService = erService;
            _registerService = new RegisterStudioSI(testdataRepositorySettings, dsfService, erService);
        }

        /// <summary>
        /// Returns a user profile for a given user
        /// </summary>
        /// <param name="userId">The userId</param>
        /// <returns>The user profile</returns>
        public async Task<UserProfile> GetUserProfile(int userId)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESDATA_USER_DIRECTORY + userId + @"/" + PROFILE_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            UserProfile userProfile = JsonConvert.DeserializeObject<UserProfile>(textData);

            userProfile.Party = await _registerService.GetParty(userProfile.PartyId);

            return userProfile;
        }
    }
}
