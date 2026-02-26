using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public sealed class SlackBlock
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("text")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public SlackText? Text { get; set; }

    [JsonPropertyName("fields")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IEnumerable<SlackText>? Fields { get; set; }

    [JsonPropertyName("elements")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IEnumerable<SlackText>? Elements { get; set; }
}
