using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Notifications.Sms;

/// <summary>
/// Response from the Altinn SMS notifications API.
/// </summary>
/// <param name="OrderId">ID of the order, can be used to lookup status of the notification order.</param>
public sealed record SmsOrderResponse([property: JsonPropertyName("orderId")] string OrderId);
