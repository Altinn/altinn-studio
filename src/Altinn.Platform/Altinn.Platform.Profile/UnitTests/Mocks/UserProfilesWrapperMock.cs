using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace UnitTests.Mocks
{
    public class UserProfilesWrapperMock : IUserProfiles
    {
        public async Task<UserProfile> GetUser(int userId)
        {
            UserProfile user = null;
            string path = "../../../Testdata/Profile/User/" + userId + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                user = (UserProfile)JsonConvert.DeserializeObject(content, typeof(UserProfile));
            }

            user.Party = await GetParty(user.PartyId);
            return user;
        }

        private async Task<Party> GetParty(int partyId)
        {
            Party party = null;
            string path = "../../../TestData/Register/Party/" + partyId + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                party = (Party)JsonConvert.DeserializeObject(content, typeof(Party));
            }

             party.Person = await GetPerson(party.SSN);
         
            return party;
        }

        private async Task<Person> GetPerson(string ssn)
        {
            Person person = null;
            string path = "../../../TestData/Register/Person/" + ssn + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                person = (Person)JsonConvert.DeserializeObject(content, typeof(Person));
            }

            return person;
        }
    }
}
