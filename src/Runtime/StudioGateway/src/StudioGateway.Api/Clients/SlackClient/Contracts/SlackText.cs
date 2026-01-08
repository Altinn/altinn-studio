using System.Text.Json.Serialization;

namespace StudioGateway.Api.Clients.SlackClient.Contracts;

internal sealed class SlackText
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("text")]
    public string Text { get; set; } = "";
}
