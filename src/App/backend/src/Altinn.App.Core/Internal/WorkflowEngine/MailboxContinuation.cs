namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// What the relay does next — a closed set of exactly two answers, which is where "at most one execution
/// concludes" is made structural: neither member can express the other's action, and the private
/// constructor keeps the set closed.
/// </summary>
internal abstract record MailboxContinuation
{
    private MailboxContinuation(Guid mailboxId)
    {
        MailboxId = mailboxId;
    }

    public Guid MailboxId { get; }

    /// <summary>Enqueue the receiver for the next message; nothing is closed or started.</summary>
    internal sealed record AwaitNextMessage : MailboxContinuation
    {
        public AwaitNextMessage(Guid mailboxId, string serviceTaskType, string openingStageName, long position)
            : base(mailboxId)
        {
            ServiceTaskType = serviceTaskType;
            OpeningStageName = openingStageName;
            Position = position;
        }

        /// <summary>The service task whose pipeline conclusion is the reply handler.</summary>
        public string ServiceTaskType { get; }

        /// <summary>
        /// The stage that opened this exchange — the identity the successor names as the exchange it answers.
        /// Sourced from the executing step's own payload rather than from the pipeline as resolved at that
        /// hop (falling back to the pipeline's opening stage only for a step that carries no name), so a
        /// stage renamed mid-flight cannot make the successor address a different exchange or none at all.
        /// </summary>
        public string OpeningStageName { get; }

        /// <summary>
        /// The position the handler just answered — names the successor for operators; the successor's own
        /// position is the engine's to assign.
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
