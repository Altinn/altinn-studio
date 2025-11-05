#nullable disable
using System.Threading.Tasks;
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

        public static Task<string> GetDeveloperAppTokenAsync(this HttpContext context)
        {
            return context.GetTokenAsync("access_token");
        }

        public static bool IsAuthenticated(HttpContext context)
        {
            return context.User.Identity?.IsAuthenticated ?? false;
        }
    }
}
