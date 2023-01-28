using Altinn.Codelists.SSB.Clients;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.SSB.Extensions;

/// <summary>
/// Extends the <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the services required to get support for SSB Classifiations.
    /// </summary>
    public static IServiceCollection AddSSBClassifications(this IServiceCollection services)
    {   
        services.AddOptions<ClassificationOptions>();

        return services;
    }
}
