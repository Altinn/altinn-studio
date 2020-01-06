using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Services.Helpers
{
    /// <summary>
    /// The helper for user functionality
    /// </summary>
    public class UserHelper
    {
        private readonly IProfile _profileService;
        private readonly IRegister _registerService;
        private readonly GeneralSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserHelper"/> class
        /// </summary>
        /// <param name="profileService">The ProfileService (defined in Startup.cs)</param>
        /// <param name="registerService">The RegisterService (defined in Startup.cs)</param>
        /// <param name="settings">The general settings</param>
        public UserHelper(IProfile profileService, IRegister registerService, IOptions<GeneralSettings> settings)
        {
            _profileService = profileService;
            _registerService = registerService;
            _settings = settings.Value;
        }

        /// <summary>
        /// Returns the user context
        /// </summary>
        /// <param name="context">The HttpContext</param>
        /// <returns>The UserContext</returns>
        public async Task<UserContext> GetUserContext(HttpContext context)
        {
            UserContext userContext = new UserContext() { User = context.User };

            foreach (Claim claim in context.User.Claims)
            {
                if (claim.Type.Equals(AltinnCoreClaimTypes.UserName))
                {
                    userContext.UserName = claim.Value;
                }

                if (claim.Type.Equals(AltinnCoreClaimTypes.UserId))
                {
                    userContext.UserId = Convert.ToInt32(claim.Value);
                }

                if (claim.Type.Equals(AltinnCoreClaimTypes.PartyID))
                {
                    userContext.PartyId = Convert.ToInt32(claim.Value);
                }

                if (claim.Type.Equals(AltinnCoreClaimTypes.AuthenticationLevel))
                {
                    userContext.AuthenticationLevel = Convert.ToInt32(claim.Value);
                }
            }

            UserProfile userProfile = await _profileService.GetUserProfile(userContext.UserId);
            userContext.UserParty = await _registerService.GetParty(userProfile.PartyId);

            if (context.Request.Cookies[_settings.GetAltinnPartyCookieName] != null)
            {
                userContext.PartyId = Convert.ToInt32(context.Request.Cookies[_settings.GetAltinnPartyCookieName]);
            }

            userContext.Party = await _registerService.GetParty(userContext.PartyId);
            return userContext;
        }
    }
}
