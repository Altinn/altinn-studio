using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Authentication.Extensions
{
    /// <summary>
    /// Extension for cServiceCollectionExtension
    /// </summary>
    public static class ServiceCollectionExtension
    {
        /// <summary>
        /// Configure the OIDC providers
        /// </summary>
        public static IServiceCollection ConfigureOidcProviders<TOptions>(
        this IServiceCollection services, IConfigurationSection section)
        where
        TOptions : class, IDictionary<string, OidcProvider>
        {
            var values2 = section
            .GetChildren();

            List<OidcProvider> providers = new List<OidcProvider>();
            foreach (IConfigurationSection providerSection in values2)
            {
                OidcProvider prov = new OidcProvider();
                providerSection.Bind(prov);
                prov.IssuerKey = providerSection.Key;
                providers.Add(prov);
            }

            services.Configure<TOptions>(x =>
                providers.ForEach(v => x.Add(v.IssuerKey, v)));

            return services;
        }
    }
}
