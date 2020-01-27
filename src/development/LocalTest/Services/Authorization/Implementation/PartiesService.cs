using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Register.Models;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Services.Authorization.Implementation
{
    public class PartiesService : IParties
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public PartiesService(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<List<Party>> GetParties(int userId)
        {
            string path = GetPartyListPath(userId);
            
            if (File.Exists(path))
            {
                string content = System.IO.File.ReadAllText(path);
                List<Party> instance = (List<Party>)JsonConvert.DeserializeObject(content, typeof(List<Party>));
                return Task.FromResult(instance);
            }

            return null;
        }

        public Task<bool> ValidateSelectedParty(int userId, int partyId)
        {
            return Task.FromResult(true);
        }


        private string GetPartyListPath(int userId)
        {
            return _localPlatformSettings.LocalTestingStaticTestDataPath + _localPlatformSettings.AuthorizationDataFolder + _localPlatformSettings.PartyListFolder + userId + ".json";
        }
    }
}
