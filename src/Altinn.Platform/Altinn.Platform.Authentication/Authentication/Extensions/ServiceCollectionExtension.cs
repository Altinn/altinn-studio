using System.Collections.Generic;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authentication.Extensions
{
    /// <summary>
    /// Extension for ServiceCollectionExtension
    /// </summary>
    public static class ServiceCollectionExtension
    {
        /// <summary>
        /// Configure the OIDC providers
        /// </summary>
        public static IServiceCollection ConfigureOidcProviders(
        this IServiceCollection services, IConfigurationSection section)
        {
            IEnumerable<IConfigurationSection> providerSections = section.GetChildren();

            List<OidcProvider> providers = new List<OidcProvider>();
            foreach (IConfigurationSection providerSection in providerSections)
            {
                OidcProvider prov = new OidcProvider();
                providerSection.Bind(prov);
                prov.IssuerKey = providerSection.Key;
                providers.Add(prov);
            }

            services.Configure<OidcProviderSettings>(x => providers.ForEach(v => x.Add(v.IssuerKey, v)));

            return services;
        }
    }
}
