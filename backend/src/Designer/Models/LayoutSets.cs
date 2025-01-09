#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class LayoutSets : Altinn.App.Core.Models.LayoutSets
{
    [JsonPropertyName("$schema")]
    public string? Schema { get; set; }

    [JsonPropertyName("sets")]
    public new required List<LayoutSetConfig> Sets { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}

public class LayoutSetConfig
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("dataType")] public string? DataType { get; set; }

    [JsonPropertyName("tasks")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Tasks { get; set; }

    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Type { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}
