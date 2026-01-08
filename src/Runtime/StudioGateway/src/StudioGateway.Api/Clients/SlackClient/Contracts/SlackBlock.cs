using System.Text.Json.Serialization;

namespace StudioGateway.Api.Clients.SlackClient.Contracts;

internal sealed class SlackBlock
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("text")]
    public SlackText? Text { get; set; }
}
