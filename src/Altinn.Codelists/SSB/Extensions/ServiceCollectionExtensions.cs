using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;
using Altinn.Codelists.Kartverket.AdministrativeUnits;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
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
        // Basic setup
        services.AddMemoryCache();
        services.AddOptions<ClassificationSettings>();
        services.AddHttpClient<IClassificationsClient, ClassificationsHttpClient>();
        services.Decorate<IClassificationsClient, ClassificationsHttpClientCached>();

        // Add the codelist providers
        services.AddSSBClassificationCodelistProvider("kjønn", Classification.Sex);
        services.AddSSBClassificationCodelistProvider("næringsgruppering", Classification.IndustryGrouping);
        services.AddSSBClassificationCodelistProvider("yrker", Classification.Occupations);
        services.AddSSBClassificationCodelistProvider("sivilstand", Classification.MaritalStatus);
        services.AddSSBClassificationCodelistProvider("grunnbeløpfolketrygden", Classification.BaseAmountNationalInsurance);
        services.AddSSBClassificationCodelistProvider("fylker", Classification.Counties);
        services.AddSSBClassificationCodelistProvider("kommuner", Classification.Municipalities);
        services.AddSSBClassificationCodelistProvider("land", Classification.Countries);

        return services;
    }

    /// <summary>
    /// Adds the specified <see cref="Classification"/> as an <see cref="IAppOptionsProvider"/> with the specified id.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add to</param>
    /// <param name="id">The codelist id</param>
    /// <param name="classification">The <see cref="Classification"/> to return</param>
    /// <param name="defaultKeyValuePairs">Default set of key/value pairs to be used. Will be overriden by matching qyery parameters runtime.</param>
    public static IServiceCollection AddSSBClassificationCodelistProvider(this IServiceCollection services, string id, Classification classification, Dictionary<string, string>? defaultKeyValuePairs = null)
    {
        services.AddTransient<IAppOptionsProvider>(sp => new ClassificationCodelistProvider(id, classification, sp.GetRequiredService<IClassificationsClient>(), defaultKeyValuePairs));

        return services;
    }

    /// <summary>
    /// Adds the specified classification based on the known classification id. If it is an id mapped to the <see cref="Classification"/> enum
    /// the correct enum will be set, otherwise Custom will be used as enum value but the id will be sent to the underlying api.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add to</param>
    /// <param name="id">The codelist id</param>
    /// <param name="classification">The <see cref="Classification"/> to return</param>
    /// <param name="options"><see cref="ClassificationOptions"/> allowing control over how data maps from the source to the app options</param>
    /// <param name="defaultKeyValuePairs">Default set of key/value pairs to be used. Will be overriden by matching qyery parameters runtime.</param>
    public static IServiceCollection AddSSBClassificationCodelistProvider(this IServiceCollection services, string id, Classification classification, ClassificationOptions options, Dictionary<string, string>? defaultKeyValuePairs = null)
    {
        services.AddTransient<IAppOptionsProvider>(sp => new ClassificationCodelistProvider(id, classification, sp.GetRequiredService<IClassificationsClient>(), options, defaultKeyValuePairs));

        return services;
    }

    /// <summary>
    /// Adds the specified classification based on the known classification id. If it is an id mapped to the <see cref="Classification"/> enum
    /// the correct enum will be set, otherwise Custom will be used as enum value but the id will be sent to the underlying api.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add to</param>
    /// <param name="id">The codelist id</param>
    /// <param name="classificationId">The id of the classification to return</param>
    /// <param name="defaultKeyValuePairs">Default set of key/value pairs to be used. Will be overriden by matching qyery parameters runtime.</param>
    public static IServiceCollection AddSSBClassificationCodelistProvider(this IServiceCollection services, string id, int classificationId, Dictionary<string, string>? defaultKeyValuePairs = null)
    {
        services.AddTransient<IAppOptionsProvider>(sp => new ClassificationCodelistProvider(id, classificationId, sp.GetRequiredService<IClassificationsClient>(), defaultKeyValuePairs));

        return services;
    }

    /// <summary>
    /// Adds the specified classification based on the known classification id. If it is an id mapped to the <see cref="Classification"/> enum
    /// the correct enum will be set, otherwise Custom will be used as enum value but the id will be sent to the underlying api.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add to</param>
    /// <param name="id">The codelist id</param>
    /// <param name="classificationId">The id of the classification to return</param>
    /// <param name="options"><see cref="ClassificationOptions"/> allowing control over how data maps from the source to the app options</param>
    /// <param name="defaultKeyValuePairs">Default set of key/value pairs to be used. Will be overriden by matching qyery parameters runtime.</param>
    public static IServiceCollection AddSSBClassificationCodelistProvider(this IServiceCollection services, string id, int classificationId, ClassificationOptions options, Dictionary<string, string>? defaultKeyValuePairs = null)
    {
        services.AddTransient<IAppOptionsProvider>(sp => new ClassificationCodelistProvider(id, classificationId, sp.GetRequiredService<IClassificationsClient>(), defaultKeyValuePairs, options));

        return services;
    }
}
