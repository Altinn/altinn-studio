using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Converters;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Represents the configuration for a custom app template in Altinn Studio.
/// </summary>
public class CustomTemplate
{
    [JsonPropertyName("schemaVersion")]
    public string SchemaVersion { get; set; } = "0.1";

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("owner")]
    public required string Owner { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("remove")]
    public List<string>? Remove { get; set; }

    [JsonPropertyName("packageReferences")]
    public List<PackageReference>? PackageReferences { get; set; }

    [JsonPropertyName("nextSteps")]
    public List<NextStep>? NextSteps { get; set; }
}

public class PackageReference
{
    [JsonPropertyName("include")]
    public required string Include { get; set; }

    [JsonPropertyName("version")]
    public string Version { get; set; } = string.Empty;

    [JsonPropertyName("project")]
    public string Project { get; set; } = string.Empty;
}

public class NextStep
{
    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("description")]
    public required string Description { get; set; }

    [JsonPropertyName("type")]
    [JsonConverter(typeof(NextStepTypeJsonConverter))]
    public NextStepType? Type { get; set; }

    [JsonPropertyName("links")]
    public List<NextStepLink>? Links { get; set; }
}

public class NextStepLink
{
    [JsonPropertyName("label")]
    public required string Label { get; set; }
    [JsonPropertyName("ref")]
    public required string Ref { get; set; } 
}

public enum NextStepType
{
    Configuration,
    CodeChange,
    Documentation
}
