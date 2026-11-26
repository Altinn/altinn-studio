using Altinn.App.Core.Features.Payment.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment.Processors;

/// <summary>
/// What a built-in payment processor does for a payment attempt beyond <see cref="IPaymentProcessor"/>.
/// </summary>
internal interface IPaymentAttemptProcessor
{
    /// <summary>
    /// Starts a payment whose events from the processor go to the attempt's mailbox <paramref name="mailboxId"/>.
    /// </summary>
    Task<PaymentDetails> StartPayment(
        Instance instance,
        OrderDetails orderDetails,
        string? language,
        Guid mailboxId,
        CancellationToken cancellationToken
    );

    /// <summary>Cancels the reservation of a payment that is reserved and not charged. False when refused.</summary>
    Task<bool> CancelReservation(
        Instance instance,
        PaymentInformation paymentInformation,
        CancellationToken cancellationToken
    );
}
