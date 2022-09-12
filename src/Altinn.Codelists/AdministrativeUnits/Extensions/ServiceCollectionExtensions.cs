using Altinn.App.Core.Features.Options;
using Altinn.Codelists.AdministrativeUnits.Clients;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.AdministrativeUnits.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddAdministrativeUnits(this IServiceCollection services)
        {
            services.AddMemoryCache();
            services.AddOptions<AdministrativeUnitsOptions>();
            services.AddHttpClient<IAdministrativeUnitsClient, AdministrativeUnitsHttpClient>();
            services.Decorate<IAdministrativeUnitsClient, AdministrativeUnitsHttpClientCached>();
            services.AddTransient<IAppOptionsProvider, CountiesCodelistProvider>();
            services.AddTransient<IAppOptionsProvider, CommunesCodelistProvider>();

            return services;
        }
    }
}
