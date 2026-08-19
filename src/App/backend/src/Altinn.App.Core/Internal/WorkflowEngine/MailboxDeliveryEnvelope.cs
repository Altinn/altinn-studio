using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The tamper-evident envelope a forwarded message travels in. <c>ServiceTaskReplyForwarder</c> wraps
/// the body before delivering it into the mailbox; <c>ExecuteServiceTask</c> unwraps it where the
/// message is materialized for the app as <see cref="Features.Process.ServiceTaskContext.Reply"/>. The
/// engine stores it as an opaque delivery payload and never looks inside.
/// </summary>
/// <remarks>
/// <para>
/// It is the same detached-HMAC construction the callback state blob uses (<see
/// cref="WorkflowStateSigner"/>, the same rotation-aware <c>WorkflowEngineCallback</c> app-codes),
/// under <see cref="SigningPurpose.MailboxDeliveryV1"/> so the two signature domains cannot be
/// crossed — see that enum for why sharing one would be a real vulnerability rather than untidiness.
/// </para>
/// <para>
/// <strong>Coverage: the body, plus everything the delivered message asserts about it.</strong> The
/// signature covers the message body, and the domain binds the <em>mailbox id</em>, the
/// <em>service task type</em> whose handler reads it, and the <em>idempotency key</em> the delivery was
/// accepted under — see <see cref="SigningDomain.DeliveryBinding"/>. Each closes a distinct move
/// available to a holder of engine API credentials: re-delivering a captured message into a different
/// mailbox of the same app; enqueueing a receiver against <em>this</em> mailbox that names a different
/// mailbox-declaring task's handler (which the mailbox binding alone would not catch, since the mailbox
/// is unchanged, and which would let that other handler read this message and conclude this exchange);
/// and re-delivering it into the same mailbox under a fresh key. Binding them costs nothing — the
/// forwarder holds all three at signing time (they are what it builds the delivery from) and the
/// handler holds all three at verification time (the callback's rendezvous block and its step name
/// them).
/// </para>
/// <para>
/// <strong>What it proves is round-tripping, not trustworthiness.</strong> The envelope says the body
/// reaching the handler is byte-for-byte the body the app forwarded, into this mailbox, for this
/// handler, under this message id — nothing in transit or at rest altered or fabricated any of it. The
/// body itself originated outside the platform, so it remains untrusted input for the handler that
/// reads it.
/// </para>
/// <para>
/// <strong>Size.</strong> The envelope is JSON and the body is escaped into one of its string values,
/// so the body counts against the engine's <c>MaxMailboxPayloadSize</c> (256 KiB by default) at its
/// escaped size, not its raw one. Framing costs 87 bytes plus the secret id's length — and 5 bytes more
/// for every <c>+</c> in the signature's Base64, because the default JSON encoder escapes <c>+</c> but
/// not <c>/</c>. The body is expanded by the serializer's default, conservative encoder, which emits six
/// bytes for every character it escapes, the double quote included: plain ASCII prose with nothing to
/// escape is about ×1.01, JSON roughly ×2, and a body of nothing but quotes or control characters ×6.
/// That is ample for what a message should be: put anything large in Storage and let the message carry
/// a reference.
/// </para>
/// </remarks>
internal sealed class MailboxDeliveryEnvelope(WorkflowStateSigner signer)
{
    /// <summary>
    /// Wraps a message body for delivery into a mailbox, bound to that mailbox, the handler that will
    /// read it, and the key it is delivered under.
    /// </summary>
    /// <param name="payload">The message body, exactly as the handler should read it back.</param>
    /// <param name="mailboxId">The mailbox the message is delivered into — the reply address.</param>
    /// <param name="serviceTaskType">The service task whose reply handler reads the message.</param>
    /// <param name="idempotencyKey">The source's own message id, the delivery's idempotency key.</param>
    /// <exception cref="Authentication.WorkflowCallbackSecretNotFoundException">
    /// The app has no usable <c>WorkflowEngineCallback</c> code to sign with — unmounted secret, or
    /// only expired codes. The forwarder maps this to an outcome; nothing else calls this.
    /// </exception>
    public string Wrap(string payload, Guid mailboxId, string serviceTaskType, string idempotencyKey) =>
        signer.Sign(payload, SigningDomain.MailboxDelivery(mailboxId, serviceTaskType, idempotencyKey));

    /// <summary>
    /// Unwraps a delivered message and returns the body the forwarder wrapped.
    /// </summary>
    /// <param name="payload">The delivered envelope, as it arrived in the rendezvous block.</param>
    /// <param name="mailboxId">
    /// The mailbox this callback receives from (<c>AppCallbackMailbox.Id</c>).
    /// </param>
    /// <param name="serviceTaskType">
    /// The service task this callback dispatches to (<c>ExecuteServiceTaskPayload.ServiceTaskType</c>).
    /// </param>
    /// <param name="idempotencyKey">
    /// The key the delivered message claims (<c>AppCallbackMailboxDelivery.IdempotencyKey</c>).
    /// </param>
    /// <remarks>
    /// Every argument is read from the <em>delivered</em> callback, and every one of them is covered by
    /// the signature — so verification is what makes them trustworthy, rather than verification trusting
    /// them. A delivery whose mailbox, handler or key was altered after forwarding fails here.
    /// </remarks>
    /// <exception cref="MailboxDeliveryEnvelopeException">
    /// The delivered payload is not an envelope this app signed for exactly this message: it was never
    /// wrapped, was altered in transit or at rest, was signed by another app, was delivered into another
    /// mailbox or read by another handler, carries a different idempotency key, or was signed with a code
    /// that has since expired.
    /// </exception>
    public string Unwrap(string payload, Guid mailboxId, string serviceTaskType, string idempotencyKey)
    {
        try
        {
            return signer.Verify(payload, SigningDomain.MailboxDelivery(mailboxId, serviceTaskType, idempotencyKey));
        }
        catch (WorkflowCallbackStateException ex)
        {
            throw new MailboxDeliveryEnvelopeException(
                "The delivered message payload is not a valid delivery envelope signed by this app for this message.",
                ex
            );
        }
    }
}

/// <summary>
/// Thrown when a delivered message's <see cref="MailboxDeliveryEnvelope"/> does not verify.
/// </summary>
internal sealed class MailboxDeliveryEnvelopeException(string message, Exception? innerException = null)
    : AltinnException(message, innerException);
