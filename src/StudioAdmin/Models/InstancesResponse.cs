using System.Text.Json.Serialization;

namespace Altinn.Studio.Admin.Models;

public class InstancesResponse
{
    [JsonPropertyName("instances")]
    public required List<SimpleInstance> Instances { get; set; }

    [JsonPropertyName("continuationToken")]
    public string? ContinuationToken { get; set; }
}
