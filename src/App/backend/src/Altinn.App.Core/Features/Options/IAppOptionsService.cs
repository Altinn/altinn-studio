using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Loads the app's option lists, also called code lists. A list comes from the
/// <see cref="IAppOptionsProvider"/> or <see cref="IInstanceAppOptionsProvider"/> the app registered with its id,
/// from a joined list or a library code list the app registered, from a <c>lib**{org}**{codeListId}**{version}</c>
/// reference to the Altinn 3 code list library, or from the app's <c>options/{optionId}.json</c>.
/// </summary>
public interface IAppOptionsService
{
    /// <summary>
    /// Loads several option lists in one call. Every registered provider is resolved once for the whole call, so
    /// this is the way to load the lists a form references. The results come in the same order as the lookups,
    /// and a list that fails to load reports the exception in <see cref="AppOptionsResult.Error"/> instead of
    /// failing the call.
    /// </summary>
    /// <param name="lookups">The lists to load, each with the key/value pairs its provider may use</param>
    /// <param name="language">The language code requested</param>
    /// <param name="dataAccessor">
    /// The instance the lists are loaded for, which lets an <see cref="IInstanceAppOptionsProvider"/> answer. Null
    /// for a stateless form or a lookup without an instance, in which case an id only an instance provider matches
    /// reports <see cref="AppOptionsSource.InstanceProvider"/> with no options.
    /// </param>
    /// <param name="cancellationToken">Cancels the call; a cancelled call throws rather than reporting errors</param>
    /// <returns>One result per lookup, in lookup order</returns>
    Task<AppOptionsResult[]> GetOptionsAsync(
        IReadOnlyList<AppOptionsLookup> lookups,
        string? language,
        IInstanceDataAccessor? dataAccessor,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Loads one option list without an instance. A failure in the source throws.
    /// </summary>
    /// <param name="optionId">The id of the options list to retrieve</param>
    /// <param name="language">The language code requested.</param>
    /// <param name="keyValuePairs">Optional list of key/value pairs to use for filtering and further lookup.</param>
    /// <returns>The list of options; <see cref="AppOptions.Options"/> is null when the app has nothing with the id</returns>
    Task<AppOptions> GetOptionsAsync(string optionId, string? language, Dictionary<string, string> keyValuePairs);

    /// <summary>
    /// Loads one option list from the <see cref="IInstanceAppOptionsProvider"/> the app registered with the id.
    /// The values returned from this implementation could be specific to the instance and/or instance owner and
    /// should not be cached without careful thinking around caching strategy.
    /// </summary>
    /// <param name="instanceIdentifier">Class identifying the instance by instance owner party id and instance guid.</param>
    /// <param name="optionId">The id of the options list to retrieve</param>
    /// <param name="language">The language code requested.</param>
    /// <param name="keyValuePairs">Optional list of key/value pairs to use for filtering and further lookup.</param>
    /// <returns>The list of options, or null when the app has no instance provider with the id</returns>
    Task<AppOptions?> GetOptionsAsync(
        InstanceIdentifier instanceIdentifier,
        string optionId,
        string? language,
        Dictionary<string, string> keyValuePairs
    );

    /// <summary>
    /// Every option list the app registered or ships, in the order the sources are tried when an id is looked up.
    /// An id can appear more than once when several sources have it; the first entry is the one a lookup uses.
    /// </summary>
    IReadOnlyList<AppOptionsRegistration> GetRegistrations();
}
