using Altinn.App.PlatformServices.Implementation;
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
    }
}
