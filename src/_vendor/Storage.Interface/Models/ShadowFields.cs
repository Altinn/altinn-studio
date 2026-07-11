#nullable disable

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents an object with information about how shadow fields are configured for the data type.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class ShadowFields
{
    /// <summary>
    /// Gets or sets the prefix to use to filter out shadow fields.
    /// </summary>
    [JsonProperty(PropertyName = "prefix")]
    public string Prefix { get; set; }

    /// <summary>
    /// Gets or sets the data type to save filtered data (without shadow fields) to.
    /// Optional. If not set, the containing data type will be updated.
    /// </summary>
    [JsonProperty(PropertyName = "saveToDataType")]
    public string SaveToDataType { get; set; }
}
