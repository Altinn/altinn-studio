using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Payload received from Nets when a payment is completed.
/// </summary>
public sealed class NetsCompleteWebhookPayload
{
    /// <summary>
    /// The unique identifier of the payment.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// The MerchantId of the payment.
    /// </summary>
    [JsonPropertyName("merchantId")]
    public required int MerchantId { get; set; }

    /// <summary>
    /// Timestamp of when the payment was created.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public required DateTimeOffset Timestamp { get; set; }

    /// <summary>
    /// The event name.
    /// </summary>
    [JsonPropertyName("event")]
    public required string EventName { get; set; }

    /// <summary>
    /// The data of the payment.
    /// </summary>
    [JsonPropertyName("data")]
    public required NetsCompleteWebhookPayloadData Data { get; set; }
}

/// <summary>
/// Represents the detailed data contained within the payload of a completed payment notification from Nets.
/// </summary>
public sealed class NetsCompleteWebhookPayloadData
{
    /// <summary>
    /// The unique identifier of the payment.
    /// </summary>
    [JsonPropertyName("paymentId")]
    public required string PaymentId { get; set; }
    //TODO: Add other properties if needed in the future
}
