#nullable enable

using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models;

public class ProcessTask
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}
