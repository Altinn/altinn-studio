using System;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Authorization;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

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
        public static IServiceCollection ConfigureAuthentication(this IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
        {
            GeneralSettings generalSettings = config.GetSection(nameof(GeneralSettings)).Get<GeneralSettings>();

            return generalSettings.UseHackyLoginFlow?
                AddHackyAuthenticationFlow(services, env, generalSettings)
                : AddGiteaOidcAuthentication(services, config);
        }

        private static IServiceCollection AddHackyAuthenticationFlow(IServiceCollection services, IWebHostEnvironment env,
            GeneralSettings generalSettings)
        {
            string schema = env.IsDevelopment() ? "http://" : "https://";
            string loginUrl = $"{schema}{generalSettings.HostName}/ Home/Login/";

            // Configure Authentication
            // Use [Authorize] to require login on MVC Controller Actions
            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.AccessDeniedPath = "/Home/NotAuthorized/";
                    options.LogoutPath = "/Home/Logout/";
                    options.Cookie.Name = Constants.General.DesignerCookieName;
                    options.Events = new CookieAuthenticationEvents
                    {
                        // Add Custom Event handler to be able to redirect users for authentication upgrade
                        OnRedirectToAccessDenied = NotAuthorizedHandler.RedirectToNotAuthorized,
                        OnRedirectToLogin = async context =>
                        {
                            if (context.Request.Path.Value.Contains("keepalive", System.StringComparison.OrdinalIgnoreCase))
                            {
                                context.HttpContext.Response.StatusCode = 401;
                            }
                            else
                            {
                                context.HttpContext.Response.Redirect(loginUrl);
                            }

                            await Task.CompletedTask;
                        }
                    };
                });

            return services;
        }


        private static IServiceCollection AddGiteaOidcAuthentication(this IServiceCollection services, IConfiguration configuration)
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

                    options.ExpireTimeSpan = TimeSpan.FromSeconds(oidcSettings.CookieExpiryTimeInSeconds);
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

                        options.Events.OnRedirectToIdentityProvider = context =>
                        {
                            // if (!context.Request.Path.StartsWithSegments("/SomeLoginPath"))
                            // {
                            //     context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                            //     context.HandleResponse();
                            // }

                            return Task.CompletedTask;
                        };

                        options.Events.OnTokenValidated = async ctx =>
                        {
                            // string accessToken = ctx.ProtocolMessage.AccessToken;
                            // var giteaClient = ctx.HttpContext.RequestServices.GetService<IGitea>();

                            // Add custom logic here
                            await Task.CompletedTask;
                        };
                    });

            return services;
        }

    }
}
