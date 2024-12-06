#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models;

public class LayoutSets : Altinn.App.Core.Models.LayoutSets
{
    [JsonPropertyName("$schema")]
    public string Schema { get; set; }

    [JsonPropertyName("sets")]
    public new List<LayoutSetConfig> Sets { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?> UnknownProperties { get; set; }
}

public class LayoutSetConfig
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("dataType")]
    [CanBeNull]
    public string DataType { get; set; }

    [JsonPropertyName("tasks")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [CanBeNull]
    public List<string> Tasks { get; set; }

    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string Type { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?> UnknownProperties { get; set; }
}
