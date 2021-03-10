using Altinn.App.PlatformServices.Implementation;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;

using AltinnCore.Authentication.Constants;

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
        /// Add the required configuration and service needed to access the application owner KeyVault.
        /// </summary>
        /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
        /// <param name="configuration">A reference to the current <see cref="IConfiguration"/> object.</param>
        /// <param name="env">A reference to the current <see cref="IWebHostEnvironment"/> object.</param>
        public static void AddAppSecrets(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
        {
            if (!env.IsDevelopment())
            {
                services.AddSingleton<ISecrets, SecretsAppSI>();
                services.Configure<KeyVaultSettings>(configuration.GetSection("kvSetting"));
            }
            else
            {
                services.AddSingleton<ISecrets, SecretsLocalAppSI>();
            }
        }

        /// <summary>
        /// Adds all http clients for platform functionality.
        /// </summary>
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
        }
    }
}
