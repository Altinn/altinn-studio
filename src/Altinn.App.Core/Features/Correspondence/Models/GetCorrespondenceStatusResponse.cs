using System.Text.Json.Serialization;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Response after a successful <see cref="CorrespondenceClient.GetStatus"/> request.
/// </summary>
public sealed record GetCorrespondenceStatusResponse
{
    /// <summary>
    /// The status history for the correspondence.
    /// </summary>
    [JsonPropertyName("statusHistory")]
    public required IEnumerable<CorrespondenceStatusEventResponse> StatusHistory { get; init; }

    /// <summary>
    /// Notifications directly related to this correspondence.
    /// </summary>
    [JsonPropertyName("notifications")]
    public IEnumerable<CorrespondenceNotificationOrderResponse>? Notifications { get; init; }

    /// <summary>
    /// The recipient of the correspondence. Either an organisation number or identity number.
    /// </summary>
    [JsonPropertyName("recipient")]
    public required string Recipient { get; init; }

    /// <summary>
    /// Indicates if the correspondence has been set as unread by the recipient.
    /// </summary>
    [JsonPropertyName("markedUnread")]
    public bool? MarkedUnread { get; init; }

    /// <summary>
    /// Unique Id for this correspondence.
    /// </summary>
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; init; }

    /// <summary>
    /// The correspondence content. Contains information about the correspondence body, subject etc.
    /// </summary>
    [JsonPropertyName("content")]
    public CorrespondenceContentResponse? Content { get; init; }

    /// <summary>
    /// When the correspondence was created.
    /// </summary>
    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; init; }

    /// <summary>
    /// The current status for the correspondence.
    /// </summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; init; }

    /// <summary>
    /// The current status text for the correspondence.
    /// </summary>
    [JsonPropertyName("statusText")]
    public string? StatusText { get; init; }

    /// <summary>
    /// Timestamp for when the current correspondence status was changed.
    /// </summary>
    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; init; }

    /// <summary>
    /// The resource id for the correspondence service.
    /// </summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; init; }

    /// <summary>
    /// The sending organisation of the correspondence.
    /// </summary>
    [JsonPropertyName("sender")]
    [OrganisationNumberJsonConverter(OrganisationNumberFormat.International)]
    public OrganisationNumber Sender { get; init; }

    /// <summary>
    /// A reference value given to the message by the creator.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }

    /// <summary>
    /// An alternative name for the sender of the correspondence. The name will be displayed instead of the organization name.
    ///  </summary>
    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; init; }

    /// <summary>
    /// When the correspondence should become visible to the recipient.
    /// </summary>
    [JsonPropertyName("requestedPublishTime")]
    public DateTimeOffset? RequestedPublishTime { get; init; }

    /// <summary>
    /// The date for when Altinn can remove the correspondence from its database.
    /// </summary>
    [JsonPropertyName("allowSystemDeleteAfter")]
    public DateTimeOffset? AllowSystemDeleteAfter { get; init; }

    /// <summary>
    /// A date and time for when the recipient must reply.
    /// </summary>
    [JsonPropertyName("dueDateTime")]
    public DateTimeOffset? DueDateTime { get; init; }

    /// <summary>
    /// Reference to other items in the Altinn ecosystem.
    /// </summary>
    [JsonPropertyName("externalReferences")]
    public IEnumerable<CorrespondenceExternalReference>? ExternalReferences { get; init; }

    /// <summary>
    /// User-defined properties related to the correspondence.
    /// </summary>
    [JsonPropertyName("propertyList")]
    public IReadOnlyDictionary<string, string>? PropertyList { get; init; }

    /// <summary>
    /// Options for how the recipient can reply to the correspondence.
    /// </summary>
    [JsonPropertyName("replyOptions")]
    public IEnumerable<CorrespondenceReplyOption>? ReplyOptions { get; init; }

    /// <summary>
    /// Specifies whether the correspondence can override reservation against digital communication in KRR.
    /// </summary>
    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; init; }

    /// <summary>
    /// <p>The time the correspondence was published.</p>
    /// <p>A null value means the correspondence has not yet been published.</p>
    /// </summary>
    [JsonPropertyName("published")]
    public DateTimeOffset? Published { get; init; }

    /// <summary>
    /// Specifies whether reading the correspondence needs to be confirmed by the recipient.
    /// </summary>
    [JsonPropertyName("isConfirmationNeeded")]
    public bool IsConfirmationNeeded { get; init; }
}
