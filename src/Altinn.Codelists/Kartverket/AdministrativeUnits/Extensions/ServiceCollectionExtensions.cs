using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Extensions;

/// <summary>
/// Extends the <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the services required to get support for Kartverkets counties (fylker) and municipalities (kommuner) codelists.
    /// </summary>
    public static IServiceCollection AddKartverketAdministrativeUnits(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddOptions<AdministrativeUnitsSettings>();
        services.AddHttpClient();
        services.AddTransient<IAdministrativeUnitsClient>(sp => new AdministrativeUnitsHttpClientCached(
            ActivatorUtilities.CreateInstance<AdministrativeUnitsHttpClient>(sp),
            sp.GetRequiredService<IMemoryCache>()
        ));
        services.AddTransient<IAppOptionsProvider, CountiesCodelistProvider>();
        services.AddTransient<IAppOptionsProvider, MunicipalitiesCodelistProvider>();

        return services;
    }
}
