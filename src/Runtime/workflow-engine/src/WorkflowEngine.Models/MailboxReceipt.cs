namespace WorkflowEngine.Models;

/// <summary>
/// What the rendezvous produced for one receive workflow: the message at its position, or the fact that
/// none can ever stand there.
/// </summary>
/// <remarks>
/// Exhaustive and mutually exclusive — <see cref="Delivery"/> is non-null exactly when
/// <see cref="DisposedReason"/> is null — so "no delivery" may be read as "conclude the exchange" with no
/// further checks. The factories are the only way in, so a receipt carrying neither cannot be built.
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

    /// <summary>The exchange's address — what a continuation enqueues against or closes.</summary>
    public Guid MailboxId { get; }

    /// <summary>
    /// The receiver's position: the receiver at <c>seq</c> consumes the delivery at <c>idx = seq</c>.
    /// </summary>
    public long Seq { get; }

    /// <summary>
    /// The message standing at <see cref="Seq"/>, or <c>null</c> when the mailbox closed without one.
    /// </summary>
    public MailboxDelivery? Delivery { get; }

    /// <summary>
    /// Why the mailbox closed, on a receipt with no delivery. Wording only: both reasons demand the same
    /// response.
    /// </summary>
    public MailboxDisposedReason? DisposedReason { get; }

    /// <summary>The message standing at the receiver's position.</summary>
    public static MailboxReceipt Delivered(Guid mailboxId, long seq, MailboxDelivery delivery) =>
        new(mailboxId, seq, delivery, disposedReason: null);

    /// <summary>
    /// The closing signal: the mailbox closed with nothing at the position, so this step must conclude.
    /// </summary>
    public static MailboxReceipt Closed(Guid mailboxId, long seq, MailboxDisposedReason reason) =>
        new(mailboxId, seq, delivery: null, reason);
}

/// <summary>One message delivered into a mailbox, as its receiver reads it.</summary>
public sealed record MailboxDelivery
{
    /// <summary>
    /// The forwarding source's own message id. Stable across attempts and unique within the mailbox, so a
    /// consumer may deduplicate its own side effects on it.
    /// </summary>
    public required string IdempotencyKey { get; init; }

    /// <summary>The message body, verbatim as it was delivered. The engine stores it and never parses it.</summary>
    public required string Payload { get; init; }

    /// <summary>When the engine accepted the delivery — not when its receiver read it.</summary>
    public required DateTimeOffset AcceptedAt { get; init; }
}
