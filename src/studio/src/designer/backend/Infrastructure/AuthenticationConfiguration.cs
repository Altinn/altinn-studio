using Altinn.Studio.Designer.Authorization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for configuring authentication
    /// </summary>
    public static class AuthenticationConfiguration
    {
        /// <summary>
        /// Extension method that configures authentication
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        public static IServiceCollection ConfigureAuthentication(this IServiceCollection services)
        {
            // Configure Authentication
            // Use [Authorize] to require login on MVC Controller Actions
            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.AccessDeniedPath = "/Home/NotAuthorized/";
                    options.LoginPath = "/Home/Login/";
                    options.LogoutPath = "/Home/Logout/";
                    options.Cookie.Name = Altinn.Studio.Designer.Constants.General.DesignerCookieName;
                    options.Events = new CookieAuthenticationEvents
                    {
                        // Add Custom Event handler to be able to redirect users for authentication upgrade
                        OnRedirectToAccessDenied = NotAuthorizedHandler.RedirectToNotAuthorized,
                    };
                });

            return services;
        }
    }
}
