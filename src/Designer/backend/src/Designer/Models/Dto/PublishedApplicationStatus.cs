using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// How an app published to an environment runs.
/// </summary>
public class PublishedApplicationStatus
{
    /// <summary>
    /// The app's name.
    /// </summary>
    [JsonPropertyName("app")]
    public required string App { get; set; }

    /// <summary>
    /// <c>ready</c>, <c>updating</c>, <c>stuck</c>, <c>degraded</c> or <c>unavailable</c>, as the runtime gateway
    /// reports it, or null when the gateway could not tell, such as for an app that does not run in the cluster.
    /// </summary>
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>
    /// The version of the app libraries the app reports, such as <c>8.7.2</c>, or null when the app did not answer.
    /// </summary>
    [JsonPropertyName("appLibVersion")]
    public string? AppLibVersion { get; set; }
}
