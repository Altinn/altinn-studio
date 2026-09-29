namespace Altinn.App.Core.Features.Options;

/// <summary>
/// How an option id resolved. The sources are listed in the order <see cref="IAppOptionsService"/> tries them,
/// except that <see cref="InstanceProvider"/> is only considered when the lookup has an instance.
/// </summary>
public enum AppOptionsSource
{
    /// <summary>
    /// The app has nothing registered or shipped with the id.
    /// </summary>
    None,

    /// <summary>
    /// An <see cref="IInstanceAppOptionsProvider"/> registered with the id. Without an instance the result
    /// reports this source with no options, since the provider needs an instance to answer.
    /// </summary>
    InstanceProvider,

    /// <summary>
    /// A joined list registered with <see cref="AppOptionsServiceExtensions.AddJoinedAppOptions"/>.
    /// </summary>
    Joined,

    /// <summary>
    /// A code list in the Altinn 3 code list library, either referenced as
    /// <c>lib**{org}**{codeListId}**{version}</c> or registered under an id with
    /// <see cref="CommonOptionProviderServiceCollectionExtensions.AddAltinn3CodeList"/>.
    /// </summary>
    Library,

    /// <summary>
    /// An <see cref="IAppOptionsProvider"/> registered with the id.
    /// </summary>
    AppProvider,

    /// <summary>
    /// The app's <c>options/{optionId}.json</c>.
    /// </summary>
    File,
}
