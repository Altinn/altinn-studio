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
