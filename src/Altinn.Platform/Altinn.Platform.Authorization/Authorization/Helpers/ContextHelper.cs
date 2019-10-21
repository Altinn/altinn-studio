using System;
using System.Security.Claims;
using AltinnCore.Authentication.Constants;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Platform.Authorization.Helpers
{
    /// <summary>
    /// Helper class to get context information
    /// </summary>
    public static class ContextHelper
    {
        /// <summary>
        /// Returns the user context
        /// </summary>
        /// <param name="context">The HttpContext</param>
        /// <returns>The UserContext</returns>
        public static UserContext GetUserContext(HttpContext context)
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

            if (context.Request.Cookies["AltinnStudioRuntime"] != null)
            {
                userContext.PartyId = Convert.ToInt32(context.Request.Cookies["AltinnStudioRuntime"]);
            }
            else
            {
                userContext.PartyId = userContext.PartyId;
            }

            return userContext;
        }
    }
}
