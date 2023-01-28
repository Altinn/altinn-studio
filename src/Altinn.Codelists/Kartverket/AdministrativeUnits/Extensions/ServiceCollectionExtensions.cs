using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;
using Altinn.Codelists.SSB.Clients;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Extensions;

/// <summary>
/// Extends the <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the services required to get support for Kartverkets counties(fylker) and communes(kommuner) codelists.
    /// </summary>
    public static IServiceCollection AddKartverketAdministrativeUnits(this IServiceCollection services)
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
