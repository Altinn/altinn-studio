using System.Diagnostics;
using System.Globalization;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What a <see cref="WorkflowStateSigner"/> envelope <em>is</em>. Every signature is computed under a
/// key derived from this, so an envelope minted for one purpose can never verify as another.
/// </summary>
/// <remarks>
/// <para>
/// The separation is load-bearing rather than tidiness. Both blobs are signed with the same app-code
/// and round-trip through the workflow engine, but they are produced from very different material: a
/// callback state blob is composed by the app from its own instance data, while a forwarded message
/// body is content an outside party chose. A pass-through webhook forwarding a raw request body —
/// squarely within the documented use of <see cref="Features.Process.IServiceTaskReplyForwarder"/> —
/// therefore lets that party pick the exact bytes the app signs. Sharing one signature domain would
/// make each forwarded message a structurally complete, validly signed state blob sitting in the
/// engine's own delivery log, next to the callback token: an engine that turned hostile could replay
/// one as <c>state</c> on a callback and it would verify, promoting the engine from "cannot fabricate
/// app state" to "can" — the exact property state signing exists to provide.
/// </para>
/// <para>
/// Purposes are never carried in the envelope: the verifier states which one it expects (as a
/// <see cref="SigningDomain"/>), so an envelope minted for another fails exactly like a tampered one.
/// </para>
/// </remarks>
internal enum SigningPurpose
{
    /// <summary>
    /// Not a purpose. Occupies the enum's default slot deliberately, so a
    /// <see langword="default" /> <see cref="SigningDomain"/> — an uninitialized field, an unassigned
    /// struct — cannot land in the sensitive state-blob domain: it lands here, and
    /// <see cref="WorkflowStateSigner"/> refuses to derive a key for it.
    /// </summary>
    Unspecified = 0,

    /// <summary>
    /// The opaque workflow callback state blob (<see cref="Models.WorkflowCallbackState"/>). Signed
    /// with the app-code directly — the original, underived computation — so envelopes produced before
    /// purposes existed still verify byte for byte.
    /// </summary>
    CallbackState = 1,

    /// <summary>
    /// The body of a message forwarded into a mailbox through
    /// <see cref="Features.Process.IServiceTaskReplyForwarder"/>, bound to everything about the message
    /// that the reply handler is handed: the mailbox it was delivered into, the service task whose
    /// handler reads it, and the source's own message id.
    /// </summary>
    /// <remarks>
    /// Versioned: a change to what the envelope covers takes a new member, which invalidates in-flight
    /// envelopes of the old shape rather than letting them verify under new rules. The numbering starts
    /// at <c>v1</c> because the address is new — the reply address is a mailbox id, not the id of the
    /// workflow awaiting an exchange — so this is a different domain from anything an earlier design
    /// signed, and its tag string is deliberately unrelated to theirs. No envelope of any earlier shape
    /// can exist on this line.
    /// </remarks>
    MailboxDeliveryV1 = 2,
}

/// <summary>
/// A signing purpose together with whatever that purpose binds — the whole identity of a signature
/// domain, and what <see cref="WorkflowStateSigner"/> takes instead of a bare
/// <see cref="SigningPurpose"/>.
/// </summary>
/// <remarks>
/// <para>
/// The type exists because one purpose binds several values and the other binds none, so the domain
/// stopped being expressible as a single enum value. Expressing it as an enum plus optional parameters
/// would have compiled every wrong combination — a state blob handed a mailbox id that is silently
/// ignored, a delivery envelope signed with only some of its bindings — so the constructor is private
/// and the two factories are the only way in: each one takes exactly what its purpose binds, all of it.
/// </para>
/// <para>
/// Being a struct, <see langword="default"/> is reachable (an uninitialized field). That value carries
/// <see cref="SigningPurpose.Unspecified"/>, which cannot derive a key — the default slot leads
/// nowhere instead of leading into the state-blob domain.
/// </para>
/// </remarks>
internal readonly record struct SigningDomain
{
    private SigningDomain(SigningPurpose purpose, DeliveryBinding? binding)
    {
        Purpose = purpose;
        Binding = binding;
    }

    /// <summary>What the envelope is.</summary>
    public SigningPurpose Purpose { get; }

    /// <summary>
    /// What a delivery envelope is bound to, for the purposes that bind something. Null for every other
    /// purpose.
    /// </summary>
    public DeliveryBinding? Binding { get; }

    /// <summary>
    /// The opaque workflow callback state blob. Binds nothing: the blob's own contents are checked
    /// against the callback's route instance after verification.
    /// </summary>
    public static SigningDomain CallbackState => new(SigningPurpose.CallbackState, binding: null);

    /// <summary>
    /// A message forwarded into a mailbox, bound to everything the delivered message asserts about
    /// itself.
    /// </summary>
    /// <param name="mailboxId">
    /// The reply address — the mailbox the message was delivered into, which is the value the external
    /// system echoed back. Binding it is what stops a valid envelope from being replayed into a
    /// <em>different</em> exchange by someone already holding engine API credentials.
    /// </param>
    /// <param name="serviceTaskType">
    /// The service task whose reply handler reads the message. Binding it stops the same envelope from
    /// being read by a <em>different</em> mailbox-declaring task of the same app — which it otherwise
    /// would be, since a receive workflow's step names its handler and nothing about the delivery does,
    /// so a receiver enqueued against this mailbox naming another handler would hand that handler this
    /// exchange's message and let it conclude the exchange.
    /// </param>
    /// <param name="idempotencyKey">
    /// The source's own message id, which is also the key the delivery is accepted under. Binding it is
    /// what makes the id the handler reads an <em>authenticated</em> value rather than unverified
    /// transport metadata, and what stops one captured envelope from being re-delivered into the same
    /// mailbox under a fresh key.
    /// </param>
    public static SigningDomain MailboxDelivery(Guid mailboxId, string serviceTaskType, string idempotencyKey) =>
        new(SigningPurpose.MailboxDeliveryV1, new DeliveryBinding(mailboxId, serviceTaskType, idempotencyKey));

    /// <summary>
    /// The domain's key-derivation tag, or <see langword="null"/> for a domain that signs under the
    /// app-code directly.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Not a pure switch over the enum, and it cannot be: a bound domain's tag includes what it binds,
    /// so two mailboxes — or two handlers, or two message ids — sign under different keys.
    /// </para>
    /// <para>
    /// <strong>The tag is length-prefixed, and that is load-bearing.</strong> The mailbox id is a
    /// fixed 32 hex characters, so it can never contain the delimiter; the service task type and the
    /// message id are free-form strings that can. Writing them raw would make the tag ambiguous —
    /// <c>type "a", id "b:c"</c> and <c>type "a:b", id "c"</c> would derive the same key, so an
    /// attacker who could choose a message id could borrow another handler's signature. Prefixing
    /// each variable field with its length makes the encoding uniquely decodable, so distinct bindings
    /// always produce distinct tags. The prefix counts <see cref="string.Length"/> — UTF-16 code units,
    /// the unit the value is <em>written</em> in — which is what keeps the encoding aligned; counting
    /// UTF-8 bytes while writing chars is precisely what would break it.
    /// </para>
    /// <para>
    /// One theoretical exception, noted for completeness: <c>Encoding.UTF8.GetBytes</c> maps every lone
    /// surrogate to U+FFFD, so <c>"\uD800"</c>, <c>"\uD801"</c> and <c>"�"</c> derive the same key.
    /// It is a property of any string-based domain separation rather than of this construction, and it is
    /// not reachable here: borrowing a legitimate key would need that legitimate value to itself contain
    /// U+FFFD, and a lone surrogate cannot survive <c>System.Text.Json</c> transport into the forwarder.
    /// </para>
    /// <para>
    /// <see cref="SigningPurpose.CallbackState"/> deliberately has no tag and signs under the app-code
    /// directly. That is the original computation, kept byte for byte so every state blob signed by an
    /// earlier version still verifies; it is pinned by known-answer tests rather than by
    /// sign-then-verify round-trips, which would agree with themselves after any change.
    /// </para>
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
    /// Everything a delivered message asserts about itself that the app then acts on, and therefore
    /// everything the envelope must cover beyond the body. Deliberately not a set of loose parameters:
    /// the fields travel together, are all bound together, and adding one is a new
    /// <see cref="SigningPurpose"/> rather than an overload.
    /// </summary>
    /// <remarks>
    /// The delivery's position (<c>seq</c>/<c>idx</c>) is <em>not</em> here, and must not be: the
    /// forwarder does not choose it — the engine assigns it at ingestion — so the forwarder could not
    /// bind it without first being told what it will be. Nothing acts on it either: it is documented as
    /// good for logging and never as an idempotency key.
    /// </remarks>
    internal sealed record DeliveryBinding(Guid MailboxId, string ServiceTaskType, string IdempotencyKey);
}
