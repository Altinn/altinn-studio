#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

/// <summary>
/// Parameters for the application decommissioning build pipeline.
/// </summary>
public class DecommissionBuildParameters
{
    /// <summary>
    /// Owner of the application.
    /// </summary>
    [JsonPropertyName("APP_OWNER")]
    public string AppOwner { get; set; }

    /// <summary>
    /// Repository name of the application.
    /// </summary>
    [JsonPropertyName("APP_REPO")]
    public string AppRepo { get; set; }

    /// <summary>
    /// Gets the target environment for decommissioning.
    /// </summary>
    [JsonPropertyName("APP_ENVIRONMENT")]
    public string AppEnvironment { get; set; }
}

