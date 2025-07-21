using System.Text.Json.Serialization;

namespace Altinn.Studio.Admin.Models;

public class RunningApplication
{
    [JsonPropertyName("org")]
    public required string Org { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("environments")]
    public List<string> Environments { get; set; } = new();
}
