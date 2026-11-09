#nullable disable
using System;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

/// <summary>
/// Azure DevOps Build
/// </summary>
public class Build
{
    /// <summary>
    /// Build id
    /// </summary>
    [JsonPropertyName("id")]
    public int Id { get; set; }

    /// <summary>
    /// The time that the build was queued.
    /// </summary>
    [JsonPropertyName("queueTime")]
    public DateTime? QueueTime { get; set; }

    /// <summary>
    /// The time that the build was started.
    /// </summary>
    [JsonPropertyName("startTime")]
    public DateTime? StartTime { get; set; }

    /// <summary>
    /// The time that the build was completed.
    /// </summary>
    [JsonPropertyName("finishTime")]
    public DateTime? FinishTime { get; set; }

    /// <summary>
    /// The status of the build.
    /// </summary>
    [JsonPropertyName("status")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public BuildStatus Status { get; set; }

    /// <summary>
    /// The result of the build.
    /// </summary>
    [JsonPropertyName("result")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public BuildResult Result { get; set; }

    /// <summary>
    /// The pipeline the build runs.
    /// </summary>
    [JsonPropertyName("definition")]
    public BuildDefinition Definition { get; set; }
}

/// <summary>
/// The pipeline a build runs, as Azure DevOps returns it with the build.
/// </summary>
public class BuildDefinition
{
    [JsonPropertyName("name")]
    public string Name { get; set; }
}
