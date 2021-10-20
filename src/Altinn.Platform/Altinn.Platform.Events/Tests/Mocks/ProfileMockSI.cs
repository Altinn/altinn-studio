using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Profile.Models;

using Newtonsoft.Json;

namespace Altinn.Platform.Events.Tests.Mocks
{
    public class ProfileMockSI : IProfile
    {
        private readonly IRegisterService _registerService;

        public ProfileMockSI(IRegisterService registerService)
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
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ProfileMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, "..", "..", "..", "Data", "Profile", "User", userId.ToString() + ".json");
        }
    }
}
