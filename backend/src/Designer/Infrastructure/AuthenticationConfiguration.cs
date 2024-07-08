using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

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
        /// <param name="config">The configuration</param>
        /// <param name="env">The web hosting environment</param>
        public static IServiceCollection ConfigureAuthentication(this IServiceCollection services,
            IConfiguration config, IWebHostEnvironment env)
        {
            return AddGiteaOidcAuthentication(services, config);
        }

        private static IServiceCollection AddGiteaOidcAuthentication(this IServiceCollection services,
            IConfiguration configuration)
        {
            var oidcSettings = configuration.GetSection(nameof(OidcLoginSettings)).Get<OidcLoginSettings>();

            services
                .AddAuthentication(options =>
                {
                    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
                })
                .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
                {
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.Cookie.SameSite = SameSiteMode.Strict;
                    options.Cookie.IsEssential = true;

                    options.ExpireTimeSpan = TimeSpan.FromMinutes(oidcSettings.CookieExpiryTimeInMinutes);
                    options.SlidingExpiration = true;

                    options.Events.OnRedirectToAccessDenied = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    };
                })
                .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme,
                    options =>
                    {
                        options.Authority = oidcSettings!.Authority;
                        options.ClientId = oidcSettings.ClientId;
                        options.ClientSecret = oidcSettings.ClientSecret;

                        options.ResponseType = OpenIdConnectResponseType.Code;
                        options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                        options.AuthenticationMethod = OpenIdConnectRedirectBehavior.RedirectGet;

                        options.Scope.Clear();
                        foreach (string scope in oidcSettings.Scopes!)
                        {
                            options.Scope.Add(scope);
                        }

                        options.UsePkce = true;
                        options.GetClaimsFromUserInfoEndpoint = true;
                        options.SaveTokens = true;
                        options.MapInboundClaims = false;
                        options.RequireHttpsMetadata = oidcSettings.RequireHttpsMetadata;
                        options.TokenValidationParameters = new TokenValidationParameters
                        {
                            NameClaimType = "preferred_username"
                        };


                        // options.Events.OnRedirectToIdentityProvider = context =>
                        // {
                        //     if (!context.Request.Path.StartsWithSegments("/login"))
                        //     {
                        //         context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        //         context.HandleResponse();
                        //     }
                        //
                        //     return Task.CompletedTask;
                        // };
                    });

            return services;
        }
    }
}
