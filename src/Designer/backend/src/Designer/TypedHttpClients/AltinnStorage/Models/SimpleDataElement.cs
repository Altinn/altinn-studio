using System;
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;

/// <summary>
/// Represents a simplified data element with most fields redacted, see <see cref="DataElement"/>.
/// </summary>
public class SimpleDataElement
{
    /// <summary>
    /// Unique id, a guid.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Data type, must be equal to the ones defined in application data types.
    /// </summary>
    [JsonPropertyName("dataType")]
    public required string DataType { get; set; }

    /// <summary>
    /// Content type in the stored data element (file).
    /// </summary>
    [JsonPropertyName("contentType")]
    public required string ContentType { get; set; }

    /// <summary>
    /// Size of file in bytes
    /// </summary>
    [JsonPropertyName("size")]
    public required long Size { get; set; }

    /// <summary>
    /// Value indicating whether the element can be updated.
    /// </summary>
    [JsonPropertyName("locked")]
    public required bool Locked { get; set; }

    /// <summary>
    /// Value indicating whether the element has been read.
    /// </summary>
    [JsonPropertyName("isRead")]
    public required bool IsRead { get; set; }

    /// <summary>
    /// Result of a file scan of the blob represented by this data element.
    /// </summary>
    [JsonPropertyName("fileScanResult")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FileScanResult? FileScanResult { get; set; }

    /// <summary>
    /// The date the data element was marked for hard delete by user.
    /// </summary>
    [JsonPropertyName("hardDeletedAt")]
    public DateTimeOffset? HardDeletedAt { get; set; }

    /// <summary>
    /// The date and time for when the data element was created.
    /// </summary>
    [JsonPropertyName("createdAt")]
    public DateTimeOffset? CreatedAt { get; set; }

    /// <summary>
    /// The date and time for when the data element was last edited.
    /// </summary>
    [JsonPropertyName("lastChangedAt")]
    public DateTimeOffset? LastChangedAt { get; set; }
}
