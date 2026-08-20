using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The tamper-evident envelope a forwarded message travels in. <c>ServiceTaskReplyForwarder</c> wraps the body
/// before delivering it into the mailbox; <c>ExecuteServiceTask</c> unwraps it where the message is materialized
/// for the app as <see cref="Features.Process.ServiceTaskContext.Reply"/>. The engine stores it as an opaque
/// delivery payload and never looks inside.
/// </summary>
/// <remarks>
/// The same detached-HMAC construction the callback state blob uses (<see cref="WorkflowStateSigner"/>), under
/// <see cref="SigningPurpose.MailboxDeliveryV1"/> so the two signature domains cannot be crossed. The signature
/// covers the body, and the domain binds the mailbox id, the service task type whose handler reads it, and the
/// idempotency key — each closing a distinct move available to a holder of engine API credentials.
/// What it proves is round-tripping, not trustworthiness: the body originated outside the platform and remains
/// untrusted input. Because the envelope is JSON, the body counts against the engine's
/// <c>MaxMailboxPayloadSize</c> at its escaped size — roughly ×1.01 for plain ASCII and up to ×6 for control
/// characters — so anything large belongs in Storage with the message carrying a reference.
/// </remarks>
internal sealed class MailboxDeliveryEnvelope(WorkflowStateSigner signer)
{
    /// <summary>
    /// Wraps a message body for delivery into a mailbox, bound to that mailbox, the handler that will read it, and
    /// the key it is delivered under.
    /// </summary>
    /// <exception cref="Authentication.WorkflowCallbackSecretNotFoundException">
    /// The app has no usable <c>WorkflowEngineCallback</c> code to sign with.
    /// </exception>
    public string Wrap(string payload, Guid mailboxId, string serviceTaskType, string idempotencyKey) =>
        signer.Sign(payload, SigningDomain.MailboxDelivery(mailboxId, serviceTaskType, idempotencyKey));

    /// <summary>
    /// Unwraps a delivered message and returns the body the forwarder wrapped. Every argument is read from the
    /// <em>delivered</em> callback and every one is covered by the signature, so verification is what makes them
    /// trustworthy rather than verification trusting them.
    /// </summary>
    /// <exception cref="MailboxDeliveryEnvelopeException">
    /// The delivered payload is not an envelope this app signed for exactly this message: it was never wrapped, was
    /// altered, was signed by another app, was delivered into another mailbox or read by another handler, carries a
    /// different idempotency key, or was signed with a code that has since expired.
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

/// <summary>Thrown when a delivered message's <see cref="MailboxDeliveryEnvelope"/> does not verify.</summary>
internal sealed class MailboxDeliveryEnvelopeException(string message, Exception? innerException = null)
    : AltinnException(message, innerException);
