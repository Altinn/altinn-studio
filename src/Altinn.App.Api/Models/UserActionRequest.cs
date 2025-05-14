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

    /// <summary>
    /// Ignored validators that should not be evauated as part of this action
    /// </summary>
    [JsonPropertyName("ignoredValidators")]
    public List<string>? IgnoredValidators { get; set; }

    /// <summary>
    /// The organisation number of the party the user is acting on behalf of
    /// </summary>
    [JsonPropertyName("onBehalfOf")]
    public string? OnBehalfOf { get; set; }
}
