using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Core.Models;

/// <summary>
/// Defines the layout settings
/// </summary>
public class LayoutSettings
{
    /// <summary>
    /// Optional JSON schema URI for layout settings.
    /// </summary>
    [JsonProperty(PropertyName = "$schema")]
    [JsonPropertyName("$schema")]
    public string? Schema { get; set; }

    /// <summary>
    /// Default data type for the layout folder.
    /// </summary>
    public string? DefaultDataType { get; set; }

    /// <summary>
    /// Pages
    /// </summary>
    public Pages? Pages { get; set; }

    /// <summary>
    /// Components
    /// </summary>
    public Components? Components { get; set; }
}
