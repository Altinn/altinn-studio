using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class LayoutSettings
{
    [JsonPropertyName("$schema")]
    public string? Schema { get; set; }

    [JsonPropertyName("pages")]
    public Pages? Pages { get; set; }

    [JsonPropertyName("defaultDataType")]
    public string? DefaultDataType { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}
