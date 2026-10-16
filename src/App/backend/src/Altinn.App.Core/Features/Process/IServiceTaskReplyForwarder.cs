namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hands a message received from an external system to the mailbox a service task is waiting on, where the
/// task's reply handler processes it as its own durable piece of work.
/// </summary>
/// <remarks>
/// Resolve the forwarder per message from a scope — injecting this transient into a singleton subscriber
/// pins its HttpClient. Forwarding guidance (payload limits, early messages, outcome handling):
/// <c>docs/service-task-pipelines.md</c> in the app-lib repository.
/// </remarks>
public interface IServiceTaskReplyForwarder
{
    /// <summary>Forwards a message to the mailbox waiting for it.</summary>
    /// <param name="mailboxId">The value the external system echoed back — the published reply address.</param>
    /// <param name="owner">
    /// The pipeline whose reply handler reads this message: <see cref="MailboxOwner.ServiceTask"/> or
    /// <see cref="MailboxOwner.SideEffect"/>, or the <see cref="ServiceTaskMailbox.Owner"/> the opening stage was
    /// handed. Name it directly: it is bound into the integrity envelope, which is what stops another pipeline
    /// that opens mailboxes from reading the message.
    /// </param>
    /// <param name="payload">The message body, as the reply handler expects to read it.</param>
    /// <param name="idempotencyKey">
    /// The source's own message id; makes forwarding twice harmless. At most 200 characters.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Completes when accepted — including when the key was already accepted by this mailbox.</returns>
    /// <exception cref="ServiceTaskReplyForwardException">
    /// Not accepted. Branch on <see cref="ServiceTaskReplyForwardException.Outcome"/> and
    /// <see cref="ServiceTaskReplyForwardException.IsTransient"/>.
    /// </exception>
    Task ForwardReply(
        Guid mailboxId,
        MailboxOwner owner,
        string payload,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    );
}
