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
    /// </summary>
    Task<PaymentInformation> CheckAndStorePaymentStatus(
        Instance instance,
        ValidAltinnPaymentConfiguration paymentConfiguration,
        string? language
    );

    /// <summary>
    /// Check our internal state to see if payment is complete.
    /// </summary>
    Task<bool> IsPaymentCompleted(Instance instance, ValidAltinnPaymentConfiguration paymentConfiguration);

    /// <summary>
    /// Cancel payment with payment processor and delete internal payment information.
    /// </summary>
    Task CancelAndDeleteAnyExistingPayment(Instance instance, ValidAltinnPaymentConfiguration paymentConfiguration);
}
