using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Services.Interfaces;
using Altinn.Platform.Register.Models;

using Newtonsoft.Json;

namespace Altinn.Platform.Profile.Tests.Mocks
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
                user.Party = await GetParty(user.PartyId);
            }
           
            return user;
        }

        public async Task<UserProfile> GetUser(string ssn)
        {
            UserProfile user = null;
            Person person;
            Party party;
            switch (ssn)
            {
                case "01017512345":
                    person = await GetPerson(ssn);
                    party = await GetParty(12345);
                    party.Person = person;
                    user = await GetUser(12345);
                    user.Party = party;
                    break;
                case "01039012345":
                    person = await GetPerson(ssn);
                    party = await GetParty(1337);
                    party.Person = person;
                    user = await GetUser(1337);
                    user.Party = party;
                    break;
                default:
                    break;
            }

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
                party.Person = await GetPerson(party.SSN);
            }            

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

            return await Task.FromResult(person);
        }
    }
}
