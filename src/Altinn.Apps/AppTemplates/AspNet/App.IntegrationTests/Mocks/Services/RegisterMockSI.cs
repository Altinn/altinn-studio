using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    class RegisterMockSI : IRegister
    {
        private readonly IDSF _dsfService;
        private readonly IER _erService;
        public RegisterMockSI(IDSF dsfService, IER erService)
        {
            _dsfService = dsfService;
            _erService = erService;
        }
        public IDSF DSF { get {return _dsfService;} }

        public IER ER { get {return _erService;} }

        public async Task<Party> GetParty(int partyId)
        {
            string partyPath = GetPartyPath(partyId);
            if (File.Exists(partyPath))
            {
                string content = System.IO.File.ReadAllText(partyPath);
                Party party = JsonConvert.DeserializeObject<Party>(content);

                if (party.OrgNumber != null)
                {
                    party.Organization = await _erService.GetOrganization(party.OrgNumber);
                }

                if (party.SSN != null)
                {
                    party.Person = await _dsfService.GetPerson(party.SSN);
                }

                return party;
            }
            return null;
        }

        public Task<Party> LookupParty(string personOrOrganisationNumber)
        {
            // TODO: fetch from disk
            Party party = new Party
            {
                PartyId = 1000,
                Name = "Test Lookup",
                SSN = personOrOrganisationNumber,
                PartyTypeName = PartyType.Person,
            };

            return Task.FromResult(party);
        }

        private string GetPartyPath(int partyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RegisterMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Register\Party", partyId.ToString() + ".json");
        }
    }
}
