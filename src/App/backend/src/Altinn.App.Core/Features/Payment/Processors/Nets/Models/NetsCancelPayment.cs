namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Cancels a payment's reservation. https://developer.nexigroup.com/nexi-checkout/en-EU/api/payment-v1/#v1-payments-paymentid-cancels-post
/// </summary>
internal sealed class NetsCancelPayment
{
    /// <summary>
    /// The amount to cancel, in the lowest monetary unit. The full amount of the order cancels the whole reservation.
    /// </summary>
    public required int Amount { get; init; }
}
