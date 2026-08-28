namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a stage opened, handed out by the mailbox-opening
/// <see cref="ServiceTaskPipelineBuilder.Stage(Func{ServiceTaskContext, ServiceTaskMailbox, Task{ServiceTaskStageResult}}, MailboxOptions, out MailboxHandle, ProcessStepOptions?)"/>
/// overload and passed to the one handler that answers it.
/// </summary>
/// <remarks>
/// <para>
/// There is nothing to read on one and nothing to build one from. Its whole job is to be passed along: take
/// the <c>out</c> parameter the mailbox-opening <c>Stage</c> call gives you and hand it, in the same
/// expression, to <see cref="ServiceTaskPipelineBuilder.HandleReplies"/> — for an exchange the pipeline
/// carries on after — or to <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/> for the one it ends
/// on.
/// </para>
/// <para>
/// Being unconstructable is the point: passing one is <em>proof</em> that the mailbox it names is really
/// declared, checked by the compiler rather than by a startup validation. The two things a type cannot say
/// — that the handle came from this pipeline's own builder, and that exactly one handler answers it — the
/// builder checks eagerly, so they fail app startup.
/// </para>
/// <para>
/// It exists as a value rather than being implied by a mailbox-flavoured builder type because a handler has to
/// name <em>which</em> exchange it answers: a task may open several, and which handler reads which mailbox is
/// then a thing only the handle can say.
/// </para>
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
    /// The item that opens the mailbox. The exchange's identity everywhere downstream: the carry's key, the
    /// mint step's engine identity, and the index the step that enqueues a receive workflow declares that
    /// receiver against.
    /// </summary>
    internal int OpeningIndex { get; }
}
