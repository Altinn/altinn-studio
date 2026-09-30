namespace Altinn.App.Core.Features.Options;

/// <summary>
/// An option list the app has registered or ships, as listed by <see cref="IAppOptionsService.GetRegistrations"/>.
/// </summary>
/// <param name="OptionId">The id the list is registered or shipped under</param>
public abstract record AppOptionsRegistration(string OptionId);

/// <summary>
/// The app ships <c>options/{optionId}.json</c>.
/// </summary>
/// <param name="OptionId">The file name without the extension</param>
public sealed record FileOptionsRegistration(string OptionId) : AppOptionsRegistration(OptionId);

/// <summary>
/// The app registered an <see cref="IAppOptionsProvider"/>.
/// </summary>
/// <param name="OptionId">The provider's <see cref="IAppOptionsProvider.Id"/></param>
/// <param name="ProviderType">The type of the provider</param>
public sealed record ProviderOptionsRegistration(string OptionId, Type ProviderType) : AppOptionsRegistration(OptionId);

/// <summary>
/// The app registered an <see cref="IInstanceAppOptionsProvider"/>.
/// </summary>
/// <param name="OptionId">The provider's <see cref="IInstanceAppOptionsProvider.Id"/></param>
/// <param name="ProviderType">The type of the provider</param>
public sealed record InstanceProviderOptionsRegistration(string OptionId, Type ProviderType)
    : AppOptionsRegistration(OptionId);

/// <summary>
/// The app registered a joined list with <see cref="AppOptionsServiceExtensions.AddJoinedAppOptions"/>.
/// </summary>
/// <param name="OptionId">The id of the joined list</param>
/// <param name="SubOptionIds">The ids of the lists it joins, in order</param>
public sealed record JoinedOptionsRegistration(string OptionId, IReadOnlyList<string> SubOptionIds)
    : AppOptionsRegistration(OptionId);

/// <summary>
/// The app registered a code list from the Altinn 3 code list library under an id with
/// <see cref="CommonOptionProviderServiceCollectionExtensions.AddAltinn3CodeList"/>.
/// </summary>
/// <param name="OptionId">The id the list is registered under</param>
/// <param name="Org">The organization that owns the code list</param>
/// <param name="CodeListId">The id of the code list in the library</param>
/// <param name="Version">The version of the code list, or null for the latest</param>
public sealed record LibraryOptionsRegistration(string OptionId, string Org, string CodeListId, string? Version)
    : AppOptionsRegistration(OptionId);
