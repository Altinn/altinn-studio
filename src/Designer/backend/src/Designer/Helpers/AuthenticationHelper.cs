#nullable disable
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
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

        public static async Task<string> GetDeveloperAppTokenAsync(this HttpContext context)
        {
            string token = await context.GetTokenAsync(OpenIdConnectDefaults.AuthenticationScheme, "access_token");

            if (string.IsNullOrEmpty(token))
            {
                token = await context.GetTokenAsync(AnsattPortenConstants.AnsattportenAuthenticationScheme, "access_token");
            }

            return token;
        }

        public static bool IsAuthenticated(HttpContext context)
        {
            return context.User.Identity?.IsAuthenticated ?? false;
        }
    }
}
