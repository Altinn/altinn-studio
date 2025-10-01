using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Defines an error object that should be returned if the action fails
/// </summary>
public class ActionError
{
    /// <summary>
    /// Machine readable error code
    /// </summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    /// <summary>
    /// Human readable error message or text key
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Error metadata
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }
}
