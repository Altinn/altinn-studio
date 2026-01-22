#nullable disable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Represents the configuration for a custom app template in Altinn Studio.
/// </summary>
public class CustomTemplate
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("owner")]
    public string Owner { get; set; }

    [JsonPropertyName("name")]
    public Dictionary<string, string> Name { get; set; }

    [JsonPropertyName("description")]
    public Dictionary<string, string> Description { get; set; }

    [JsonPropertyName("remove")]
    public List<string> Remove { get; set; }
}
