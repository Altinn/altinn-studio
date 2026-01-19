#nullable enable

using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class PublishedApplicationDetails
{
    [JsonPropertyName("org")]
    public required string Org { get; set; }

    [JsonPropertyName("env")]
    public required string Env { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("version")]
    public required string Version { get; set; }

    [JsonPropertyName("commit")]
    public required string Commit { get; set; }

    [JsonPropertyName("createdAt")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("createdBy")]
    public required string CreatedBy { get; set; }
}
