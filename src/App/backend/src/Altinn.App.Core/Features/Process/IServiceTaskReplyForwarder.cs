namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hands a message received from an external system to the mailbox a service task is waiting on, which
/// processes it as its own durable piece of work in the task's reply handler.
/// </summary>
/// <remarks>
/// <para>
/// This is the inbound half of a mailbox exchange. The declaring stage embeds
/// <see cref="ServiceTaskMailbox.Id"/> in its outbound message as the address the external system must
/// answer to; whatever part of the app later receives that system's answer — a Fiks IO subscription
/// handler, a webhook controller, a message consumer — reads the echoed address and calls
/// <see cref="ForwardReply"/> with it. The message then reaches the task's reply handler as
/// <see cref="ServiceTaskContext.Reply"/>, with the engine's ordering, retry and durability guarantees
/// around it. Nothing else about the receiving channel changes: it should do no work of its own beyond
/// decoding the message enough to forward it.
/// </para>
/// <para>
/// <strong>An early message is not an error.</strong> A fast external system may answer while the
/// sending transition is still finishing its own steps. Such a message is accepted, deduplicated and
/// durable from first contact, and is simply read by the receiver that is enqueued for its position — so
/// the receiving channel never has to delay, buffer or re-deliver on that account. There is no
/// "too early".
/// </para>
/// <para>
/// <strong>Pass the source's own message id as <c>idempotencyKey</c>.</strong> Message channels deliver
/// at least once, and so does any retry of the forwarding call itself, so the same message will
/// sometimes be forwarded twice. The key is what makes the second forward a recognised replay that
/// changes nothing, rather than a second copy for the handler to process. It is also what the handler
/// reads back as <see cref="ServiceTaskReply.IdempotencyKey"/>, so the two ends of the deduplication
/// story are the same value.
/// </para>
/// <para>
/// The payload is opaque to the platform — serialize the message however the reply handler expects to
/// read it. It travels through the engine in a tamper-evident envelope bound to this mailbox, this
/// handler and this message id, so the handler is guaranteed to read back exactly what was forwarded to
/// it; the content itself came from outside and stays untrusted input. Keep it small: the workflow
/// engine accepts 256 KB by default, and the envelope's escaping leaves roughly half of that for a JSON
/// body.
/// </para>
/// <para>
/// <strong>Resolve it per message, from a scope</strong> — create an <c>IServiceScope</c> around each
/// received message and take the forwarder from it. A message subscriber is usually a singleton
/// <c>BackgroundService</c>, and constructor-injecting this transient service into a singleton pins it
/// — and the <c>HttpClient</c> behind it — for the process's whole lifetime, so it stops picking up
/// DNS changes and handler rotation.
/// </para>
/// </remarks>
public interface IServiceTaskReplyForwarder
{
    /// <summary>
    /// Forwards a message to the mailbox waiting for it.
    /// </summary>
    /// <param name="mailboxId">
    /// The value the external system echoed back — the <see cref="ServiceTaskMailbox.Id"/> the declaring
    /// stage embedded in its request. It is the reply address: it names the exchange, and nothing else
    /// has to be paired up.
    /// </param>
    /// <param name="serviceTaskType">
    /// The <c>IServiceTask.Type</c> of the service task whose reply handler reads this
    /// message — the same constant the app registered the task under. It is a fixed property of the code that
    /// receives the message, so name it directly rather than looking it up: the platform binds it into
    /// the message's integrity envelope, which is what stops a message meant for this handler from being
    /// read by another mailbox-declaring task of the same app. Naming the wrong task fails the exchange
    /// loudly at the handler rather than misrouting it silently.
    /// </param>
    /// <param name="payload">The message body, as the task's reply handler expects to read it.</param>
    /// <param name="idempotencyKey">
    /// The source's own identity for this message (e.g. a Fiks IO message id). Required: it is what
    /// makes forwarding the same message twice harmless. At most 200 characters.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// A task that completes when the message has been accepted — including when the same
    /// <paramref name="idempotencyKey"/> was already accepted by this mailbox, which is the ordinary
    /// outcome of a redelivery.
    /// </returns>
    /// <exception cref="ServiceTaskReplyForwardException">
    /// The message was not accepted. Inspect <see cref="ServiceTaskReplyForwardException.Outcome"/> to
    /// decide what to do with it — most importantly whether forwarding it again could ever succeed
    /// (<see cref="ServiceTaskReplyForwardException.IsTransient"/>), or whether the message needs to
    /// be dead-lettered, reported, or dropped.
    /// </exception>
    Task ForwardReply(
        Guid mailboxId,
        string serviceTaskType,
        string payload,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    );
}
