using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Service for handling payment.
/// </summary>
internal interface IPaymentService
{
    /// <summary>
    /// Start payment for an instance. Will clean up any existing non-completed payment before starting a new payment.
    /// An existing payment the payment processor refuses to terminate, because it has gone through, is stored and
    /// reported as already paid; if the stored record changed since <paramref name="instance"/> was read, the save fails
    /// with a conflict and the newer record stays.
    /// </summary>
    Task<(PaymentInformation paymentInformation, bool alreadyPaid)> StartPayment(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Check updated payment information from payment provider and store the updated data.
    /// Operates on the instance's current task.
    /// </summary>
    /// <remarks>
    /// Stores only a change, and only if neither the stored record nor the process has changed since
    /// <paramref name="fetchedInstance"/> was read. If either has, such as when the webhook stored the payment first,
    /// the request answers 409 and the form asks again, since what is stored is newer than the processor's answer to
    /// this call.
    /// </remarks>
    Task<PaymentInformation> CheckAndStorePaymentStatus(
        InstanceWithStorageMetadata fetchedInstance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Check updated payment information from the payment provider for the given task without persisting any changes.
    /// Use when reading payment status for a task that is not the instance's current task.
    /// </summary>
    Task<PaymentInformation> CheckPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Handle webhook callback from the payment provider indicating that the payment is completed.
    /// Calls the provider for status, not trusting the webhook alone.
    /// </summary>
    /// <remarks>
    /// Stores the status on condition that nothing changed since <paramref name="fetchedInstance"/> was read, and starts
    /// over once from a fresh read if something did. When the payment is paid and the instance is in its payment task,
    /// the process moves on as if the service owner had confirmed the task, and this returns once the transition has
    /// started. It starts the transition once more if a change to the instance stopped it from starting. It throws, so
    /// that the payment processor calls again, if it would have to start over a second time, if the transition does
    /// not start, or if another call started a different transition from the same version of the instance.
    /// </remarks>
    /// <returns>A string with info about the callback success. Can be used for logging or return
    /// </returns>
    Task<string> HandlePaymentCompletedWebhook(
        InstanceWithStorageMetadata fetchedInstance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
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

    /// <summary>
    /// Get our internal payment status. Will only check the local status and will not get updated status from the payment provider.
    /// </summary>
    Task<PaymentStatus> GetPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        CancellationToken cancellationToken = default
    );
}
