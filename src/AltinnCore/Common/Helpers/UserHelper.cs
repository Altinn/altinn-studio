using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// The helper for user functionality
    /// </summary>
    public class UserHelper
    {
        private readonly IProfile _profileService;
        private readonly IRegister _registerService;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserHelper"/> class
        /// </summary>
        /// <param name="profileService">The ProfileService (defined in Startup.cs)</param>
        /// <param name="registerService">The RegisterService (defined in Startup.cs)</param>
        public UserHelper(IProfile profileService, IRegister registerService)
        {
            this._profileService = profileService;
            this._registerService = registerService;
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

            userContext.UserParty = await _registerService.GetParty(userContext.PartyId);

            if (context.Request.Cookies["altinncorereportee"] != null)
            {
                userContext.PartyId = Convert.ToInt32(context.Request.Cookies["altinncorereportee"]);
            }

            userContext.Party = await _registerService.GetParty(userContext.PartyId);
            return userContext;
        }

        /// <summary>
        /// Returns the user context for a given user and party Id
        /// </summary>
        /// <param name="context">The HttpContext</param>
        /// <param name="userId">The user id</param>
        /// <param name="partyId">The party id</param>
        /// <returns>The UserContext</returns>
        public async Task<UserContext> CreateUserContextBasedOnUserAndParty(HttpContext context, int userId, int partyId)
        {
            UserContext userContext = new UserContext() { User = context.User };
            userContext.UserId = userId;
            userContext.PartyId = partyId;
            userContext.Party = await _registerService.GetParty(userContext.PartyId);

            // userContext.UserParty = await _registerService.GetParty(userContext.PartyId); // this userPartyId is not available at this point.
            return userContext;
        }
    }
}
