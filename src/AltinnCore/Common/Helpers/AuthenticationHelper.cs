using AltinnCore.Common.Constants;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace AltinnCore.Common.Helpers
{
    public static class AuthenticationHelper
    {
        public static string GetDeveloperUserName(HttpContext context)
        {
            string userName = null;

            if(context.User != null)
            {
                foreach (Claim claim in context.User.Claims)
                {
                    if (claim.Type.Equals(AltinnCoreClaimTypes.Developer))
                    {
                        userName = claim.Value;
                    }
                }
            }

            return userName;
        }

        public static string GetGiteaSession(HttpContext context, string sessionCookieId)
         {
            if (context.Request.Cookies != null && context.Request.Cookies.ContainsKey(sessionCookieId))
            {
                return context.Request.Cookies[sessionCookieId];
            }

           return null;
        }
    }
}
