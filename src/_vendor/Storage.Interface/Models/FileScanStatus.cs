#nullable disable

using Altinn.Platform.Storage.Interface.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents file scan status for a data element
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class FileScanStatus
{
    /// <summary>
    /// Gets or sets the MD5 content hash computed by Azure Blob Storage
    /// </summary>
    [JsonProperty(PropertyName = "contentHash")]
    public string ContentHash { get; set; }

    /// <summary>
    /// Gets or sets the explicit blob version ID that was scanned.
    /// </summary>
    [JsonProperty(PropertyName = "blobVersionId")]
    public string BlobVersionId { get; set; }

    /// <summary>
    /// Gets or sets the scan result
    /// </summary>
    [JsonProperty(PropertyName = "fileScanResult")]
    [JsonConverter(typeof(StringEnumConverter))]
    [TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
    public FileScanResult FileScanResult { get; set; }

    /// <inheritdoc/>
    public override string ToString()
    {
        return JsonConvert.SerializeObject(this);
    }
}
