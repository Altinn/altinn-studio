#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class Group
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public GroupType? Type { get; set; }

    [JsonPropertyName("markWhenCompleted")]
    public bool? MarkWhenCompleted { get; set; }

    [JsonPropertyName("order")]
    public List<string>? Order { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}
