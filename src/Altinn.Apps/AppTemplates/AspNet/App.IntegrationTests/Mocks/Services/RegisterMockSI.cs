using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    class RegisterMockSI : IRegister
    {
        public IDSF DSF => throw new NotImplementedException();

        public IER ER => throw new NotImplementedException();

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
