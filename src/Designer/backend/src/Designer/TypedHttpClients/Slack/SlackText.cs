using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public sealed class SlackText
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("text")]
    public string Text { get; set; } = "";
}
