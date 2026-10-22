namespace Altinn.App.Core.Features.Payment.Services;

/// <summary>
/// Whether the payment task can be abandoned, as settled by <see cref="IPaymentService.PrepareAbandon"/>.
/// </summary>
internal enum PaymentAbandonOutcome
{
    /// <summary>
    /// There is no payment that could still complete, so the payment task can be abandoned.
    /// </summary>
    CanAbandon,

    /// <summary>
    /// The payment has gone through at the payment processor, so the payment task must not be abandoned.
    /// </summary>
    AlreadyPaid,

    /// <summary>
    /// The payment processor refused to terminate the payment, and does not report it as gone through either.
    /// </summary>
    NotTerminated,

    /// <summary>
    /// The payment processor could not be asked.
    /// </summary>
    PaymentProcessorFailed,
}
