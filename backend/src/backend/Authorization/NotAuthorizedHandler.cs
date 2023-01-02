using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Altinn.Studio.Designer.Authorization
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
        public static async Task RedirectToNotAuthorized(RedirectContext<CookieAuthenticationOptions> context)
        {
            if (context.HttpContext.Items["upgrade"] != null)
            {
                bool requireUpgrade = (bool)context.HttpContext.Items["upgrade"];
                if (requireUpgrade)
                {
                    int requiredAuthenticationLevel = Convert.ToInt32(context.HttpContext.Items["requiredLevel"]);
                    context.Response.Redirect("/Home/UpgradeAuthentication/" + requiredAuthenticationLevel);
                }
                else
                {
                    context.Response.Redirect("/Home/NotAuthorized/");
                }
            }

            await Task.CompletedTask;
        }
    }
}
