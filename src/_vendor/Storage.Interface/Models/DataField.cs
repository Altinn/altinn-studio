#nullable disable

using System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Holds the definition of a data field for an application, ie. a named reference to a form data field.
/// </summary>
public class DataField
{
    /// <summary>
    /// Gets or sets the id of the presentation field
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; }

    /// <summary>
    /// Gets or sets the path of the presentation field
    /// </summary>
    [JsonPropertyName("path")]
    public string Path { get; set; }

    /// <summary>
    /// Gets or sets the data type where the presentation field is defined.
    /// </summary>
    [JsonPropertyName("dataTypeId")]
    public string DataTypeId { get; set; }
}
