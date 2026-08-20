using System.Diagnostics;
using System.Globalization;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What a <see cref="WorkflowStateSigner"/> envelope <em>is</em>. Every signature is computed under a key
/// derived from this, so an envelope minted for one purpose can never verify as another.
/// </summary>
/// <remarks>
/// The separation is load-bearing. A callback state blob is composed by the app from its own instance data,
/// while a forwarded message body is content an outside party chose — a pass-through webhook lets that party
/// pick the exact bytes the app signs. Under one signature domain each forwarded message would be a validly
/// signed state blob sitting in the engine's own delivery log, replayable as <c>state</c> on a callback.
/// Purposes are never carried in the envelope: the verifier states which <see cref="SigningDomain"/> it
/// expects, so an envelope minted for another fails exactly like a tampered one.
/// </remarks>
internal enum SigningPurpose
{
    /// <summary>
    /// Not a purpose. Occupies the enum's default slot deliberately, so a <see langword="default"/>
    /// <see cref="SigningDomain"/> cannot land in the sensitive state-blob domain: it lands here, and
    /// <see cref="WorkflowStateSigner"/> refuses to derive a key for it.
    /// </summary>
    Unspecified = 0,

    /// <summary>
    /// The opaque workflow callback state blob (<see cref="Models.WorkflowCallbackState"/>). Signed with the
    /// app-code directly — the original, underived computation — so envelopes produced before purposes existed
    /// still verify byte for byte.
    /// </summary>
    CallbackState = 1,

    /// <summary>
    /// The body of a message forwarded into a mailbox through
    /// <see cref="Features.Process.IServiceTaskReplyForwarder"/>, bound to the mailbox it was delivered into, the
    /// service task whose handler reads it, and the source's own message id. Versioned: a change to what the
    /// envelope covers takes a new member, invalidating in-flight envelopes of the old shape rather than letting
    /// them verify under new rules.
    /// </summary>
    MailboxDeliveryV1 = 2,
}

/// <summary>
/// A signing purpose together with whatever that purpose binds — the whole identity of a signature domain, and
/// what <see cref="WorkflowStateSigner"/> takes instead of a bare <see cref="SigningPurpose"/>. The
/// constructor is private and the two factories are the only way in, so no wrong combination compiles.
/// <see langword="default"/> is reachable and carries <see cref="SigningPurpose.Unspecified"/>, which cannot
/// derive a key.
/// </summary>
internal readonly record struct SigningDomain
{
    private SigningDomain(SigningPurpose purpose, DeliveryBinding? binding)
    {
        Purpose = purpose;
        Binding = binding;
    }

    /// <summary>What the envelope is.</summary>
    public SigningPurpose Purpose { get; }

    /// <summary>What a delivery envelope is bound to. Null for every other purpose.</summary>
    public DeliveryBinding? Binding { get; }

    /// <summary>
    /// The opaque workflow callback state blob. Binds nothing: the blob's own contents are checked against the
    /// callback's route instance after verification.
    /// </summary>
    public static SigningDomain CallbackState => new(SigningPurpose.CallbackState, binding: null);

    /// <summary>
    /// A message forwarded into a mailbox, bound to everything the delivered message asserts about itself: the
    /// reply address the external system echoed back, so a valid envelope cannot be replayed into a different
    /// exchange; the service task whose handler reads it, so another mailbox-declaring task of the same app cannot
    /// read and conclude this exchange; and the source's own message id, so the id the handler reads is an
    /// authenticated value and one captured envelope cannot be re-delivered under a fresh key.
    /// </summary>
    public static SigningDomain MailboxDelivery(Guid mailboxId, string serviceTaskType, string idempotencyKey) =>
        new(SigningPurpose.MailboxDeliveryV1, new DeliveryBinding(mailboxId, serviceTaskType, idempotencyKey));

    /// <summary>
    /// The domain's key-derivation tag, or <see langword="null"/> for a domain that signs under the app-code
    /// directly. A bound domain's tag includes what it binds, so two mailboxes — or two handlers, or two message
    /// ids — sign under different keys.
    /// </summary>
    /// <remarks>
    /// The tag is length-prefixed, and that is load-bearing: the service task type and the message id are
    /// free-form strings that can contain the delimiter, so writing them raw would make
    /// <c>type "a", id "b:c"</c> and <c>type "a:b", id "c"</c> derive the same key. The prefix counts
    /// <see cref="string.Length"/> — UTF-16 code units, the unit the value is written in.
    /// <see cref="SigningPurpose.CallbackState"/> has no tag and signs under the app-code directly, kept byte for
    /// byte and pinned by known-answer tests rather than sign-then-verify round-trips.
    /// </remarks>
    public string? Tag =>
        Purpose switch
        {
            SigningPurpose.CallbackState => null,
            SigningPurpose.MailboxDeliveryV1 => DeliveryTag(
                Binding ?? throw new UnreachableException("A delivery domain always carries its binding.")
            ),
            _ => throw new InvalidOperationException(
                $"Cannot sign or verify under signing purpose '{Purpose}'. Build the domain with one of "
                    + $"{nameof(SigningDomain)}'s factories."
            ),
        };

    private static string DeliveryTag(DeliveryBinding binding) =>
        string.Create(
            CultureInfo.InvariantCulture,
            $"altinn:workflow-engine:mailbox-delivery:v1:{binding.MailboxId:N}:{binding.ServiceTaskType.Length}:{binding.ServiceTaskType}:{binding.IdempotencyKey.Length}:{binding.IdempotencyKey}"
        );

    /// <summary>
    /// Everything a delivered message asserts about itself that the app then acts on, and therefore everything the
    /// envelope must cover beyond the body. The delivery's position is deliberately absent: the engine assigns it
    /// at ingestion, so the forwarder could not bind it, and nothing acts on it.
    /// </summary>
    internal sealed record DeliveryBinding(Guid MailboxId, string ServiceTaskType, string IdempotencyKey);
}
