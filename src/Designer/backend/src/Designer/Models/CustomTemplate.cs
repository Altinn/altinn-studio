using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Represents the configuration for a custom app template in Altinn Studio.
/// </summary>
public class CustomTemplate
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("owner")]
    public required string Owner { get; set; }

    [JsonPropertyName("name")]
    public Dictionary<string, string> Name { get; set; } = new();

    [JsonPropertyName("description")]
    public Dictionary<string, string> Description { get; set; }= new();

    [JsonPropertyName("remove")]
    public List<string> Remove { get; set; } = [];
}
