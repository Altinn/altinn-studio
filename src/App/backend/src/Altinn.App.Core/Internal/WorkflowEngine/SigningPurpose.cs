using System.Diagnostics;
using System.Globalization;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What a <see cref="WorkflowStateSigner"/> envelope <em>is</em>; the signing key derives from it, so an
/// envelope minted for one purpose can never verify as another.
/// </summary>
/// <remarks>
/// Load-bearing: a forwarded message body is bytes an outside party chose, and under one shared domain each
/// forwarded message would be a validly signed state blob, replayable as <c>state</c> on a callback. The
/// purpose is never carried in the envelope — the verifier states which it expects.
/// </remarks>
internal enum SigningPurpose
{
    /// <summary>
    /// Not a purpose: occupies the default slot so a <see langword="default"/> <see cref="SigningDomain"/>
    /// cannot land in the state-blob domain. <see cref="WorkflowStateSigner"/> refuses to derive a key for it.
    /// </summary>
    Unspecified = 0,

    /// <summary>
    /// The callback state blob, signed with the app-code directly — the original computation, so envelopes
    /// produced before purposes existed still verify byte for byte.
    /// </summary>
    CallbackState = 1,

    /// <summary>
    /// A message forwarded into a mailbox, bound to the mailbox, the handler's service task, and the source's
    /// message id. Versioned: a change to the coverage takes a new member, invalidating in-flight envelopes
    /// rather than reinterpreting them.
    /// </summary>
    MailboxDeliveryV1 = 2,
}

/// <summary>
/// A purpose plus what it binds — the whole identity of a signature domain. The constructor is private and
/// the factories are the only way in, so no wrong combination compiles; <see langword="default"/> carries
/// <see cref="SigningPurpose.Unspecified"/>, which cannot derive a key.
/// </summary>
internal readonly record struct SigningDomain
{
    private SigningDomain(SigningPurpose purpose, DeliveryBinding? binding)
    {
        Purpose = purpose;
        Binding = binding;
    }

    public SigningPurpose Purpose { get; }

    /// <summary>What a delivery envelope is bound to. Null for every other purpose.</summary>
    public DeliveryBinding? Binding { get; }

    /// <summary>
    /// Binds nothing: the blob's contents are checked against the callback's route instance after verification.
    /// </summary>
    public static SigningDomain CallbackState => new(SigningPurpose.CallbackState, binding: null);

    /// <summary>
    /// Bound to the reply address (no replay into another exchange), the handler's service task (no other task
    /// of the same app can read and conclude this exchange), and the source's message id (authenticated, and no
    /// re-delivery under a fresh key).
    /// </summary>
    public static SigningDomain MailboxDelivery(Guid mailboxId, string serviceTaskType, string idempotencyKey) =>
        new(SigningPurpose.MailboxDeliveryV1, new DeliveryBinding(mailboxId, serviceTaskType, idempotencyKey));

    /// <summary>
    /// The key-derivation tag; <see langword="null"/> for a domain signing under the app-code directly.
    /// </summary>
    /// <remarks>
    /// Length-prefixed, load-bearing: the task type and message id are free-form, so raw concatenation would
    /// let <c>type "a", id "b:c"</c> and <c>type "a:b", id "c"</c> derive the same key. The prefix counts
    /// <see cref="string.Length"/> — UTF-16 code units, the unit the value is written in.
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
    /// Everything a delivered message asserts that the app acts on. The position is deliberately absent: the
    /// engine assigns it at ingestion, and nothing acts on it.
    /// </summary>
    internal sealed record DeliveryBinding(Guid MailboxId, string ServiceTaskType, string IdempotencyKey);
}
