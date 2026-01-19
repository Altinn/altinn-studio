using System.Text.Json.Serialization;

namespace StudioGateway.Api.Clients.SlackClient.Contracts;

internal sealed class SlackMessage
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = "";

    [JsonPropertyName("blocks")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IEnumerable<SlackBlock>? Blocks { get; set; }
}
