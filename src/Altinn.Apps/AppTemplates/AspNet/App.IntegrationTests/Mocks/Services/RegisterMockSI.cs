using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;

using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Services
{
    public class RegisterMockSI : IRegister
    {
        private readonly IDSF _dsfService;
        private readonly IER _erService;

        public RegisterMockSI(IDSF dsfService, IER erService)
        {
            _dsfService = dsfService;
            _erService = erService;
        }

        public IDSF DSF => _dsfService;

        public IER ER => _erService;

        public async Task<Party> GetParty(int partyId)
        {
            if (partyId == 1001)
            {
                // Specific test for authorization in register
                throw new ServiceException(HttpStatusCode.Unauthorized, "Unauthorized for party");
            }

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

        public Task<Party> LookupParty(PartyLookup partyLookup)
        {
            if (!string.IsNullOrEmpty(partyLookup.Ssn))
            {
                // TODO: fetch from disk
                Party party = new Party
                {
                    PartyId = 1000,
                    Name = "Test Lookup",
                    SSN = partyLookup.Ssn,
                    PartyTypeName = PartyType.Person,
                };

                return Task.FromResult(party);
            }

            return Task.FromResult(new Party());
        }

        private string GetPartyPath(int partyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RegisterMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Register\Party", partyId.ToString() + ".json");
        }
    }
}
