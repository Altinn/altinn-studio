using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Profile.Models;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class ProfileMockSI : IProfile
    {
        public Task<UserProfile> GetUserProfile(int userId)
        {
            return Task.FromResult(new UserProfile() { UserId = userId });
        }
    }
}
