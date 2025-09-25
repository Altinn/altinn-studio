using Altinn.App.Core.Features.Payment.Processors.Nets.Models;

namespace Altinn.App.Core.Features.Payment.Processors.Nets;

/// <summary>
/// Represents a client for interacting with the Nets payment provider.
/// </summary>
internal interface INetsClient
{
    /// <summary>
    /// Creates a payment using the Nets payment provider.
    /// </summary>
    /// <param name="payment">The payment details.</param>
    /// <returns></returns>
    Task<HttpApiResult<NetsCreatePaymentSuccess>> CreatePayment(NetsCreatePayment payment);

    /// <summary>
    /// Retrieve existing payment.
    /// </summary>
    /// <param name="paymentId"></param>
    /// <returns></returns>
    Task<HttpApiResult<NetsPaymentFull>> RetrievePayment(string paymentId);

    /// <summary>
    /// Terminate a payment that has not been captured.
    /// </summary>
    /// <param name="paymentId"></param>
    /// <returns></returns>
    Task<bool> TerminatePayment(string paymentId);
}
