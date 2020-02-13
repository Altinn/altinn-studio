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
    /// <summary>
    /// The parties wrapper
    /// </summary>
    public class PartiesWrapper : IParties
    {
        private readonly LocalPlatformSettings _localPlatformSettings;
        private readonly IPersons _personService;
        private readonly IOrganizations _organizationService;


        public PartiesWrapper(IOptions<LocalPlatformSettings> localPlatformSettings,
            IPersons personsService, IOrganizations organizationService)
        {
            _localPlatformSettings = localPlatformSettings.Value;
            this._organizationService = organizationService;
            this._personService = personsService;
        }

        /// <inheritdoc />
        public async Task<Party> GetParty(int partyId)
        {
            Party party = null;
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Party/" + partyId + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                party = (Party)JsonConvert.DeserializeObject(content, typeof(Party));
            }


            if (party.PartyTypeName.Equals(PartyType.Person))
            {
                party.Person = await _personService.GetPerson(party.SSN);
            }
            else if (party.PartyTypeName.Equals(PartyType.Organisation))
            {
                party.Organization = await _organizationService.GetOrganization(party.OrgNumber);
            }
            return party;
        }

        /// <inheritdoc />
        public async Task<Party> LookupPartyBySSNOrOrgNo(string lookupValue)
        {
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Party";
            string[] allPathsToOrgs = Directory.GetFiles(path);

            foreach (string orgPath in allPathsToOrgs)
            {
                string content = File.ReadAllText(orgPath);

                string targetOrgNbr = "\"orgNumber\": \"" + lookupValue +"\"";
                string targetSSN = "\"ssn\": " + lookupValue;
                if (content.Contains(targetOrgNbr) || content.Contains(targetSSN))
                {
                    Party party = (Party)JsonConvert.DeserializeObject(content, typeof(Party));
                    return await Task.FromResult(party);
                }
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<int> LookupPartyIdBySSNOrOrgNo(string lookupValue)
        {
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Party";
            string[] allPathsToOrgs = Directory.GetFiles(path);

            foreach (string orgPath in allPathsToOrgs)
            {
                string content = File.ReadAllText(orgPath);

                string targetOrgNbr = "\"orgNumber\": \"" + lookupValue + "\"";
                string targetSSN = "\"ssn\": " + lookupValue;
                if (content.Contains(targetOrgNbr) || content.Contains(targetSSN))
                {
                    Party party = (Party)JsonConvert.DeserializeObject(content, typeof(Party));
                    return await Task.FromResult(party.PartyId);
                }
            }

            return -1;
        }
    }
}
