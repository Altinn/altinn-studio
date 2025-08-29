using System.Text.Json.Serialization;

namespace Altinn.Studio.Admin.Models;

public class RunningApplication
{
    [JsonPropertyName("org")]
    public required string Org { get; set; }

    [JsonPropertyName("env")]
    public required string Env { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("version")]
    public required string Version { get; set; }
}
