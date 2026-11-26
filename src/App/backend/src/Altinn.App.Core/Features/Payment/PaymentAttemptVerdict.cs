using System.Diagnostics;
using Altinn.App.Core.Features.Payment.Models;

namespace Altinn.App.Core.Features.Payment;

/// <summary>What ended a payment attempt's wait.</summary>
internal enum PaymentAttemptTrigger
{
    /// <summary>A check from the user, or a Nets event other than a failed charge.</summary>
    StatusUpdate,

    /// <summary>Nets' <c>payment.charge.failed</c> event.</summary>
    ChargeFailed,

    /// <summary>The user cancels the attempt.</summary>
    Cancel,

    /// <summary>The attempt's mailbox closed.</summary>
    Deadline,
}

/// <summary>A call to the payment processor that a verdict needs accepted before it stores and ends.</summary>
internal enum PaymentProcessorCall
{
    Terminate,
    CancelReservation,
}

/// <summary>How a payment attempt ends after a message or its deadline. Its names are stored in payment records.</summary>
internal enum PaymentAttemptEnding
{
    /// <summary>Stays open for the next message.</summary>
    AwaitNextMessage,

    /// <summary>Moves the process on with <c>confirm</c>.</summary>
    MoveOn,

    /// <summary>
    /// Moves the process back with <c>reject</c>. A verdict's go-back releases the instance instead when the task has no
    /// way back.
    /// </summary>
    GoBack,

    /// <summary>Releases the instance on the payment task.</summary>
    Release,
}

/// <summary>What a payment attempt stores and how it ends, once <see cref="CallFirst"/>, if any, was accepted.</summary>
internal sealed record PaymentAttemptVerdict(
    PaymentStatus Store,
    PaymentAttemptEnding End,
    PaymentProcessorCall? CallFirst = null
)
{
    /// <summary>
    /// The verdict table: what a payment attempt does for what ended its wait, given the status the payment processor
    /// reports. Null for a status no payment processor reports for a started payment.
    /// </summary>
    public static PaymentAttemptVerdict? Decide(PaymentAttemptTrigger trigger, PaymentStatus reported) =>
        (trigger, reported) switch
        {
            (_, PaymentStatus.Paid) => new(PaymentStatus.Paid, PaymentAttemptEnding.MoveOn),

            // Open at the processor.
            (PaymentAttemptTrigger.Cancel, PaymentStatus.Created) => new(
                PaymentStatus.Cancelled,
                PaymentAttemptEnding.GoBack,
                PaymentProcessorCall.Terminate
            ),
            (PaymentAttemptTrigger.Deadline, PaymentStatus.Created) => new(
                PaymentStatus.Cancelled,
                PaymentAttemptEnding.Release,
                PaymentProcessorCall.Terminate
            ),
            (_, PaymentStatus.Created) => new(PaymentStatus.Created, PaymentAttemptEnding.AwaitNextMessage),
            (PaymentAttemptTrigger.ChargeFailed, PaymentStatus.Authorized) => new(
                PaymentStatus.Failed,
                PaymentAttemptEnding.Release,
                PaymentProcessorCall.CancelReservation
            ),
            (PaymentAttemptTrigger.Deadline, PaymentStatus.Authorized) => new(
                PaymentStatus.Cancelled,
                PaymentAttemptEnding.Release,
                PaymentProcessorCall.CancelReservation
            ),
            // A cancel too: the reserved money cannot be given back from here.
            (_, PaymentStatus.Authorized) => new(PaymentStatus.Authorized, PaymentAttemptEnding.AwaitNextMessage),

            // Closed at the processor.
            (PaymentAttemptTrigger.ChargeFailed, PaymentStatus.Cancelled) => new(
                PaymentStatus.Failed,
                PaymentAttemptEnding.Release
            ),
            (PaymentAttemptTrigger.Cancel, PaymentStatus.Cancelled or PaymentStatus.Failed) => new(
                reported,
                PaymentAttemptEnding.GoBack
            ),
            (_, PaymentStatus.Cancelled or PaymentStatus.Failed) => new(reported, PaymentAttemptEnding.Release),

            _ => null,
        };

    /// <summary>
    /// Checks, before the attempt stores and ends, that it releases or moves back on a payment the processor reports as
    /// open only after the processor accepted the call the verdict names: never on something it only read.
    /// </summary>
    /// <exception cref="UnreachableException">The verdict would end the attempt on an open payment.</exception>
    public void EnsureMayEnd(PaymentStatus reported, PaymentProcessorCall? acceptedCall)
    {
        if (
            End is PaymentAttemptEnding.Release or PaymentAttemptEnding.GoBack
            && !reported.IsClosed()
            && (acceptedCall is null || acceptedCall != CallFirst)
        )
        {
            throw new UnreachableException(
                $"The verdict to store {Store} and end with {End} on a payment reported as {reported} has no accepted call to the payment processor."
            );
        }
    }
}
