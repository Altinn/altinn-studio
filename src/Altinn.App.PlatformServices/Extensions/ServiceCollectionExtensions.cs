using System;

using Altinn.App.Core.Implementation;
using Altinn.App.Core.Interface;
using Altinn.App.PlatformServices.Implementation;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.PlatformServices.Options;
using Altinn.App.Services;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Decorators;
using Altinn.App.Services.Filters;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
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
            services.Configure<AppSettings>(configuration.GetSection("AppSettings"));
            services.Configure<GeneralSettings>(configuration.GetSection("GeneralSettings"));
            services.Configure<PlatformSettings>(configuration.GetSection("PlatformSettings"));
            services.Configure<CacheSettings>(configuration.GetSection("CacheSettings"));

            services.AddHttpClient<IApplication, ApplicationClient>();
            services.AddHttpClient<IAuthentication, AuthenticationClient>();
            services.AddHttpClient<IAuthorization, AuthorizationClient>();
            services.AddHttpClient<IData, DataClient>();
            services.AddHttpClient<IDSF, RegisterDSFClient>();
            services.AddHttpClient<IER, RegisterERClient>();
            services.AddHttpClient<IInstance, InstanceClient>();
            services.AddHttpClient<IInstanceEvent, InstanceEventClient>();
            services.AddHttpClient<IEvents, EventsClient>();
            services.AddHttpClient<IPDF, PDFClient>();
            services.AddHttpClient<IProfile, ProfileClient>();
            services.Decorate<IProfile, ProfileClientCachingDecorator>();
            services.AddHttpClient<IRegister, RegisterClient>();
            services.AddHttpClient<IText, TextClient>();
            services.AddHttpClient<IProcess, ProcessAppSI>();
            services.AddHttpClient<IPersonRetriever, PersonClient>();

            services.AddTransient<IUserTokenProvider, UserTokenProvider>();
            services.AddTransient<IAccessTokenGenerator, AccessTokenGenerator>();
            services.AddTransient<IPersonLookup, PersonService>();
            services.AddTransient<IApplicationLanguage, ApplicationLanguage>();
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
            services.AddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();
            services.AddHttpClient<IEFormidlingClient, Altinn.Common.EFormidlingClient.EFormidlingClient>();
            services.AddSingleton<IAppResources, AppResourcesSI>();
            services.AddTransient<IProcessEngine, ProcessEngine>();
            services.AddTransient<IProcessChangeHandler, ProcessChangeHandler>();
            services.AddTransient<IPageOrder, DefaultPageOrder>();
            services.Configure<Altinn.Common.PEP.Configuration.PepSettings>(configuration.GetSection("PEPSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(configuration.GetSection("PlatformSettings"));
            services.Configure<AccessTokenSettings>(configuration.GetSection("AccessTokenSettings"));
            services.Configure<Altinn.Common.EFormidlingClient.Configuration.EFormidlingClientSettings>(configuration.GetSection("EFormidlingClientSettings"));
            services.Configure<FrontEndSettings>(configuration.GetSection(nameof(FrontEndSettings)));
            AddAppOptions(services);
            AddPdfServices(services);

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
                services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
                services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
                services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
            }
        }

        private static void AddPdfServices(IServiceCollection services)
        {
            services.AddTransient<IPdfService, PdfService>();

            // In old versions of the app the PdfHandler did not have an interface and
            // was new'ed up in the app. We now have an interface to customize the pdf
            // formatting and this registration is done to ensure we always have a pdf
            // handler registered.
            // If someone wants to customize pdf formatting the PdfHandler class in the
            // app should be used and registered in the DI container.
            services.AddTransient<ICustomPdfHandler, NullPdfHandler>();
        }

        private static void AddAppOptions(IServiceCollection services)
        {
            // Main service for interacting with options
            services.AddTransient<IAppOptionsService, AppOptionsService>();

            // Services related to application options
            services.AddTransient<AppOptionsFactory>();
            services.AddTransient<IAppOptionsProvider, DefaultAppOptionsProvider>();
            services.AddTransient<IAppOptionsFileHandler, AppOptionsFileHandler>();

            // Services related to instance aware and secure app options
            services.AddTransient<InstanceAppOptionsFactory>();
        }
    }
}
