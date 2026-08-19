namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Why the mailbox a service task opened stopped accepting messages, read from
/// <see cref="ServiceTaskContext.ReplyClosedReason"/> on the execution that must conclude the
/// exchange.
/// </summary>
/// <remarks>
/// It changes only how a conclusion is <em>worded</em> — "the archive never confirmed before the
/// deadline" reads differently from "the exchange was closed". Both demand the same response:
/// conclude, with <see cref="ServiceTaskResult.Success"/> or
/// <see cref="ServiceTaskResult.FailedPermanent"/>. Asking for another message is a contract
/// violation either way, because no further message can ever arrive.
/// </remarks>
public enum MailboxClosedReason
{
    /// <summary>
    /// Something closed the mailbox before its deadline: this task's own conclusion on an earlier
    /// message, or an operator ending the exchange by hand.
    /// </summary>
    Request = 0,

    /// <summary>
    /// The exchange's deadline passed — <see cref="MailboxOptions.Timeout"/> measured from the moment
    /// the declaring stage opened the mailbox. The answer never came in time.
    /// </summary>
    Deadline = 1,
}
