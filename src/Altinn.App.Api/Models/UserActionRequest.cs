using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models;

/// <summary>
/// Request model for user action
/// </summary>
public class UserActionRequest
{
    /// <summary>
    /// Action performed
    /// </summary>
    [JsonPropertyName("action")]
    public string? Action { get; set; }
    
    /// <summary>
    /// The id of the button that was clicked
    /// </summary>
    [JsonPropertyName("buttonId")]
    public string? ButtonId { get; set; }
    
    /// <summary>
    /// Additional metadata for the action
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }
}