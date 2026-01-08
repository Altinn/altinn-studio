using System.Text.Json.Serialization;

namespace StudioGateway.Api.Clients.SlackClient.Contracts;

internal sealed class SlackBlock
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
