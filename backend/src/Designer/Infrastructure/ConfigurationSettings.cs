using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Models;
using AltinnCore.Authentication.Constants;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for registering configuration related classes to the DI container
    /// </summary>
    public static class ConfigurationSettings
    {
        /// <summary>
        /// Extension method that registers configuration related classes to the DI container
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        /// <param name="configuration">The configuration for the project</param>
        public static IServiceCollection ConfigureSettings(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<ServiceRepositorySettings>(configuration.GetSection("ServiceRepositorySettings"));
            services.Configure<TestdataRepositorySettings>(configuration.GetSection("TestdataRepositorySettings"));
            services.Configure<GeneralSettings>(configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(configuration.GetSection("kvSetting"));
            services.Configure<CertificateSettings>(configuration.GetSection("CertificateSettings"));
            services.Configure<PlatformSettings>(configuration.GetSection("PlatformSettings"));
            services.Configure<AzureDevOpsSettings>(configuration.GetSection("Integrations:AzureDevOpsSettings"));  
            services.Configure<PostgreSQLSettings>(configuration.GetSection("PostgreSQLSettings"));
            return services;
        }
    }
}
