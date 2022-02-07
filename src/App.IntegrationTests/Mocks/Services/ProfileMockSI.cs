using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Profile.Models;
using App.IntegrationTests.Mocks.Services;

using Newtonsoft.Json;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class ProfileMockSI : IProfile
    {
        private readonly IRegister _registerService;

        public ProfileMockSI(IRegister registerService)
        {
            _registerService = registerService;
        }

        public async Task<UserProfile> GetUserProfile(int userId)
        {
            UserProfile user = null;
            string path = GetProfilePath(userId);
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                user = (UserProfile)JsonConvert.DeserializeObject(content, typeof(UserProfile));
            }

            user.Party = await _registerService.GetParty(user.PartyId);
            return user;
        }

        private string GetProfilePath(int userId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RegisterMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Profile\User", userId.ToString() + ".json");
        }
    }
}
