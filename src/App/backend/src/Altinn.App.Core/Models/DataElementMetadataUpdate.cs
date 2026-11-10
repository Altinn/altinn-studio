using KeyValueEntry = Altinn.Platform.Storage.Interface.Models.KeyValueEntry;

namespace Altinn.App.Core.Models;

/// <summary>
/// New values for a data element's metadata; a null property keeps the current value, so an update with every
/// property null changes nothing.
/// </summary>
public sealed record DataElementMetadataUpdate
{
    /// <summary>
    /// The element's tags, replacing the current list.
    /// </summary>
    public IReadOnlyList<string>? Tags { get; init; }

    /// <summary>
    /// The element's metadata entries, replacing the current list.
    /// </summary>
    public IReadOnlyList<KeyValueEntry>? Metadata { get; init; }

    /// <summary>
    /// The element's user-defined metadata entries, replacing the current list.
    /// </summary>
    public IReadOnlyList<KeyValueEntry>? UserDefinedMetadata { get; init; }

    /// <summary>
    /// Ids of the data elements this element refers to, replacing the current list.
    /// </summary>
    public IReadOnlyList<Guid>? Refs { get; init; }

    /// <summary>
    /// The element's filename.
    /// </summary>
    public string? Filename { get; init; }
}
