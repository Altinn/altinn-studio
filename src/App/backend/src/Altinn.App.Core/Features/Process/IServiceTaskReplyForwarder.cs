namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hands a message received from an external system to the mailbox a service task is waiting on, which
/// processes it as its own durable piece of work in the task's reply handler.
/// </summary>
/// <remarks>
/// The declaring stage embeds <see cref="ServiceTaskMailbox.Id"/> in its outbound message as the address the
/// external system must answer to; whatever part of the app later receives that answer reads the echoed address
/// and calls <see cref="ForwardReply"/> with it. The receiving channel should do no work of its own beyond
/// decoding the message enough to forward it.
/// <para>
/// An early message is not an error: it is accepted, deduplicated and durable from first contact, and is read
/// by the receiver enqueued for its position — so the channel never has to delay or buffer.
/// </para>
/// <para>
/// Pass the source's own message id as <c>idempotencyKey</c>: channels deliver at least once, and so does any
/// retry of this call, and the key is what makes the second forward a recognised replay. The payload is opaque
/// to the platform and travels in a tamper-evident envelope bound to this mailbox, handler and message id;
/// keep it small, since the engine accepts 256 KB by default and the envelope's escaping leaves roughly half
/// of that for a JSON body.
/// </para>
/// <para>
/// Resolve it per message, from a scope: a message subscriber is usually a singleton <c>BackgroundService</c>,
/// and constructor-injecting this transient service pins it — and the <c>HttpClient</c> behind it — for the
/// process's whole lifetime.
/// </para>
/// </remarks>
public interface IServiceTaskReplyForwarder
{
    /// <summary>Forwards a message to the mailbox waiting for it.</summary>
    /// <param name="mailboxId">
    /// The value the external system echoed back — the <see cref="ServiceTaskMailbox.Id"/> the declaring stage
    /// embedded in its request.
    /// </param>
    /// <param name="serviceTaskType">
    /// The <c>IServiceTask.Type</c> of the service task whose reply handler reads this message. Name it directly
    /// rather than looking it up: the platform binds it into the message's integrity envelope, which is what stops
    /// a message meant for this handler from being read by another mailbox-declaring task of the same app.
    /// </param>
    /// <param name="payload">The message body, as the task's reply handler expects to read it.</param>
    /// <param name="idempotencyKey">
    /// The source's own identity for this message (e.g. a Fiks IO message id). Required: it is what makes
    /// forwarding the same message twice harmless. At most 200 characters.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// A task that completes when the message has been accepted — including when the same
    /// <paramref name="idempotencyKey"/> was already accepted by this mailbox.
    /// </returns>
    /// <exception cref="ServiceTaskReplyForwardException">
    /// The message was not accepted. Inspect <see cref="ServiceTaskReplyForwardException.Outcome"/> to decide what
    /// to do with it — most importantly whether forwarding it again could ever succeed
    /// (<see cref="ServiceTaskReplyForwardException.IsTransient"/>).
    /// </exception>
    Task ForwardReply(
        Guid mailboxId,
        string serviceTaskType,
        string payload,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    );
}
