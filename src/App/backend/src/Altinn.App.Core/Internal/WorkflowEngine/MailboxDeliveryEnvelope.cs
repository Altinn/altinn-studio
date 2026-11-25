using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The tamper-evident envelope a forwarded message travels in: the forwarder wraps, the receive step
/// unwraps, the engine stores it opaquely. The domain (<see cref="SigningPurpose.MailboxDeliveryV2"/>) binds
/// the mailbox id, pipeline and idempotency key — each closing a distinct replay move — and the signed content
/// carries the sender with the body. It proves round-tripping, not trustworthiness: the body remains untrusted
/// input.
/// </summary>
internal sealed class MailboxDeliveryEnvelope(WorkflowStateSigner signer)
{
    /// <exception cref="Authentication.WorkflowCallbackSecretNotFoundException">
    /// The app has no usable <c>WorkflowEngineCallback</c> code to sign with.
    /// </exception>
    public string Wrap(string body, Guid mailboxId, PipelineId pipeline, string idempotencyKey, Actor? sender) =>
        signer.Sign(
            JsonSerializer.Serialize(new SignedContent(body, sender)),
            SigningDomain.MailboxDelivery(mailboxId, pipeline, idempotencyKey)
        );

    /// <summary>
    /// Every argument is read from the <em>delivered</em> callback and covered by the signature, so verification
    /// is what makes them trustworthy.
    /// </summary>
    /// <exception cref="MailboxDeliveryEnvelopeException">
    /// Not an envelope this app signed for exactly this message — never wrapped, altered, another app's,
    /// another mailbox's or pipeline's, a different key, or a code that has since expired.
    /// </exception>
    public MailboxDelivery Unwrap(string payload, Guid mailboxId, PipelineId pipeline, string idempotencyKey)
    {
        string content;
        try
        {
            content = signer.Verify(payload, SigningDomain.MailboxDelivery(mailboxId, pipeline, idempotencyKey));
        }
        catch (WorkflowCallbackStateException ex)
        {
            throw new MailboxDeliveryEnvelopeException(
                "The delivered message payload is not a valid delivery envelope signed by this app for this message.",
                ex
            );
        }

        // Only this class writes the content, under the signature just verified.
        SignedContent signed =
            JsonSerializer.Deserialize<SignedContent>(content)
            ?? throw new MailboxDeliveryEnvelopeException("The delivery envelope's signed content is empty.");
        return new MailboxDelivery(signed.Body, signed.Sender);
    }

    private sealed record SignedContent(
        [property: JsonPropertyName("body")] string Body,
        [property: JsonPropertyName("sender")] Actor? Sender
    );
}

/// <summary>A delivered message as its envelope carried it.</summary>
/// <param name="Body">The forwarded message body, byte for byte.</param>
/// <param name="Sender">The caller a request authenticated, or null for a message forwarded from outside.</param>
internal sealed record MailboxDelivery(string Body, Actor? Sender);

internal sealed class MailboxDeliveryEnvelopeException(string message, Exception? innerException = null)
    : AltinnException(message, innerException);
