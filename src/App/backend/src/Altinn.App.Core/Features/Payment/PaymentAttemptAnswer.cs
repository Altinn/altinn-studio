using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Models.Process;

namespace Altinn.App.Core.Features.Payment;

/// <summary>How a payment attempt answered a user's cancel or check.</summary>
internal abstract record PaymentAttemptAnswer
{
    private PaymentAttemptAnswer() { }

    /// <summary>
    /// The stored payment record, after any message was handled. <paramref name="AttemptOpen"/> tells whether the
    /// attempt still holds the task.
    /// </summary>
    internal sealed record Record(PaymentInformation Payment, bool AttemptOpen = false) : PaymentAttemptAnswer;

    /// <summary>No payment attempt holds the task.</summary>
    internal sealed record NotOpen : PaymentAttemptAnswer;

    /// <summary>The payment is reserved, so it cannot be cancelled.</summary>
    internal sealed record Reserved : PaymentAttemptAnswer;

    /// <summary>The payment processor could not be asked, so nothing was sent.</summary>
    internal sealed record ProcessorUnavailable : PaymentAttemptAnswer;

    /// <summary>The workflow engine or the signing of the message was unavailable. Sending again is safe.</summary>
    internal sealed record EngineUnavailable : PaymentAttemptAnswer;

    /// <summary>The attempt's mailbox takes no more messages.</summary>
    internal sealed record MessageLimit : PaymentAttemptAnswer;

    /// <summary>
    /// The attempt failed, failed to handle the message, or another workflow holds the instance, as
    /// <see cref="Result"/> says in process/next's terms.
    /// </summary>
    internal sealed record Refused(ProcessChangeResult Result) : PaymentAttemptAnswer;
}
