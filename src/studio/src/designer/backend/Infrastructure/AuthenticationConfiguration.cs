using System;
using Altinn.Studio.Designer.Authorization;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Configuration;
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
        public static IServiceCollection ConfigureAuthentication(this IServiceCollection services, IConfiguration config)
        {
            GeneralSettings generalSettings = config.GetSection("GeneralSettings").Get<GeneralSettings>();

            bool isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

            string schema = isDevelopment ? "http://" : "https://";
            string loginUrl = $"{schema}{generalSettings.HostName}/Home/Index";

            // Configure Authentication
            // Use [Authorize] to require login on MVC Controller Actions
            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.AccessDeniedPath = "/Home/NotAuthorized/";
                    options.LoginPath = loginUrl;
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
