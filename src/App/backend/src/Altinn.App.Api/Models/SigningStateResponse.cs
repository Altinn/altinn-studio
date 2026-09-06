using System.Text.Json.Serialization;

namespace Altinn.App.Api.Models;

/// <summary>
/// Contains the result of a get signees request.
/// </summary>
public class SigningStateResponse
{
    /// <summary>
    /// The signees for the current task.
    /// </summary>
    public required List<SigneeState> SigneeStates { get; init; }
}

/// <summary>
/// Contains information about a signee and the current signing status.
/// </summary>
public class SigneeState
{
    /// <summary>
    /// The name of the signee.
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// The organization of the signee.
    /// </summary>
    [JsonPropertyName("organization")]
    public string? Organization { get; set; }

    /// <summary>
    /// Whether delegation of signing rights has been successful.
    /// </summary>
    [JsonPropertyName("delegationSuccessful")]
    public bool DelegationSuccessful { get; set; }

    /// <summary>
    /// Whether the signee has been notified to sign via message to Altinn inbox.
    /// </summary>
    [JsonPropertyName("notificationStatus")]
    public NotificationStatus NotificationStatus { get; set; }

    /// <summary>
    /// The party id of the signee.
    /// </summary>
    [JsonPropertyName("partyId")]
    public required int PartyId { get; set; }

    /// <summary>
    /// The time the signee signed.
    /// </summary>
    [JsonPropertyName("signedTime")]
    public DateTime? SignedTime { get; set; }

    /// <summary>
    /// Why signing rights could not be delegated to the signee, when delegation failed for good. Null while
    /// delegation has succeeded, is still being attempted, or is not used by the task.
    /// </summary>
    [JsonPropertyName("delegationFailure")]
    public SigneeDelegationFailure? DelegationFailure { get; set; }

    /// <summary>
    /// Why the signee could not be notified, when notification failed for good. Null while the notification has
    /// been sent, is still being attempted, or is not used by the task.
    /// </summary>
    [JsonPropertyName("notificationFailure")]
    public SigneeNotificationFailure? NotificationFailure { get; set; }
}

/// <summary>
/// Represents the state of a notification.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<NotificationStatus>))]
public enum NotificationStatus
{
    /// <summary>
    /// Notification has not been configures and thus has not been sent.
    /// </summary>
    NotSent,

    /// <summary>
    /// The notification has been sent successfully.
    /// </summary>
    Sent,

    /// <summary>
    /// The notification sending has failed.
    /// </summary>
    Failed,
}

/// <summary>
/// Why delegating signing rights to a signee failed for good.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<SigneeDelegationFailure>))]
public enum SigneeDelegationFailure
{
    /// <summary>
    /// The signee's party cannot receive rights, for example because it has no party uuid.
    /// </summary>
    InvalidParty,

    /// <summary>
    /// Access Management rejected the delegation.
    /// </summary>
    Rejected,

    /// <summary>
    /// Delegation failed for a reason this version does not classify. The app logs carry the details.
    /// </summary>
    Unknown,
}

/// <summary>
/// Why notifying a signee failed for good.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<SigneeNotificationFailure>))]
public enum SigneeNotificationFailure
{
    /// <summary>
    /// The app's correspondence configuration is missing or invalid for this environment.
    /// </summary>
    Configuration,

    /// <summary>
    /// The service owner's party, the sender of the notification, could not be resolved.
    /// </summary>
    ServiceOwnerUnavailable,

    /// <summary>
    /// Correspondence rejected the message.
    /// </summary>
    Rejected,

    /// <summary>
    /// Notification failed for a reason this version does not classify. The app logs carry the details.
    /// </summary>
    Unknown,
}
