using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Details about a correspondence notification.
/// </summary>
public sealed record CorrespondenceNotificationDetailsResponse
{
    /// <summary>
    /// The notification order identifier.
    /// </summary>
    [JsonPropertyName("orderId")]
    public Guid? OrderId { get; init; }

    /// <summary>
    /// Whether this is a reminder notification.
    /// </summary>
    [JsonPropertyName("isReminder")]
    public bool? IsReminder { get; init; }

    /// <summary>
    /// The status of the notification.
    /// </summary>
    [JsonPropertyName("status")]
    public CorrespondenceNotificationStatusResponse Status { get; init; }
}
