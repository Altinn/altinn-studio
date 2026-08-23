namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Why the mailbox a service task opened stopped accepting messages, handed to the reply terminal's
/// <c>onClosed</c> handler — the execution that must conclude the exchange. It changes only how that
/// conclusion is <em>worded</em>: both reasons mean no message can arrive.
/// </summary>
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
