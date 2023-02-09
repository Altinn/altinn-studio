using System;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Infrastructure.Health;
using Altinn.App.Api.Infrastructure.Telemetry;
using Altinn.App.Core.Extensions;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.FeatureManagement;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Api.Extensions
{
    /// <summary>
    /// Class for registering requiered services to run an Altinn application.
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Add the controllers and views used by an Altinn application
        /// </summary>
        public static void AddAltinnAppControllersWithViews(this IServiceCollection services)
        {
            // Add API controllers from Altinn.App.Api
            IMvcBuilder mvcBuilder = services.AddControllersWithViews();
            mvcBuilder
                .AddApplicationPart(typeof(InstancesController).Assembly)
                .AddXmlSerializerFormatters()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                });
        }

        /// <summary>
        /// Adds all services to run an Altinn application.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
        /// <param name="config">A reference to the current <see cref="IConfiguration"/> object.</param>
        /// <param name="env">A reference to the current <see cref="IWebHostEnvironment"/> object.</param>
        public static void AddAltinnAppServices(this IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
        {
            services.AddMemoryCache();
            services.AddHealthChecks().AddCheck<HealthCheck>("default_health_check");
            services.AddFeatureManagement();

            services.AddPlatformServices(config, env);
            services.AddAppServices(config, env);
            services.ConfigureDataProtection();

            AddApplicationInsights(services, config, env);
            AddAuthenticationScheme(services, config, env);
            AddAuthorizationPolicies(services);
            AddAntiforgery(services);

            services.AddSingleton<IAuthorizationHandler, AppAccessHandler>();

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });

            // HttpClients for platform functionality. Registered as HttpClient so default HttpClientFactory is used
            services.AddHttpClient<AuthorizationApiClient>();

            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        }

        private static void AddApplicationInsights(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
        {
            string applicationInsightsKey = env.IsDevelopment() ?
                         config["ApplicationInsights:InstrumentationKey"]
                         : Environment.GetEnvironmentVariable("ApplicationInsights__InstrumentationKey");

            if (!string.IsNullOrEmpty(applicationInsightsKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightsKey);
                services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
            }
        }

        private static void AddAuthorizationPolicies(IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                options.AddPolicy("InstanceRead", policy => policy.Requirements.Add(new AppAccessRequirement("read")));
                options.AddPolicy("InstanceWrite", policy => policy.Requirements.Add(new AppAccessRequirement("write")));
                options.AddPolicy("InstanceDelete", policy => policy.Requirements.Add(new AppAccessRequirement("delete")));
                options.AddPolicy("InstanceInstantiate", policy => policy.Requirements.Add(new AppAccessRequirement("instantiate")));
                options.AddPolicy("InstanceComplete", policy => policy.Requirements.Add(new AppAccessRequirement("complete")));
            });
        }

        private static void AddAuthenticationScheme(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
        {
            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        RequireExpirationTime = true,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero
                    };
                    options.JwtCookieName = Altinn.App.Core.Constants.General.RuntimeCookieName;
                    options.MetadataAddress = config["AppSettings:OpenIdWellKnownEndpoint"];
                    if (env.IsDevelopment())
                    {
                        options.RequireHttpsMetadata = false;
                    }
                });
        }

        private static void AddAntiforgery(IServiceCollection services)
        {
            services.AddAntiforgery(options =>
            {
                // asp .net core expects two types of tokens: One that is attached to the request as header, and the other one as cookie.
                // The values of the tokens are not the same and both need to be present and valid in a "unsafe" request.

                // Axios which we are using for client-side automatically extracts the value from the cookie named XSRF-TOKEN. We are setting this cookie in the UserController.
                // We will therefore have two token cookies. One that contains the .net core cookie token; And one that is the request token and is added as a header in requests.
                // The tokens are based on the logged-in user and must be updated if the user changes.
                // https://docs.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-3.1
                // https://github.com/axios/axios/blob/master/lib/defaults.js
                options.Cookie.Name = "AS-XSRF-TOKEN";
                options.HeaderName = "X-XSRF-TOKEN";
            });

            services.TryAddSingleton<ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter>();
        }
    }
}