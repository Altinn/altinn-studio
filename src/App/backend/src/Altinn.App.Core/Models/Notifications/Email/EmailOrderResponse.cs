using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Notifications.Email;

/// <summary>
/// The response from the email notification API.
/// </summary>
/// <param name="OrderId">ID of the order, can be used to lookup status of the notification order.</param>
public sealed record EmailOrderResponse([property: JsonPropertyName("orderId")] string OrderId);
