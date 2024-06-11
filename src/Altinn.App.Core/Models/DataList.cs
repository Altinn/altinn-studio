namespace Altinn.App.Core.Models;

/// <summary>
/// Represents values to be used in a DataList.
/// </summary>
public class DataList
{
    /// <summary>
    /// Gets or sets the list of objects.
    /// </summary>
    public List<object> ListItems { get; set; } = new List<object>();

    /// <summary>
    /// Gets or sets the metadata of the DataList.
    /// </summary>
#pragma warning disable IDE1006 // Naming Styles - public members should be PascalCase
#pragma warning disable CA1707 // Identifiers should not contain underscores
    public DataListMetadata _metaData { get; set; } = new DataListMetadata();
#pragma warning restore CA1707 // Identifiers should not contain underscores
#pragma warning restore IDE1006 // Naming Styles
}
