using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Correspondence.Controllers;

namespace LocalTest.Services.Correspondence;

/// <summary>
/// One correspondence as Localtest persists it, one file per correspondence. The request the app sent is kept
/// verbatim next to what Localtest made of it, so a developer can see exactly what went out.
/// </summary>
public sealed class StoredCorrespondence
{
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; set; }

    /// <summary>The idempotent key the request carried, if any. Duplicate detection is by this value.</summary>
    [JsonPropertyName("idempotentKey")]
    public Guid? IdempotentKey { get; set; }

    /// <summary>The recipient, exactly as the caller sent it.</summary>
    [JsonPropertyName("recipient")]
    public required string Recipient { get; set; }

    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; set; }

    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; set; }

    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; set; }

    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    [JsonPropertyName("published")]
    public DateTimeOffset? Published { get; set; }

    [JsonPropertyName("attachmentIds")]
    public IReadOnlyList<Guid> AttachmentIds { get; set; } = [];

    /// <summary>The notifications ordered for this correspondence: the first one, and a reminder if requested.</summary>
    [JsonPropertyName("notifications")]
    public IReadOnlyList<StoredNotification> Notifications { get; set; } = [];

    /// <summary>The request body the app sent, stored verbatim.</summary>
    [JsonPropertyName("request")]
    public JsonElement Request { get; set; }
}

/// <summary>
/// A notification order Localtest made for a correspondence, with the emails and SMS messages it would send.
/// Localtest sends nothing; it records what a deployed environment would have sent, and to whom.
/// </summary>
public sealed class StoredNotification
{
    [JsonPropertyName("orderId")]
    public Guid OrderId { get; set; }

    [JsonPropertyName("isReminder")]
    public bool IsReminder { get; set; }

    [JsonPropertyName("channel")]
    public NotificationChannel Channel { get; set; }

    [JsonPropertyName("template")]
    public NotificationTemplate Template { get; set; }

    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    /// <summary>When the notification goes out: straight away, or a week later for a reminder.</summary>
    [JsonPropertyName("requestedSendTime")]
    public DateTimeOffset RequestedSendTime { get; set; }

    [JsonPropertyName("status")]
    public NotificationStatus Status { get; set; }

    [JsonPropertyName("emails")]
    public IReadOnlyList<SentEmail> Emails { get; set; } = [];

    [JsonPropertyName("smses")]
    public IReadOnlyList<SentSms> Smses { get; set; } = [];
}

/// <summary>One email of a notification order.</summary>
public sealed class SentEmail
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("recipient")]
    public required NotificationRecipientDto Recipient { get; set; }

    [JsonPropertyName("subject")]
    public required string Subject { get; set; }

    [JsonPropertyName("body")]
    public required string Body { get; set; }
}

/// <summary>One SMS message of a notification order.</summary>
public sealed class SentSms
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("recipient")]
    public required NotificationRecipientDto Recipient { get; set; }

    [JsonPropertyName("body")]
    public required string Body { get; set; }
}

/// <summary>
/// One attachment as Localtest persists it. Its data is stored next to it, in a file of its own.
/// </summary>
public sealed class StoredAttachment
{
    [JsonPropertyName("attachmentId")]
    public Guid AttachmentId { get; set; }

    [JsonPropertyName("status")]
    public AttachmentStatus Status { get; set; }

    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }

    /// <summary>The content type of the uploaded data, once uploaded.</summary>
    [JsonPropertyName("dataType")]
    public string? DataType { get; set; }

    /// <summary>The size of the uploaded data in bytes, once uploaded.</summary>
    [JsonPropertyName("size")]
    public long? Size { get; set; }

    /// <summary>The request the app initialized the attachment with.</summary>
    [JsonPropertyName("request")]
    public required InitializeAttachmentRequestDto Request { get; set; }
}
