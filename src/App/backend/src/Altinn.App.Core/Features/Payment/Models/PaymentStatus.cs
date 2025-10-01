using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// The status of a payment.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentStatus
{
    /// <summary>
    /// The payment is not initialized. We have not contacted the payment processor yet.
    /// </summary>
    Uninitialized,

    /// <summary>
    /// The payment request has been created and sent to payment processor.
    /// </summary>
    Created,

    /// <summary>
    /// The payment has been paid.
    /// </summary>
    Paid,

    /// <summary>
    /// Something went wrong and the payment is considered failed.
    /// </summary>
    Failed,

    /// <summary>
    /// The payment has been cancelled.
    /// </summary>
    Cancelled,

    /// <summary>
    /// The payment was skipped, likely because the sum of the order was zero.
    /// </summary>
    Skipped,
}
