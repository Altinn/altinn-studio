using System;

using Altinn.App.PlatformServices.Implementation;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;

using AltinnCore.Authentication.Constants;

using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.PlatformServices.Extensions
{
    /// <summary>
    /// This class holds a collection of extension methods for the <see cref="IServiceCollection"/> interface.
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Adds all http clients for platform functionality.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
        /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
        /// <param name="env">A reference to the current <see cref="IWebHostEnvironment"/> object.</param>
        public static void AddPlatformServices(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
        {
            // Registered as HttpClients so default HttpClientFactory is used
            services.AddHttpClient<IApplication, ApplicationAppSI>();
            services.AddHttpClient<IAuthentication, AuthenticationAppSI>();
            services.AddHttpClient<IAuthorization, AuthorizationAppSI>();
            services.AddHttpClient<IData, DataAppSI>();
            services.AddHttpClient<IDSF, RegisterDSFAppSI>();
            services.AddHttpClient<IER, RegisterERAppSI>();
            services.AddHttpClient<IInstance, InstanceAppSI>();
            services.AddHttpClient<IInstanceEvent, InstanceEventAppSI>();
            services.AddHttpClient<IEvents, EventsAppSI>();
            services.AddHttpClient<IPDF, PDFSI>();
            services.AddHttpClient<IProcess, ProcessAppSI>();
            services.AddHttpClient<IProfile, ProfileAppSI>();
            services.AddHttpClient<IRegister, RegisterAppSI>();
            services.AddHttpClient<IText, TextAppSI>();

            services.Configure<AppSettings>(configuration.GetSection("AppSettings"));
            services.Configure<GeneralSettings>(configuration.GetSection("GeneralSettings"));
            services.Configure<PlatformSettings>(configuration.GetSection("PlatformSettings"));
        }

        /// <summary>
        /// Adds all the app services.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
        /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
        /// <param name="env">A reference to the current <see cref="IWebHostEnvironment"/> object.</param>
        public static void AddAppServices(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
        {
            // Services for Altinn App 
            services.AddTransient<IPDP, PDPAppSI>();
            services.AddTransient<IValidation, ValidationAppSI>();
            services.AddTransient<IPrefill, PrefillSI>();
            services.AddTransient<IAccessTokenGenerator, AccessTokenGenerator>();
            services.AddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();
            services.AddHttpClient<IEFormidlingClient, Altinn.Common.EFormidlingClient.EFormidlingClient>();
            services.AddSingleton<IAppResources, AppResourcesSI>();

            services.Configure<Altinn.Common.PEP.Configuration.PepSettings>(configuration.GetSection("PEPSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(configuration.GetSection("PlatformSettings"));
            services.Configure<AccessTokenSettings>(configuration.GetSection("AccessTokenSettings"));
            services.Configure<Altinn.Common.EFormidlingClient.Configuration.EFormidlingClientSettings>(configuration.GetSection("EFormidlingClientSettings"));

            if (!env.IsDevelopment())
            {
                services.AddSingleton<ISecrets, SecretsAppSI>();
                services.Configure<KeyVaultSettings>(configuration.GetSection("kvSetting"));
            }
            else
            {
                services.AddSingleton<ISecrets, SecretsLocalAppSI>();
            }

            // Set up application insights
            string applicationInsightsKey = env.IsDevelopment() ?
             configuration["ApplicationInsights:InstrumentationKey"]
             : Environment.GetEnvironmentVariable("ApplicationInsights__InstrumentationKey");

            if (!string.IsNullOrEmpty(applicationInsightsKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightsKey);
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
            }
        }
    }
}
