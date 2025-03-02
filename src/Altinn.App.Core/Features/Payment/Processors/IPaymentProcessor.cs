using Altinn.App.Core.Features.Payment.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment.Processors;

/// <summary>
/// Represents a payment processor that handles payment-related operations.
/// </summary>
[ImplementableByApps]
public interface IPaymentProcessor
{
    /// <summary>
    /// Internal ID for the payment processor.
    /// </summary>
    public string PaymentProcessorId { get; }

    /// <summary>
    /// Starts a payment process for the specified instance and order details.
    /// </summary>
    public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language);

    /// <summary>
    /// Terminate a payment for the specified instance and payment reference.
    /// </summary>
    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation);

    /// <summary>
    /// Gets the payment status for the specified instance and payment reference.
    /// </summary>
    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(
        Instance instance,
        string paymentId,
        decimal expectedTotalIncVat,
        string? language
    );
}
