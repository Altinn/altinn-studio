using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models;

/// <summary>
/// Request body for signing the data elements of the current signing task.
/// </summary>
public class SigningRequest
{
    /// <summary>
    /// The organization number of the organization the signer signs on behalf of, when not signing as themselves.
    /// </summary>
    [JsonPropertyName("onBehalfOf")]
    public string? OnBehalfOf { get; set; }
}
