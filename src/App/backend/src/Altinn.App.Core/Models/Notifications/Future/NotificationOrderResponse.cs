using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Notifications.Future;

/// <summary>
/// Represents the response received after ordering a notification, including details about the notification and any associated reminders.
/// </summary>
public sealed record NotificationOrderResponse
{
    /// <summary>
    /// The unique identifier for the notification order, which can be used for tracking and reference purposes.
    /// </summary>
    [JsonPropertyName("notificationOrderId")]
    public required Guid OrderChainId { get; init; }

    /// <summary>
    /// Details about the notification.
    /// </summary>
    [JsonPropertyName("notification")]
    public required NotificationOrderShipment Notification { get; init; }

    /// <summary>
    /// A list of reminders associated with the notification order, if any
    /// </summary>
    [JsonPropertyName("reminders")]
    public List<NotificationOrderShipment> Reminders { get; init; } = [];
}

/// <summary>
/// Represents the details of a notification shipment.
/// </summary>
public sealed record NotificationOrderShipment
{
    /// <summary>
    /// The unique identifier for the notification shipment.
    /// Used to cancel the shipment if needed.
    /// </summary>
    [JsonPropertyName("shipmentId")]
    public required Guid ShipmentId { get; init; }

    /// <summary>
    /// The reference from the request.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; init; }
}
