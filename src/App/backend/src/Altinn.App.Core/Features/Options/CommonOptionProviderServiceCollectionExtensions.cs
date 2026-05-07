using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// class to hold the Extention method for
/// IServiceCollection to add the AddAltinn3CodeList() method
/// </summary>
public static class CommonOptionProviderServiceCollectionExtensions
{
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
    [Obsolete(
        "The code lists can be fetched directly without configuring options providers by calling the options endpoints using the options format for library references (lib**{creatorOrg}**{codeListId}**{version})"
    )]
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
            sp.GetRequiredService<IAltinn3LibraryCodeListService>()
        ));
        return serviceCollection;
    }
}
