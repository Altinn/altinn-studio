using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Options.Altinn2Provider;
using Altinn.App.Core.Features.Options.Altinn3LibraryProvider;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// class to hold the Extention method for
/// IServiceCollection to add the AddAltinn2CodeList() method
/// </summary>
public static class CommonOptionProviderServiceCollectionExtensions
{
    /// <summary>
    /// Extention method for IServiceCollection to add the AddAltinn2CodeList() method
    /// <code>
    /// services.AddAltinn2CodeList(
    ///     id: "ASF_Land",
    ///     transform: (code) => new (){ Value = code.Code, Label=code.Value1 },
    ///     // filter: (code) => int.Parse(code.Value3) > 100,
    ///     codeListVersion: 2758,
    ///     metadataApiId: "ASF_land"
    /// });
    /// </code>
    /// </summary>
    /// <param name="serviceCollection">The service collection to add altinn 2 codelists to</param>
    /// <param name="id">
    ///    The id/name that is used in the <c>optionsId</c> parameter in the SelectionComponents (Checkboxes, RadioButtons, Dropdown ...)
    ///    If <paramref name="metadataApiId"/> is null, this is also used for altinn2 code list name
    /// </param>
    /// <param name="transform">Mapping function to get from the altinn2 model to altinn 3 option</param>
    /// <param name="filter">Filter function in case you only want a subset of the altinn2 codelist</param>
    /// <param name="metadataApiId">id for use in altinn2 api (will use <paramref name="id"/>, if this is null)</param>
    /// <param name="codeListVersion">version of the code list in the altinn2 metadata api</param>
    public static IServiceCollection AddAltinn2CodeList(
        this IServiceCollection serviceCollection,
        string id,
        Func<MetadataCodeListCodes, AppOption> transform,
        Func<MetadataCodeListCodes, bool>? filter = null,
        string? metadataApiId = null,
        int? codeListVersion = null
    )
    {
        if (
            serviceCollection.All(serviceDescriptor =>
                serviceDescriptor.ServiceType != typeof(Altinn2MetadataApiClient)
            )
        )
        {
            serviceCollection.AddHttpClient<Altinn2MetadataApiClient>();
        }

        serviceCollection.AddTransient<IAppOptionsProvider>(sp => new Altinn2CodeListProvider(
            sp.GetRequiredService<IMemoryCache>(),
            sp.GetRequiredService<Altinn2MetadataApiClient>(),
            id,
            transform,
            filter,
            metadataApiId,
            codeListVersion
        ));
        return serviceCollection;
    }

    /// <summary>
    /// Extention method for IServiceCollection to add the AddAltinn3CodeList() method
    /// <code>
    /// services.AddAltinn3CodeList(
    ///     optionId: "someNewCodeList-1",
    ///     org: "ttd",
    ///     codeListId: "someNewCodeList",
    ///     version: "1"
    /// );
    /// </code>
    /// </summary>
    /// <param name="serviceCollection">The service collection to add altinn 3 codelists to</param>
    /// <param name="optionId">
    ///    The id/name that is used in the <c>optionsId</c> parameter in the SelectionComponents (Checkboxes, RadioButtons, Dropdown ...)
    /// </param>
    /// <param name="org">The organization that has this code list</param>
    /// <param name="codeListId">Id of the code list in the code list repository.</param>
    /// <param name="version">Version of the code list in the code list repository. Defaults to latest if not provided.</param>
    /// <returns></returns>
    public static IServiceCollection AddAltinn3CodeList(
        this IServiceCollection serviceCollection,
        string optionId,
        string org,
        string codeListId,
        string? version = null
    )
    {
        serviceCollection.AddSingleton<IAppOptionsProvider>(sp => new Altinn3LibraryOptionsProvider(
            optionId,
            org,
            codeListId,
            version,
            sp.GetRequiredService<HybridCache>(),
            sp.GetRequiredService<IHttpClientFactory>(),
            sp.GetRequiredService<ILogger<Altinn3LibraryOptionsProvider>>(),
            sp.GetRequiredService<IOptions<PlatformSettings>>()
        ));
        return serviceCollection;
    }
}
