using Altinn.App.Core.Features;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using Microsoft.Extensions.Caching.Memory;
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
        services.AddOptions<ClassificationSettings>();
        services.AddHttpClient<IClassificationsClient, ClassificationsHttpClient>();

        services.AddSSBClassificationCodelistProvider("sivilstand", Classification.MaritalStatus);
        services.AddSSBClassificationCodelistProvider("næringsgruppering", Classification.IndustryGrouping);
        services.AddSSBClassificationCodelistProvider("kjønn", Classification.Sex);
        services.AddSSBClassificationCodelistProvider("kommuner", Classification.Communes);
        services.AddSSBClassificationCodelistProvider("fylker", Classification.Counties);
        services.AddSSBClassificationCodelistProvider("land", Classification.Countries);

        return services;
    }

    /// <summary>
    /// Adds the specified <see cref="Classification"/> as an <see cref="IAppOptionsProvider"/> with the specified id.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add to</param>
    /// <param name="id">The codelist id</param>
    /// <param name="classification">The <see cref="Classification"/> to return</param>
    /// <returns></returns>
    public static IServiceCollection AddSSBClassificationCodelistProvider(this IServiceCollection services, string id, Classification classification)
    {
        services.AddTransient<IAppOptionsProvider>(sp => new ClassificationCodelistProvider(id, classification, sp.GetRequiredService<IClassificationsClient>()));

        return services;
    }
}
