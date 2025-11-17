#nullable enable

using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;

namespace Altinn.Studio.Designer.Models.Dto;

public class InstancesResponse
{
    [JsonPropertyName("instances")]
    public required List<SimpleInstance> Instances { get; set; }

    [JsonPropertyName("continuationToken")]
    public string? ContinuationToken { get; set; }
}
