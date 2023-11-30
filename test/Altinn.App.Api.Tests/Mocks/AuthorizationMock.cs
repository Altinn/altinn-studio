﻿using Altinn.Platform.Register.Models;
using System.Security.Claims;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks
{
    public class AuthorizationMock : IAuthorizationClient
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

        /// <summary>
        /// Mock method that returns false for actions ending with _unauthorized, and true for all other actions.
        /// </summary>
        /// <param name="appIdentifier"></param>
        /// <param name="instanceIdentifier"></param>
        /// <param name="user"></param>
        /// <param name="action"></param>
        /// <param name="taskId"></param>
        /// <returns></returns>
        /// <exception cref="NotImplementedException"></exception>
        public async Task<bool> AuthorizeAction(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, ClaimsPrincipal user, string action, string? taskId = null)
        {
            await Task.CompletedTask;
            if(action.EndsWith("_unauthorized"))
            {
                return false;
            }

            return true;
        }

        public async Task<Dictionary<string, bool>> AuthorizeActions(Instance instance, ClaimsPrincipal user, List<string> actions)
        {
            await Task.CompletedTask;
            Dictionary<string, bool> authorizedActions = new Dictionary<string, bool>();
            foreach (var action in actions)
            {
                if(action.EndsWith("_unauthorized"))
                {
                    authorizedActions.Add(action, false);
                }
                else
                {
                    authorizedActions.Add(action, true);
                }
            }

            return authorizedActions;
        }
    }
}
