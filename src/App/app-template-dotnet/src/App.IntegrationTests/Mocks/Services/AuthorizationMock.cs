using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Interface;
using Altinn.Platform.Register.Models;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class AuthorizationMock : IAuthorization
    {
        public Task<List<Party>> GetPartyList(int userId)
        {
            throw new NotImplementedException();
        }

        public Task<bool?> ValidateSelectedParty(int userId, int partyId)
        {
            bool? isvalid = true;

            if (userId == 1)
            {
                isvalid = false;
            }

            return Task.FromResult(isvalid);
        }
    }
}
