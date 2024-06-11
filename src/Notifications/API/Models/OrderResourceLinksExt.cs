using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a set of resource links of a notification order. 
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class OrderResourceLinksExt
{
    /// <summary>
    /// Gets or sets the self link 
    /// </summary>
    [JsonPropertyName("self")]
    public string Self { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the status link 
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}
