#nullable disable

using Altinn.Platform.Storage.Interface.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Reference to other objects in storage
/// </summary>
public class Reference
{
    /// <summary>
    /// Value of the connected reference
    /// </summary>
    [JsonProperty(PropertyName = "value")]
    public string Value { get; set; }

    /// <summary>
    /// The type of relation to the connected object see <see cref="RelationType"/>
    /// </summary>
    [JsonProperty(PropertyName = "relation")]
    [JsonConverter(typeof(StringEnumConverter))]
    [TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
    public RelationType? Relation { get; set; }

    /// <summary>
    /// The value type of the connected object see <see cref="ReferenceType"/>
    /// </summary>
    [JsonProperty(PropertyName = "valueType")]
    [JsonConverter(typeof(StringEnumConverter))]
    [TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
    public ReferenceType? ValueType { get; set; }
}
