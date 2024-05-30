namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// The payment information for a transaction.
/// </summary>
public class PaymentInformation
{
    /// <summary>
    /// The taskId of the payment task this payment information is associated with.
    /// </summary>
    public required string TaskId { get; set; }

    /// <summary>
    /// The status of the payment.
    /// </summary>
    public required PaymentStatus Status { get; set; }

    /// <summary>
    /// The order details for the transaction.
    /// </summary>
    public required OrderDetails OrderDetails { get; set; }

    /// <summary>
    /// Contains details about the payment, set by the payment processor implementation.
    /// </summary>
    public PaymentDetails? PaymentDetails { get; set; }
}
