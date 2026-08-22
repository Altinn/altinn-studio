namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hands a message received from an external system to the mailbox a service task is waiting on, where the
/// task's reply handler processes it as its own durable piece of work.
/// </summary>
/// <remarks>
/// The declaring stage published <see cref="ServiceTaskMailbox.Id"/> as the reply address; the channel that
/// receives the answer reads the echoed address and calls <see cref="ForwardReply"/>, doing no work of its
/// own beyond decoding enough to forward. An early message is not an error — it is accepted and read by the
/// receiver enqueued for its position. Pass the source's own message id as <c>idempotencyKey</c>, since
/// channels and retries both deliver at least once. Keep the payload small (the engine accepts 256 KB, and
/// the integrity envelope's escaping leaves roughly half for a JSON body), and resolve the forwarder per
/// message from a scope — injecting this transient into a singleton subscriber pins its HttpClient.
/// </remarks>
public interface IServiceTaskReplyForwarder
{
    /// <summary>Forwards a message to the mailbox waiting for it.</summary>
    /// <param name="mailboxId">The value the external system echoed back — the published reply address.</param>
    /// <param name="serviceTaskType">
    /// The <c>IServiceTask.Type</c> whose reply handler reads this message. Name it directly: it is bound into
    /// the integrity envelope, which is what stops another mailbox-declaring task from reading the message.
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
        string serviceTaskType,
        string payload,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    );
}
