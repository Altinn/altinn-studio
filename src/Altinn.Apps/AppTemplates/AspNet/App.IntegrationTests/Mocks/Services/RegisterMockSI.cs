using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    class RegisterMockSI : IRegister
    {
        public RegisterMockSI(IDSF dsfService, IER erService)
        {
            DSF = dsfService;
            ER = erService;
        }
        public IDSF DSF { get; }

        public IER ER { get; }

        public Task<Party> GetParty(int partyId)
        {
            Party party = new Party
            {
                PartyId = partyId,
                Name = "Test Lookup",
                SSN = "12345678901",
                PartyTypeName = PartyType.Person,
            };

            return Task.FromResult(party);
        }

        public Task<Party> LookupParty(string personOrOrganisationNumber)
        {
            Party party = new Party
            {
                PartyId = 1000,
                Name = "Test Lookup",
                SSN = personOrOrganisationNumber,
                PartyTypeName = PartyType.Person,
            };

            return Task.FromResult(party);
        }
       
    }
}
