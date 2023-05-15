using Altinn.App.Core.Interface;
using Altinn.Platform.Register.Models;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Core.Models;

namespace Altinn.App.Api.Tests.Mocks
{
    public class AuthorizationMock : IAuthorization
    {
        public Task<List<Party>?> GetPartyList(int userId)
        {
            throw new NotImplementedException();
        }

        public Task<bool?> ValidateSelectedParty(int userId, int partyId)
        {
            bool? isvalid = userId != 1;

            return Task.FromResult(isvalid);
        }

        public async Task<bool> AuthorizeAction(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, ClaimsPrincipal user, string action, string? taskId = null)
        {
            throw new NotImplementedException();
        }
    }
}
