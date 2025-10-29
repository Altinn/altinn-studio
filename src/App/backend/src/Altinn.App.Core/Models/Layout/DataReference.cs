namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Represents a reference to a value stored in the data model
/// </summary>
public record struct DataReference
{
    /// <summary>
    /// Reference to a field in the data model, using our standard notation (eg "model.gruppe[0].element")
    /// </summary>
    public required string Field { get; init; }

    /// <summary>
    /// The Id of the data element that the field is referencing
    /// </summary>
    public required DataElementIdentifier DataElementIdentifier { get; init; }

    /// <summary>
    /// Determines if the current <see cref="DataReference"/> instance is a prefix of the specified <paramref name="prefix"/>
    /// based on both the DataElementIdentifier and Field properties.
    /// </summary>
    /// <param name="prefix">The <see cref="DataReference"/> to compare with the current instance.</param>
    /// <returns>Returns <c>true</c> if the current instance is a prefix of the specified <paramref name="prefix"/>;
    /// otherwise, returns <c>false</c>.</returns>
    public bool StartsWith(DataReference prefix)
    {
        return DataElementIdentifier.Guid == prefix.DataElementIdentifier.Guid
            && Field.StartsWith(prefix.Field, StringComparison.Ordinal)
            && (
                Field.Length == prefix.Field.Length
                || Field[prefix.Field.Length] == '.'
                || Field[prefix.Field.Length] == '['
            );
    }
}
