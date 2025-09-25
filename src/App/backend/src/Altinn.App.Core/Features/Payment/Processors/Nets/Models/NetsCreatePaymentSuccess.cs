namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Successful response from /payments endpoint
/// </summary>
internal class NetsCreatePaymentSuccess
{
    /// <summary>
    /// The identifier (UUID) of the newly created payment object. Use this identifier in subsequent request when referring to the new payment.
    /// </summary>
    public required string PaymentId { get; set; }

    /// <summary>
    /// The URL your website should redirect to if using a hosted pre-built checkout page.
    /// </summary>
    public string? HostedPaymentPageUrl { get; set; }
}
