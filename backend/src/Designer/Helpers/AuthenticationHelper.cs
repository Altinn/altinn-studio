using System;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// helper class for authentication
    /// </summary>
    public static class AuthenticationHelper
    {
        /// <summary>
        /// Gets the app developer's user name
        /// </summary>
        /// <param name="context">the http context</param>
        /// <returns>The developer user name</returns>
        public static string GetDeveloperUserName(HttpContext context)
        {
            return context.User.Identity?.Name;
        }

        /// <summary>
        /// Gets the Developer App token from cookie
        /// </summary>
        /// <param name="context">The Http Context</param>
        /// <returns>The developer app token</returns>
        public static string GetDeveloperAppToken(HttpContext context)
        {
            return context.GetTokenAsync("access_token").Result;
        }

        public static Task<string> GetDeveloperAppTokenAsync(this HttpContext context)
        {
            return context.GetTokenAsync("access_token");
        }
    }
}
