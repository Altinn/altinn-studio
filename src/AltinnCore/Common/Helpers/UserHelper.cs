using System;
using System.Security.Claims;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// The helper for user functionality
    /// </summary>
    public class UserHelper
    {
        private IProfile _profileService;
        private IRegister _registerService;

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
        public UserContext GetUserContext(HttpContext context)
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

            userContext.UserParty = _registerService.GetParty(userContext.PartyId);

            if (context.Request.Cookies["altinncorereportee"] != null)
            {
                userContext.ReporteeId = Convert.ToInt32(context.Request.Cookies["altinncorereportee"]);
            }
            else
            {
                userContext.ReporteeId = userContext.PartyId;
            }

            userContext.Reportee = _registerService.GetParty(userContext.ReporteeId);
            return userContext;
        }
    }
}
