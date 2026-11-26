using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Service for handling payment.
/// </summary>
internal interface IPaymentService
{
    /// <summary>
    /// Opens a payment attempt: creates the payment at the payment processor and stores it with the attempt's
    /// mailbox, or adopts a payment an earlier visit to the task left. Anything that stops the payment from being
    /// created releases the instance, so it is not held while the engine retries the create.
    /// </summary>
    Task<ServiceTaskOpeningStageResult> StartAttempt(
        StageContext context,
        ServiceTaskMailbox mailbox,
        ValidAltinnPaymentConfiguration paymentConfiguration
    );

    /// <summary>
    /// Answers a message to an open payment attempt, from the verdict for what the payment processor reports.
    /// </summary>
    Task<ServiceTaskExchangeResult> HandleAttemptMessage(
        StageContext context,
        ServiceTaskReply reply,
        ValidAltinnPaymentConfiguration paymentConfiguration
    );

    /// <summary>
    /// Ends a payment attempt whose mailbox closed, from the verdict for what the payment processor reports.
    /// </summary>
    Task<ServiceTaskResult> SettleAtDeadline(
        StageContext context,
        ValidAltinnPaymentConfiguration paymentConfiguration
    );

    /// <summary>
    /// Asks the payment processor about a stored payment the record does not show as paid, and stages what it reports
    /// on <paramref name="dataMutator"/>, for the caller to save.
    /// </summary>
    Task RefreshUnpaidPayment(
        IInstanceDataMutator dataMutator,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The stored payment record of <paramref name="taskId"/>, or an <see cref="PaymentStatus.Uninitialized"/> one with
    /// the calculated order details when there is none. Asks the payment processor nothing.
    /// </summary>
    Task<PaymentInformation> GetPaymentInformation(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The status the payment processor reports for the stored payment, without storing it.
    /// </summary>
    Task<PaymentStatus> GetProcessorStatus(
        Instance instance,
        PaymentInformation paymentInformation,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The payment record, of any payment task in the process, that holds the processor's payment
    /// <paramref name="paymentId"/>, read as the service owner. Null when no record holds it.
    /// </summary>
    Task<PaymentInformation?> FindPaymentRecord(
        Instance instance,
        string paymentId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Settles the stored payment with the payment processor before a reject abandons the payment task, while the
    /// instance is still idle. Stages what it stores on <paramref name="dataMutator"/>, for the caller to save.
    /// </summary>
    /// <remarks>
    /// A payment that could still complete is terminated, and stored as cancelled. When the payment processor refuses,
    /// the status it reports is stored unless the payment could still complete. Throws when the payment processor
    /// cannot be asked, or refuses to terminate a payment that could still complete, so the reject fails and can be
    /// tried again.
    /// </remarks>
    /// <returns>Whether the payment has gone through.</returns>
    Task<bool> PrepareAbandon(
        IInstanceDataMutator dataMutator,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    );
}
