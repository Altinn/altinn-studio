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
}
