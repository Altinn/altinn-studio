using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a status overview from a single notification channel.
/// </summary>
public sealed record CorrespondenceNotificationStatusDetailsResponse
{
    /// <summary>
    /// The notification id.
    /// </summary>
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    /// <summary>
    /// Indicates if the sending of the notification was successful.
    /// </summary>
    [JsonPropertyName("succeeded")]
    public bool Succeeded { get; init; }

    /// <summary>
    /// The recipient of the notification. Either an organisation number or identity number.
    /// </summary>
    [JsonPropertyName("recipient")]
    public CorrespondenceNotificationRecipientResponse? Recipient { get; init; }

    /// <summary>
    /// The result status of the notification.
    /// </summary>
    [JsonPropertyName("sendStatus")]
    public CorrespondenceNotificationStatusSummaryResponse? SendStatus { get; init; }
}
