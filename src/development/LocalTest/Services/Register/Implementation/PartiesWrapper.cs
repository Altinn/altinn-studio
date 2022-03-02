using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;

using LocalTest.Configuration;
using LocalTest.Services.Register.Interface;

using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace LocalTest.Services.Register.Implementation
{
    public class PartiesWrapper : IParties
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IPersons _personService;
        private readonly IOrganizations _organizationService;

        public PartiesWrapper(
            IOptions<LocalPlatformSettings> localPlatformSettings,
            IPersons personsService,
            IOrganizations organizationService)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            _organizationService = organizationService;
            _personService = personsService;
        }

        /// <inheritdoc />
        public async Task<Party> GetParty(int partyId)
        {
            Party party = null;
            string path = _localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Party/" + partyId + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                party = (Party)JsonConvert.DeserializeObject(content, typeof(Party));
            }

            await AddPersonOrOrganization(party);

            return party;
        }

        /// <inheritdoc />
        public async Task<Party> LookupPartyBySSNOrOrgNo(string lookupValue)
        {
            Party party = FindParty(lookupValue);

            await AddPersonOrOrganization(party);

            return party;
        }

        /// <inheritdoc />
        public async Task<int> LookupPartyIdBySSNOrOrgNo(string lookupValue)
        {
            await Task.CompletedTask;

            Party party = FindParty(lookupValue);

            return party?.PartyId ?? -1;
        }

        private Party FindParty(string lookupValue)
        {
            string path = _localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Party";
            string[] allPathsToParties = Directory.GetFiles(path);

            foreach (string partyPath in allPathsToParties)
            {
                string content = File.ReadAllText(partyPath);

                string targetOrgNbr = $"\"orgNumber\": \"{lookupValue}\"";
                string targetSsn = $"\"ssn\": \"{lookupValue}\"";

                if (content.Contains(targetOrgNbr) || content.Contains(targetSsn))
                {
                    return (Party)JsonConvert.DeserializeObject(content, typeof(Party));
                }
            }

            return null;
        }

        private async Task AddPersonOrOrganization(Party party)
        {
            if (party is null)
            {
                return;
            }

            switch (party.PartyTypeName)
            {
                case PartyType.Person:
                    party.Person = await _personService.GetPerson(party.SSN);
                    break;
                case PartyType.Organisation:
                    party.Organization = await _organizationService.GetOrganization(party.OrgNumber);
                    break;
            }
        }
    }
}
