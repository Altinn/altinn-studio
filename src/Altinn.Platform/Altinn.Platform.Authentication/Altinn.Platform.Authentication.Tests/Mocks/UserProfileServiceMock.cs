using System;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Profile.Models;

namespace Altinn.Platform.Authentication.Tests.Mocks
{
    public class UserProfileServiceMock : IUserProfileService
    {
        public Task<UserProfile> CreateUser(UserProfile user)
        {
            user.UserId = 234234;
            user.PartyId = 23423400;

            return Task.FromResult(user);
        }

        public Task<UserProfile> GetUser(string ssnOrExternalIdentity)
        {
            UserProfile profile = null;
            if (ssnOrExternalIdentity.Equals("uidp:2346t44663423s"))
            {
                return Task.FromResult(new UserProfile() { UserId = 234235, PartyId = 23423500 });
            }

            return Task.FromResult(profile);
        }
    }
}
