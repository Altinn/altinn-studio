namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a stage opened, handed out by the mailbox-opening
/// <see cref="ServiceTaskPipelineBuilder.Stage(Func{ServiceTaskContext, ServiceTaskMailbox, Task{ServiceTaskStageResult}}, MailboxOptions, out MailboxHandle, ProcessStepOptions?)"/>
/// overload and passed to the one handler that answers it —
/// <see cref="ServiceTaskPipelineBuilder.HandleReplies"/> or
/// <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/>.
/// </summary>
/// <remarks>
/// Being unconstructable is the point: passing one is proof that the mailbox it names is really declared,
/// checked by the compiler. It exists as a value because a task may open several mailboxes, and which handler
/// answers which exchange is then a thing only the handle can say.
/// </remarks>
public sealed class MailboxHandle
{
    internal MailboxHandle(ServiceTaskPipelineBuilder owner, int openingIndex)
    {
        Owner = owner;
        OpeningIndex = openingIndex;
    }

    /// <summary>The builder that issued this handle — a handle answers its own pipeline and no other.</summary>
    internal ServiceTaskPipelineBuilder Owner { get; }

    /// <summary>
    /// The item that opens the mailbox — the exchange's identity everywhere downstream: the carry's key, the
    /// mint step's engine identity, and what a receive workflow is declared against.
    /// </summary>
    internal int OpeningIndex { get; }
}
