using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Features.FileAnalyzis;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.PageOrder;
using Altinn.App.Core.Features.Pdf;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Infrastructure.Clients.Authentication;
using Altinn.App.Core.Infrastructure.Clients.Authorization;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Infrastructure.Clients.KeyVault;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Infrastructure.Clients.Profile;
using Altinn.App.Core.Infrastructure.Clients.Register;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Core.Extensions
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

            AddApplicationIdentifier(services);

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
            services.AddHttpClient<IProcess, ProcessClient>();
            services.AddHttpClient<IPersonRetriever, PersonClient>();

            services.TryAddTransient<IUserTokenProvider, UserTokenProvider>();
            services.TryAddTransient<IAccessTokenGenerator, AccessTokenGenerator>();
            services.TryAddTransient<IPersonLookup, PersonService>();
            services.TryAddTransient<IApplicationLanguage, Internal.Language.ApplicationLanguage>();
        }

        private static void AddApplicationIdentifier(IServiceCollection services)
        {
            services.AddSingleton<AppIdentifier>(sp =>
            {
                var appIdentifier = GetApplicationId();
                return new AppIdentifier(appIdentifier);
            });
        }

        private static string GetApplicationId()
        {
            string appMetaDataString = File.ReadAllText("config/applicationmetadata.json");
            JObject appMetadataJObject = JObject.Parse(appMetaDataString);

            var id = appMetadataJObject?.SelectToken("id")?.Value<string>();

            if (id == null)
            {
                throw new KeyNotFoundException("Could not find id in applicationmetadata.json. Please ensure applicationmeta.json is well formed and contains a key for id.");
            }

            return id;
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
            services.TryAddTransient<IPDP, PDPAppSI>();
            services.TryAddTransient<IValidation, ValidationAppSI>();
            services.TryAddTransient<IPrefill, PrefillSI>();
            services.TryAddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();
            services.TryAddSingleton<IAppResources, AppResourcesSI>();
            services.TryAddSingleton<IAppMetadata, AppMetadata>();
            services.TryAddSingleton<IFrontendFeatures, FrontendFeatures>();
            services.TryAddTransient<IAppEvents, DefaultAppEvents>();
            services.TryAddTransient<ITaskEvents, DefaultTaskEvents>();
            services.TryAddTransient<IPageOrder, DefaultPageOrder>();
            services.TryAddTransient<IInstantiationProcessor, NullInstantiationProcessor>();
            services.TryAddTransient<IInstantiationValidator, NullInstantiationValidator>();
            services.TryAddTransient<IInstanceValidator, NullInstanceValidator>();
            services.TryAddTransient<IDataProcessor, NullDataProcessor>();
            services.TryAddTransient<IAppModel, DefaultAppModel>();
            services.TryAddTransient<DataListsFactory>();
            services.TryAddTransient<InstanceDataListsFactory>();
            services.TryAddTransient<IDataListsService, DataListsService>();
            services.TryAddTransient<LayoutEvaluatorStateInitializer>();
            services.TryAddTransient<IPdfGeneratorClient, PdfGeneratorClient>();
            services.Configure<Altinn.Common.PEP.Configuration.PepSettings>(configuration.GetSection("PEPSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(configuration.GetSection("PlatformSettings"));
            services.Configure<AccessTokenSettings>(configuration.GetSection("AccessTokenSettings"));
            services.Configure<FrontEndSettings>(configuration.GetSection(nameof(FrontEndSettings)));
            services.Configure<PdfGeneratorSettings>(configuration.GetSection(nameof(PdfGeneratorSettings)));
            AddAppOptions(services);
            AddPdfServices(services);
            AddEventServices(services);
            AddProcessServices(services);
            AddFileAnalyserServices(services);
            AddFileValidatorServices(services);

            if (!env.IsDevelopment())
            {
                services.TryAddSingleton<ISecrets, SecretsClient>();
                services.Configure<KeyVaultSettings>(configuration.GetSection("kvSetting"));
            }
            else
            {
                services.TryAddSingleton<ISecrets, SecretsLocalClient>();
            }
        }

        /// <summary>
        /// Checks if a service is already added to the collection.
        /// </summary>
        /// <returns>true if the services allready exists in the collection, otherwise false</returns>
        public static bool IsAdded(this IServiceCollection services, Type serviceType)
        {
            if (services.Any(x => x.ServiceType == serviceType))
            {
                return true;
            }

            return false;
        }

        private static void AddEventServices(IServiceCollection services)
        {
            services.AddTransient<IEventHandler, SubscriptionValidationHandler>();
            services.AddTransient<IEventHandlerResolver, EventHandlerResolver>();
            services.TryAddSingleton<IEventSecretCodeProvider, KeyVaultEventSecretCodeProvider>();

            // The event subscription client depends uppon a maskinporten messagehandler beeing
            // added to the client during setup. As of now this needs to be done in the apps
            // if subscription is to be added. This registration is to prevent the DI container
            // from failing for the apps not using event subscription. If you try to use
            // event subscription with this client you will get a 401 Unauthorized.
            if (!services.IsAdded(typeof(IEventsSubscription)))
            {
                services.AddHttpClient<IEventsSubscription, EventsSubscriptionClient>();
            }
        }

        private static void AddPdfServices(IServiceCollection services)
        {
            services.TryAddTransient<IPdfOptionsMapping, PdfOptionsMapping>();
            services.TryAddTransient<IPdfService, PdfService>();

            // In old versions of the app the PdfHandler did not have an interface and
            // was new'ed up in the app. We now have an interface to customize the pdf
            // formatting and this registration is done to ensure we always have a pdf
            // handler registered.
            // If someone wants to customize pdf formatting the PdfHandler class in the
            // app should be used and registered in the DI container.
            services.TryAddTransient<IPdfFormatter, NullPdfFormatter>();
        }

        private static void AddAppOptions(IServiceCollection services)
        {
            // Main service for interacting with options
            services.TryAddTransient<IAppOptionsService, AppOptionsService>();

            // Services related to application options
            services.TryAddTransient<AppOptionsFactory>();
            services.AddTransient<IAppOptionsProvider, DefaultAppOptionsProvider>();
            services.TryAddTransient<IAppOptionsFileHandler, AppOptionsFileHandler>();

            // Services related to instance aware and secure app options
            services.TryAddTransient<InstanceAppOptionsFactory>();
        }

        private static void AddProcessServices(IServiceCollection services)
        {
            services.TryAddTransient<IProcessEngine, ProcessEngine>();
            services.TryAddTransient<IProcessChangeHandler, ProcessChangeHandler>();
            services.TryAddSingleton<IProcessReader, ProcessReader>();
            services.TryAddTransient<ExclusiveGatewayFactory>();
            services.TryAddTransient<IFlowHydration, FlowHydration>();
        }

        private static void AddFileAnalyserServices(IServiceCollection services)
        {
            services.TryAddTransient<IFileAnalysisService, FileAnalysisService>();
            services.TryAddTransient<IFileAnalyserFactory, FileAnalyserFactory>();
        }

        private static void AddFileValidatorServices(IServiceCollection services)
        {
            services.TryAddTransient<IFileValidationService, FileValidationService>();
            services.TryAddTransient<IFileValidatorFactory, FileValidatorFactory>();
        }
    }
}
