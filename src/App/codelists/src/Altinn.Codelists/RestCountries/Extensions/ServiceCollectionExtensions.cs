using Altinn.Codelists.RestCountries.Clients;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.RestCountries;

/// <summary>
/// Extends the <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the <see cref="ICountryClient"/> interface
    /// </summary>
    public static IServiceCollection AddRestCountriesClient(this IServiceCollection services)
    {
        services.AddHttpClient();
        services.AddTransient<ICountryClient, CountriesClient>();

        return services;
    }
}
