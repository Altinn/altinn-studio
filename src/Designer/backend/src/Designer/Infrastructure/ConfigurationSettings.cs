#nullable disable
using Altinn.Common.AccessToken.Configuration;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Infrastructure.Models;
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
        public static IServiceCollection ConfigureNonMarkedSettings(this IServiceCollection services, IConfiguration configuration)
        {
            services.RegisterSettings<KeyVaultSettings>(configuration, "kvSetting");
            services.RegisterSettings<AzureDevOpsSettings>(configuration, "Integrations:AzureDevOpsSettings");
            return services;
        }
    }
}
