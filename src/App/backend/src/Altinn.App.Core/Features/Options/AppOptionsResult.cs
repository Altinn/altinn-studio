using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// The outcome of one <see cref="AppOptionsLookup"/> in a call to
/// <see cref="IAppOptionsService.GetOptionsAsync(IReadOnlyList{AppOptionsLookup}, string?, IInstanceDataAccessor?, CancellationToken)"/>.
/// </summary>
public sealed record AppOptionsResult
{
    /// <summary>
    /// The lookup this result answers.
    /// </summary>
    public required AppOptionsLookup Lookup { get; init; }

    /// <summary>
    /// How the id resolved. <see cref="AppOptionsSource.None"/> when the app has nothing with the id.
    /// </summary>
    public required AppOptionsSource Source { get; init; }

    /// <summary>
    /// The options as the source returned them, or null when the id did not resolve to a list, when the source
    /// needs an instance the lookup did not have, or when <see cref="Error"/> is set.
    /// </summary>
    public AppOptions? AppOptions { get; init; }

    /// <summary>
    /// The exception the source threw, so that one failing list does not fail the whole call.
    /// </summary>
    public Exception? Error { get; init; }
}
