using KeyValueEntry = Altinn.Platform.Storage.Interface.Models.KeyValueEntry;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// The data values and presentation texts the app changed on the instance. A null value removes the key.
/// </summary>
internal sealed class InstanceFieldChanges
{
    internal InstanceFieldChanges(
        IReadOnlyDictionary<string, string?> dataValues,
        IReadOnlyDictionary<string, string?> presentationTexts
    )
    {
        DataValues = dataValues;
        PresentationTexts = presentationTexts;
    }

    public IReadOnlyDictionary<string, string?> DataValues { get; }

    public IReadOnlyDictionary<string, string?> PresentationTexts { get; }

    public bool HasChanges => DataValues.Count > 0 || PresentationTexts.Count > 0;
}

/// <summary>
/// The metadata the app changed on a data element. A null property is left unchanged by the save.
/// </summary>
internal sealed class DataElementMetadataChange
{
    internal DataElementMetadataChange(
        IReadOnlyList<string>? tags,
        IReadOnlyList<KeyValueEntry>? metadata,
        IReadOnlyList<KeyValueEntry>? userDefinedMetadata,
        IReadOnlyList<Guid>? refs,
        string? filename
    )
    {
        // Copies, so that a change the app makes after the changes were collected is not sent with them.
        Tags = tags is null ? null : [.. tags];
        Metadata = Copy(metadata);
        UserDefinedMetadata = Copy(userDefinedMetadata);
        Refs = refs is null ? null : [.. refs];
        Filename = filename;
    }

    public IReadOnlyList<string>? Tags { get; }

    public IReadOnlyList<KeyValueEntry>? Metadata { get; }

    public IReadOnlyList<KeyValueEntry>? UserDefinedMetadata { get; }

    public IReadOnlyList<Guid>? Refs { get; }

    public string? Filename { get; }

    public bool HasChanges =>
        Tags is not null
        || Metadata is not null
        || UserDefinedMetadata is not null
        || Refs is not null
        || Filename is not null;

    private static KeyValueEntry[]? Copy(IReadOnlyList<KeyValueEntry>? entries) =>
        entries?.Select(entry => new KeyValueEntry { Key = entry.Key, Value = entry.Value }).ToArray();
}
