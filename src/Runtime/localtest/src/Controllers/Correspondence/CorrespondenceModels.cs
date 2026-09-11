using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Correspondence.Controllers;

/// <summary>
/// The status of a correspondence. Mirrors the status enum the Correspondence API serializes by member name.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceStatus
{
    /// <summary>Correspondence has been initialized.</summary>
    Initialized,

    /// <summary>Correspondence is ready for publish, but not available for the recipient.</summary>
    ReadyForPublish,

    /// <summary>Correspondence has been published, and is available for the recipient.</summary>
    Published,

    /// <summary>Correspondence fetched by the recipient.</summary>
    Fetched,

    /// <summary>Correspondence read by the recipient.</summary>
    Read,

    /// <summary>The recipient has replied to the correspondence.</summary>
    Replied,

    /// <summary>Correspondence confirmed by the recipient.</summary>
    Confirmed,

    /// <summary>Correspondence has been purged by the recipient.</summary>
    PurgedByRecipient,

    /// <summary>Correspondence has been purged by Altinn.</summary>
    PurgedByAltinn,

    /// <summary>Correspondence has been archived.</summary>
    Archived,

    /// <summary>The recipient has opted out of digital communication in KRR.</summary>
    Reserved,

    /// <summary>Correspondence has failed.</summary>
    Failed,

    /// <summary>Attachments have been downloaded by the recipient.</summary>
    AttachmentsDownloaded,
}

/// <summary>
/// Request body for <c>POST correspondence/api/v1/correspondence</c>.
/// Only the fields Localtest needs to answer the app are modeled; the full body is persisted verbatim.
/// </summary>
public sealed class InitializeCorrespondencesRequestDto
{
    /// <summary>
    /// The correspondence details, shared across all <see cref="Recipients"/>.
    /// </summary>
    [JsonPropertyName("correspondence")]
    public CorrespondenceDetailsRequestDto? Correspondence { get; set; }

    /// <summary>
    /// The recipients, as organization numbers or national identity numbers in URN format.
    /// </summary>
    [JsonPropertyName("recipients")]
    public IReadOnlyList<string>? Recipients { get; set; }

    /// <summary>
    /// IDs of pre-uploaded attachments. Localtest does not support attachments.
    /// </summary>
    [JsonPropertyName("existingAttachments")]
    public IReadOnlyList<Guid>? ExistingAttachments { get; set; }

    /// <summary>
    /// Optional key that prevents the same correspondence being created twice.
    /// </summary>
    [JsonPropertyName("idempotentKey")]
    public Guid? IdempotentKey { get; set; }
}

/// <summary>
/// The correspondence metadata within an <see cref="InitializeCorrespondencesRequestDto"/>.
/// </summary>
public sealed class CorrespondenceDetailsRequestDto
{
    /// <summary>The resource ID for the correspondence service.</summary>
    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    /// <summary>A reference value given to the message by the creator.</summary>
    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <summary>An alternative display name for the sender.</summary>
    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; set; }

    /// <summary>The content of the message (title, summary, and body).</summary>
    [JsonPropertyName("content")]
    public CorrespondenceContentDto? Content { get; set; }

    /// <summary>When the correspondence should become visible to the recipient.</summary>
    [JsonPropertyName("requestedPublishTime")]
    public DateTimeOffset? RequestedPublishTime { get; set; }

    /// <summary>The deadline by which the recipient must respond.</summary>
    [JsonPropertyName("dueDateTime")]
    public DateTimeOffset? DueDateTime { get; set; }

    /// <summary>User-defined properties related to the correspondence.</summary>
    [JsonPropertyName("propertyList")]
    public IReadOnlyDictionary<string, string>? PropertyList { get; set; }

    /// <summary>Whether the correspondence can override a reservation against digital communication in KRR.</summary>
    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; set; }

    /// <summary>Whether reading the correspondence must be confirmed by the recipient.</summary>
    [JsonPropertyName("isConfirmationNeeded")]
    public bool IsConfirmationNeeded { get; set; }

    /// <summary>Whether the correspondence is confidential.</summary>
    [JsonPropertyName("isConfidential")]
    public bool IsConfidential { get; set; }
}

/// <summary>
/// The message content of a correspondence.
/// </summary>
public sealed class CorrespondenceContentDto
{
    /// <summary>The language of the correspondence, according to ISO 639-1.</summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>The message title (subject).</summary>
    [JsonPropertyName("messageTitle")]
    public string? MessageTitle { get; set; }

    /// <summary>The summary text of the message.</summary>
    [JsonPropertyName("messageSummary")]
    public string? MessageSummary { get; set; }

    /// <summary>The full body text of the message.</summary>
    [JsonPropertyName("messageBody")]
    public string? MessageBody { get; set; }

    /// <summary>Attachments on the correspondence. Always empty in Localtest.</summary>
    [JsonPropertyName("attachments")]
    public IReadOnlyList<object> Attachments { get; set; } = [];
}

/// <summary>
/// Response body for <c>POST correspondence/api/v1/correspondence</c>.
/// </summary>
public sealed class InitializeCorrespondencesResponseDto
{
    /// <summary>The correspondences that were created, one per recipient.</summary>
    [JsonPropertyName("correspondences")]
    public required IReadOnlyList<CorrespondenceOverviewDto> Correspondences { get; set; }

    /// <summary>The attachments linked to the correspondence. Always empty in Localtest.</summary>
    [JsonPropertyName("attachmentIds")]
    public IReadOnlyList<Guid> AttachmentIds { get; set; } = [];
}

/// <summary>
/// A single created correspondence within an <see cref="InitializeCorrespondencesResponseDto"/>.
/// </summary>
public sealed class CorrespondenceOverviewDto
{
    /// <summary>The correspondence identifier.</summary>
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; set; }

    /// <summary>The status of the correspondence.</summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    /// <summary>The recipient, echoed back exactly as the caller sent it.</summary>
    [JsonPropertyName("recipient")]
    public required string Recipient { get; set; }

    /// <summary>Notifications linked to the correspondence. Always empty in Localtest.</summary>
    [JsonPropertyName("notifications")]
    public IReadOnlyList<object> Notifications { get; set; } = [];
}

/// <summary>
/// Response body for <c>GET correspondence/api/v1/correspondence/{correspondenceId}/details</c>.
/// </summary>
public sealed class CorrespondenceDetailsResponseDto
{
    /// <summary>The status history for the correspondence.</summary>
    [JsonPropertyName("statusHistory")]
    public required IReadOnlyList<CorrespondenceStatusEventDto> StatusHistory { get; set; }

    /// <summary>Notifications related to this correspondence. Always empty in Localtest.</summary>
    [JsonPropertyName("notifications")]
    public IReadOnlyList<object> Notifications { get; set; } = [];

    /// <summary>The recipient, echoed back exactly as the caller sent it.</summary>
    [JsonPropertyName("recipient")]
    public required string Recipient { get; set; }

    /// <summary>Whether the recipient has marked the correspondence as unread.</summary>
    [JsonPropertyName("markedUnread")]
    public bool MarkedUnread { get; set; }

    /// <summary>The correspondence identifier.</summary>
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; set; }

    /// <summary>The correspondence content.</summary>
    [JsonPropertyName("content")]
    public CorrespondenceContentDto? Content { get; set; }

    /// <summary>When the correspondence was created.</summary>
    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    /// <summary>The current status of the correspondence.</summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    /// <summary>The current status text of the correspondence.</summary>
    [JsonPropertyName("statusText")]
    public string? StatusText { get; set; }

    /// <summary>When the current status was set.</summary>
    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }

    /// <summary>The resource ID for the correspondence service.</summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; set; }

    /// <summary>A reference value given to the message by the creator.</summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; set; }

    /// <summary>An alternative display name for the sender.</summary>
    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; set; }

    /// <summary>When the correspondence should become visible to the recipient.</summary>
    [JsonPropertyName("requestedPublishTime")]
    public DateTimeOffset? RequestedPublishTime { get; set; }

    /// <summary>The deadline by which the recipient must respond.</summary>
    [JsonPropertyName("dueDateTime")]
    public DateTimeOffset? DueDateTime { get; set; }

    /// <summary>User-defined properties related to the correspondence.</summary>
    [JsonPropertyName("propertyList")]
    public IReadOnlyDictionary<string, string>? PropertyList { get; set; }

    /// <summary>Whether the correspondence can override a reservation against digital communication in KRR.</summary>
    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; set; }

    /// <summary>When the correspondence was published. Localtest never publishes.</summary>
    [JsonPropertyName("published")]
    public DateTimeOffset? Published { get; set; }

    /// <summary>Whether reading the correspondence must be confirmed by the recipient.</summary>
    [JsonPropertyName("isConfirmationNeeded")]
    public bool IsConfirmationNeeded { get; set; }

    /// <summary>Whether the correspondence is confidential.</summary>
    [JsonPropertyName("isConfidential")]
    public bool IsConfidential { get; set; }
}

/// <summary>
/// A correspondence status event.
/// </summary>
public sealed class CorrespondenceStatusEventDto
{
    /// <summary>The event status indicator.</summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    /// <summary>Description of the status.</summary>
    [JsonPropertyName("statusText")]
    public required string StatusText { get; set; }

    /// <summary>When this status event occurred.</summary>
    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }
}

/// <summary>
/// One correspondence as Localtest persists it, one file per correspondence.
/// The full request body is kept alongside the extracted fields so a developer can see what the app sent.
/// </summary>
public sealed class StoredCorrespondence
{
    /// <summary>The correspondence identifier, and the name of the file this record is stored in.</summary>
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; set; }

    /// <summary>The idempotent key the request carried, if any. Duplicate detection is by this value.</summary>
    [JsonPropertyName("idempotentKey")]
    public Guid? IdempotentKey { get; set; }

    /// <summary>The recipient, exactly as the caller sent it.</summary>
    [JsonPropertyName("recipient")]
    public required string Recipient { get; set; }

    /// <summary>The resource ID from the request.</summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; set; }

    /// <summary>The senders reference from the request.</summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; set; }

    /// <summary>The alternative sender display name from the request.</summary>
    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; set; }

    /// <summary>The status of the correspondence.</summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    /// <summary>When Localtest created the correspondence.</summary>
    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    /// <summary>The request body the app sent, stored verbatim.</summary>
    [JsonPropertyName("request")]
    public JsonElement Request { get; set; }
}
