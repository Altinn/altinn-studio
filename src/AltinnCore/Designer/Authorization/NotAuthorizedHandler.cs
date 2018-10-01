using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace AltinnCore.Designer.Authorization
{
    /// <summary>
    /// This handler is called by the authentication/Authorization framework when user is redirected by a authorization
    /// handler 
    /// </summary>
    public static class NotAuthorizedHandler
    {
        /// <summary>
        /// Redirects user to the correct page depending if the not authorized is caused by not having
        /// the needed rights or not having the correct authentication level
        /// <see href="https://github.com/aspnet/Mvc/issues/4890"/> for details
        /// </summary>
        /// <param name="context">The context</param>
        /// <returns>A async task</returns>
        #pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        public static async Task RedirectToNotAuthorized(RedirectContext<CookieAuthenticationOptions> context)
        #pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            bool requireUpgrade = false;
            if (context.HttpContext.Items["upgrade"] != null)
            {
                requireUpgrade = (bool)context.HttpContext.Items["upgrade"];
                int requiredAuthenticationLevel = Convert.ToInt32(context.HttpContext.Items["requiredLevel"]);
                if (requireUpgrade)
                {
                    context.Response.Redirect("/Home/UpgradeAuthentication/" + requiredAuthenticationLevel);
                }
                else
                {
                    context.Response.Redirect("/Home/NotAuthorized/");
                }
            }
        }
    }
}
