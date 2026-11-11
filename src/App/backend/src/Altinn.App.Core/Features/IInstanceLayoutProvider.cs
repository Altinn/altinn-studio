namespace Altinn.App.Core.Features;

/// <summary>
/// Interface for providing layouts and layout settings that depend on the instance being filled out.
/// </summary>
/// <remarks>
/// When an implementation is registered, the frontend fetches layouts and layout settings through
/// the instance scoped endpoints, which call this provider.
/// Backend features that read layouts, such as validation and removal of hidden data, still use the app's own layouts.
/// </remarks>
[ImplementableByApps]
public interface IInstanceLayoutProvider
{
    /// <summary>
    /// Gets the layouts for a layout set, in the same JSON format as the app's own layouts for the set.
    /// </summary>
    /// <returns>The layouts as JSON, or null to use the app's own layouts for the layout set.</returns>
    Task<string?> GetLayouts(InstanceLayoutContext context);

    /// <summary>
    /// Gets the layout settings for a layout set, in the same JSON format as the app's own Settings.json for the set.
    /// </summary>
    /// <returns>The layout settings as JSON, or null to use the app's own layout settings for the layout set.</returns>
    Task<string?> GetLayoutSettings(InstanceLayoutContext context);
}

/// <summary>
/// The context for an <see cref="IInstanceLayoutProvider" /> call.
/// </summary>
public sealed record InstanceLayoutContext
{
    /// <summary>
    /// The id of the layout set being requested.
    /// </summary>
    public required string LayoutSetId { get; init; }

    /// <summary>
    /// An instance data accessor that can be used to read the instance and its data.
    /// </summary>
    public required IInstanceDataAccessor InstanceDataAccessor { get; init; }

    /// <summary>
    /// Cancellation token for the operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;
}
