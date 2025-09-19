using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

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
        services.AddKartverketAdministrativeUnitsClient();
        services.AddTransient<IAppOptionsProvider, CountiesCodelistProvider>();
        services.AddTransient<IAppOptionsProvider, MunicipalitiesCodelistProvider>();

        return services;
    }

    /// <summary>
    /// Registers the client services required to get support for Kartverkets counties (fylker) and municipalities (kommuner) codelists.
    /// </summary>
    /// <param name="services"></param>
    /// <returns></returns>
    public static IServiceCollection AddKartverketAdministrativeUnitsClient(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddOptions<AdministrativeUnitsSettings>();
        services.AddHttpClient();
        services.TryAddTransient<IAdministrativeUnitsClient>(sp => new AdministrativeUnitsHttpClientCached(
            ActivatorUtilities.CreateInstance<AdministrativeUnitsHttpClient>(sp),
            sp.GetRequiredService<IMemoryCache>()
        ));

        return services;
    }
}
