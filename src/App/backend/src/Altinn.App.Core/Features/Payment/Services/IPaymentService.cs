using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Service for handling payment.
/// </summary>
internal interface IPaymentService
{
    /// <summary>
    /// Start payment for an instance. Will clean up any existing non-completed payment before starting a new payment.
    /// </summary>
    Task<(PaymentInformation paymentInformation, bool alreadyPaid)> StartPayment(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    );

    /// <summary>
    /// Check updated payment information from payment provider and store the updated data.
    /// Operates on the instance's current task.
    /// </summary>
    Task<PaymentInformation> CheckAndStorePaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    );

    /// <summary>
    /// Check updated payment information from the payment provider for the given task without persisting any changes.
    /// Use when reading payment status for a task that is not the instance's current task.
    /// </summary>
    Task<PaymentInformation> CheckPaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string taskId,
        string? language
    );

    /// <summary>
    /// Handle webhook callback from the payment provider indicating that the payment is completed.
    /// Calls the provider for status, not trusting the webhook alone.
    /// </summary>
    /// <returns>A string with info about the callback success. Can be used for logging or return
    /// </returns>
    Task<string> HandlePaymentCompletedWebhook(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        StorageAuthenticationMethod storageAuthenticationMethod
    );

    /// <summary>
    /// Get our internal payment status. Will only check the local status and will not get updated status from the payment provider.
    /// </summary>
    Task<PaymentStatus> GetPaymentStatus(Instance instance, ValidAltinnPaymentConfiguration paymentConfiguration);

    /// <summary>
    /// Cancel payment with payment processor and delete internal payment information.
    /// </summary>
    Task CancelAndDeleteAnyExistingPayment(Instance instance, ValidAltinnPaymentConfiguration paymentConfiguration);
}
