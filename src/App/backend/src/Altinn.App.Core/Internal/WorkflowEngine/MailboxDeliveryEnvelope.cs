using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The tamper-evident envelope a forwarded message travels in: the forwarder wraps, the receive step
/// unwraps, the engine stores it opaquely.
/// </summary>
/// <remarks>
/// The state blob's detached-HMAC construction under <see cref="SigningPurpose.MailboxDeliveryV1"/>, so
/// the domains cannot cross. The domain binds the mailbox id, service task type and idempotency key — each
/// closing a distinct replay move. It proves round-tripping, not trustworthiness: the body remains
/// untrusted input. JSON escaping counts against <c>MaxMailboxPayloadSize</c> (up to ×6), so anything large
/// belongs in Storage.
/// </remarks>
internal sealed class MailboxDeliveryEnvelope(WorkflowStateSigner signer)
{
    /// <exception cref="Authentication.WorkflowCallbackSecretNotFoundException">
    /// The app has no usable <c>WorkflowEngineCallback</c> code to sign with.
    /// </exception>
    public string Wrap(string payload, Guid mailboxId, string serviceTaskType, string idempotencyKey) =>
        signer.Sign(payload, SigningDomain.MailboxDelivery(mailboxId, serviceTaskType, idempotencyKey));

    /// <summary>
    /// Every argument is read from the <em>delivered</em> callback and covered by the signature, so verification
    /// is what makes them trustworthy.
    /// </summary>
    /// <exception cref="MailboxDeliveryEnvelopeException">
    /// Not an envelope this app signed for exactly this message — never wrapped, altered, another app's,
    /// another mailbox's or handler's, a different key, or a code that has since expired.
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

internal sealed class MailboxDeliveryEnvelopeException(string message, Exception? innerException = null)
    : AltinnException(message, innerException);
