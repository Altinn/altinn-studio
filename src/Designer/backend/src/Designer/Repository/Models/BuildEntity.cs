#nullable disable
using System;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Altinn.Studio.Designer.Repository.Models;

/// <summary>
/// Build entity for a db
/// </summary>
public class BuildEntity
{
    /// <summary>
    /// Id
    /// </summary>
    [JsonProperty("id")]
    public string Id { get; set; }

    /// <summary>
    /// Status
    /// </summary>
    [JsonProperty("status")]
    [JsonConverter(typeof(StringEnumConverter))]
    public BuildStatus Status { get; set; }

    /// <summary>
    /// Result
    /// </summary>
    [JsonProperty("result")]
    [JsonConverter(typeof(StringEnumConverter))]
    public BuildResult Result { get; set; }

    /// <summary>
    /// Started
    /// </summary>
    [JsonProperty("started")]
    public DateTime? Started { get; set; }

    /// <summary>
    /// Finished
    /// </summary>
    [JsonProperty("finished")]
    public DateTime? Finished { get; set; }

    /// <summary>
    /// When Azure DevOps queued the run. Read from Azure DevOps when Designer polls the run, and not stored.
    /// </summary>
    [JsonIgnore]
    [System.Text.Json.Serialization.JsonIgnore]
    public DateTime? Queued { get; set; }

    /// <summary>
    /// The name of the pipeline the run belongs to. Read from Azure DevOps when Designer polls the run, and not stored.
    /// </summary>
    [JsonIgnore]
    [System.Text.Json.Serialization.JsonIgnore]
    public string PipelineName { get; set; }
}
