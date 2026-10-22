namespace Altinn.App.Core.Features.Payment.Models;

internal static class PaymentStatusExtensions
{
    /// <summary>
    /// Whether the payment can no longer be paid at the payment processor, so that dropping its record loses nothing,
    /// and neither a reject nor a new payment needs to ask the processor about it.
    /// </summary>
    public static bool IsClosed(this PaymentStatus status) =>
        status is PaymentStatus.Skipped or PaymentStatus.Cancelled or PaymentStatus.Failed;

    /// <summary>
    /// Whether the payment has gone through at the payment processor, whether or not it is charged yet.
    /// </summary>
    public static bool HasGoneThrough(this PaymentStatus status) =>
        status is PaymentStatus.Paid or PaymentStatus.Authorized;
}
