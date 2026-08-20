namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the mailbox relay must do next, as decided by the reply handler that just ran. A closed set of exactly
/// two answers, and the type is where saga invariant 2 — <em>at most one execution concludes</em> — is made
/// structural: <see cref="AwaitNextMessage"/> carries no way to express a closure and <see cref="Conclude"/>
/// carries no way to express a successor, so no verdict can produce a value that means both. The constructor is
/// private to this type, so a third answer cannot be added from outside this file.
/// </summary>
internal abstract record MailboxContinuation
{
    private MailboxContinuation(Guid mailboxId)
    {
        MailboxId = mailboxId;
    }

    /// <summary>The mailbox the exchange runs on.</summary>
    public Guid MailboxId { get; }

    /// <summary>
    /// The handler answered <c>AwaitNextReply</c>: enqueue the receiver for the exchange's next
    /// message. Nothing is closed and nothing downstream is started.
    /// </summary>
    internal sealed record AwaitNextMessage : MailboxContinuation
    {
        public AwaitNextMessage(Guid mailboxId, string serviceTaskType, long position)
            : base(mailboxId)
        {
            ServiceTaskType = serviceTaskType;
            Position = position;
        }

        /// <summary>
        /// The service task whose pipeline conclusion is the reply handler — the one step the
        /// successor receiver runs.
        /// </summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The position the handler just answered. Used to name the successor for operators; the successor's own
        /// position is assigned by the engine, never predicted here.
        /// </summary>
        public long Position { get; }
    }

    /// <summary>The handler concluded the exchange: close the mailbox, then start whatever comes after it.</summary>
    internal sealed record Conclude : MailboxContinuation
    {
        public Conclude(Guid mailboxId)
            : base(mailboxId) { }
    }
}
