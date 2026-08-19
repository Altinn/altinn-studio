namespace WorkflowEngine.Models;

/// <summary>
/// What the rendezvous produced for one receive workflow: the message standing at its position in the
/// mailbox, or the fact that none can ever stand there. Handed to the first step's command and to
/// nothing else.
/// </summary>
/// <remarks>
/// <para>
/// <strong>The two states are exhaustive and mutually exclusive, and the type is what enforces it.</strong>
/// <see cref="Delivery"/> is non-<c>null</c> exactly when <see cref="DisposedReason"/> is <c>null</c>:
/// a receiver is only ever made runnable by a delivery landing at its position, by being born with one
/// already there, or by the mailbox closing — and a closed mailbox refuses further deliveries, so no
/// third answer exists. A consumer may read "no delivery" as "the exchange is over; conclude it" with
/// no further checks.
/// </para>
/// <para>
/// The constructor is private and the two factories are the only way in, because a receipt carrying
/// neither — <c>{ mailboxId, seq }</c> and nothing else — is constructible from an object initializer
/// and would reach a handler as "conclude, reason unknown". That is the same class of state the
/// executor refuses to derive from the database rather than folding into the closing signal; a type
/// that exports it while the code refuses it would be arguing with itself.
/// </para>
/// <para>
/// It is <em>re-derived</em> from the deliveries log on every attempt rather than recorded anywhere, and
/// that is what makes it stable: whether a delivery exists at a receiver's position is frozen before the
/// receiver can first run, so every retry and every resume reads the same rows and reaches the same
/// answer. Nothing about the receipt is written down, so there is no record to disagree with the log.
/// </para>
/// </remarks>
public sealed record MailboxReceipt
{
    private MailboxReceipt(Guid mailboxId, long seq, MailboxDelivery? delivery, MailboxDisposedReason? disposedReason)
    {
        MailboxId = mailboxId;
        Seq = seq;
        Delivery = delivery;
        DisposedReason = disposedReason;
    }

    /// <summary>
    /// The mailbox this receiver reads from — the exchange's address, and what a continuation needs in
    /// order to enqueue the next receiver or to close the mailbox.
    /// </summary>
    public Guid MailboxId { get; }

    /// <summary>
    /// The receiver's position in the mailbox's receivers log, assigned at enqueue under the mailbox's
    /// row lock. It is also the position in the deliveries log that <see cref="Delivery"/> was looked
    /// for at: the receiver at <c>seq</c> consumes the delivery at <c>idx = seq</c>.
    /// </summary>
    public long Seq { get; }

    /// <summary>
    /// The message standing at <see cref="Seq"/>, or <c>null</c> when the mailbox closed without one
    /// ever arriving there.
    /// </summary>
    public MailboxDelivery? Delivery { get; }

    /// <summary>
    /// Why the mailbox was closed, on a receipt that carries no delivery; <c>null</c> whenever
    /// <see cref="Delivery"/> is present.
    /// </summary>
    /// <remarks>
    /// Carried explicitly rather than left to be inferred from the absence of a delivery, and it changes
    /// only the <em>wording</em> of the conclusion a consumer reaches — "the archive never confirmed
    /// before the deadline" reads differently from "the exchange was closed". Both demand the same
    /// response: conclude. A consumer that branches on it for anything but words has misread it.
    /// </remarks>
    public MailboxDisposedReason? DisposedReason { get; }

    /// <summary>
    /// A receipt for a receiver whose message is standing at its position.
    /// </summary>
    public static MailboxReceipt Delivered(Guid mailboxId, long seq, MailboxDelivery delivery) =>
        new(mailboxId, seq, delivery, disposedReason: null);

    /// <summary>
    /// A receipt for a receiver whose mailbox closed with nothing at its position — the closing signal,
    /// which means the exchange is over and this step must conclude it.
    /// </summary>
    public static MailboxReceipt Closed(Guid mailboxId, long seq, MailboxDisposedReason reason) =>
        new(mailboxId, seq, delivery: null, reason);
}

/// <summary>
/// One message delivered into a mailbox, as its receiver reads it.
/// </summary>
public sealed record MailboxDelivery
{
    /// <summary>
    /// The key the delivery was accepted under — the forwarding source's own message id, which is what
    /// makes an at-least-once source's resend land on the position it already holds. Stable across every
    /// attempt of the receiving step, so a consumer may deduplicate its own side effects on it.
    /// </summary>
    public required string IdempotencyKey { get; init; }

    /// <summary>
    /// The message body, verbatim as it was delivered. The engine stores it and never parses it.
    /// </summary>
    public required string Payload { get; init; }

    /// <summary>
    /// When the engine accepted the delivery — the instant it became durable, not the instant its
    /// receiver read it.
    /// </summary>
    public required DateTimeOffset AcceptedAt { get; init; }
}
