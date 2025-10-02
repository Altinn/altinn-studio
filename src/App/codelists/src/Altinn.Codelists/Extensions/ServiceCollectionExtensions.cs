using Altinn.Codelists.Kartverket.AdministrativeUnits.Extensions;
using Altinn.Codelists.Posten;
using Altinn.Codelists.SSB.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Extensions;

/// <summary>
/// Extends the <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the services required to get support for all codelists.
    /// </summary>
    public static IServiceCollection AddAltinnCodelists(this IServiceCollection services)
    {
        services.AddKartverketAdministrativeUnits();
        services.AddSSBClassifications();
        services.AddPosten();

        return services;
    }
}
