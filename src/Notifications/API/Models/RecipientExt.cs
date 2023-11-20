#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// Class representing a notification recipient
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class RecipientExt
{
    /// <summary>
    /// Gets or sets the email address of the recipient
    /// </summary>
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }
}
