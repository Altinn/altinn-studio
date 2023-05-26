#nullable enable
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;

using LocalTest.Services.Register.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Register.Implementation
{
    public class PartiesWrapper : IParties
    {
        private readonly TestDataService _testDataService;
        private readonly IPersons _personService;
        private readonly IOrganizations _organizationService;

        public PartiesWrapper(
            TestDataService testDataService,
            IPersons personsService,
            IOrganizations organizationService)
        {
            _testDataService = testDataService;
            _organizationService = organizationService;
            _personService = personsService;
        }

        /// <inheritdoc />
        public async Task<Party?> GetParty(int partyId)
        {
            var data = await _testDataService.GetTestData();
            Party? party = data.Register.Party.TryGetValue(partyId.ToString()!, out var value) ? value : null;

            await AddPersonOrOrganization(party);

            return party;
        }

        /// <inheritdoc />
        public async Task<Party?> LookupPartyBySSNOrOrgNo(string lookupValue)
        {
            Party? party = await FindParty(lookupValue);

            await AddPersonOrOrganization(party);

            return party;
        }

        /// <inheritdoc />
        public async Task<int> LookupPartyIdBySSNOrOrgNo(string lookupValue)
        {
            Party? party = await FindParty(lookupValue);

            return party?.PartyId ?? -1;
        }

        /// <inheritdoc />
        public async Task<List<Party?>> GetPartyList(List<int> partyIds)
        {
            var data = await _testDataService.GetTestData();
            List<Party?> filteredList = new List<Party?>();
            foreach (int partyId in partyIds.Distinct())
            {
                Party? party = data.Register.Party.TryGetValue(partyId.ToString()!, out var value) ? value : null;
                await AddPersonOrOrganization(party);
                filteredList.Add(party);
            }

            return filteredList;
        }

        private async Task<Party?> FindParty(string lookupValue)
        {
            var data = await _testDataService.GetTestData();
            return data.Register.Party.Values.FirstOrDefault((party)=> party.OrgNumber == lookupValue || party.SSN == lookupValue);
        }

        private async Task AddPersonOrOrganization(Party? party)
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
