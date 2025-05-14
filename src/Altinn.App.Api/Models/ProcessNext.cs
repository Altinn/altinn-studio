using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models;

/// <summary>
/// Model for process next body
/// </summary>
public class ProcessNext
{
    /// <summary>
    /// Action performed
    /// </summary>
    [JsonPropertyName("action")]
    public string? Action { get; set; }

    /// <summary>
    /// The organisation number of the party the user is acting on behalf of
    /// </summary>
    [JsonPropertyName("actionOnBehalfOf")]
    public string? ActionOnBehalfOf { get; set; }
}
