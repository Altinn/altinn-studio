using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public sealed class SlackMessage
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = "";

    [JsonPropertyName("blocks")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IEnumerable<SlackBlock>? Blocks { get; set; }
}
