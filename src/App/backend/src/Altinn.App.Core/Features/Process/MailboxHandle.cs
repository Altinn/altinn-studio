namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a stage opened, handed out by the mailbox-opening
/// <see cref="ServiceTaskPipelineBuilder.Stage(string, Func{ServiceTaskContext, ServiceTaskMailbox, Task{ServiceTaskStageResult}}, MailboxOptions, out MailboxHandle, ProcessStepOptions?)"/>
/// overload and passed to the reply terminal that answers it.
/// </summary>
/// <remarks>
/// <para>
/// There is nothing to read on one and nothing to build one from. Its whole job is to be passed along: take
/// the <c>out</c> parameter the mailbox-opening <c>Stage</c> call gives you and hand it to
/// <see cref="ServiceTaskPipelineBuilder.ConcludeOnReply"/> or
/// <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/> in the same expression.
/// </para>
/// <para>
/// Being unconstructable is the point: passing one is <em>proof</em> that the mailbox it names is really
/// declared, checked by the compiler rather than by a startup validation over stage-name strings. The two
/// things a type cannot say — that the handle came from this pipeline's own builder, and that exactly one
/// terminal answers it — the builder checks eagerly, so they fail app startup.
/// </para>
/// <para>
/// It exists as a value rather than being implied by a mailbox-flavoured builder type because a terminal has to
/// name <em>which</em> exchange it answers once a task may open more than one — so this version already has the
/// shape a multi-exchange one will need.
/// </para>
/// </remarks>
public sealed class MailboxHandle
{
    internal MailboxHandle(ServiceTaskPipelineBuilder owner, string openingStageName)
    {
        Owner = owner;
        OpeningStageName = openingStageName;
    }

    /// <summary>The builder that issued this handle — a handle answers its own pipeline and no other.</summary>
    internal ServiceTaskPipelineBuilder Owner { get; }

    /// <summary>
    /// The stage that opens the mailbox. The exchange's identity everywhere downstream: the carry's key, the
    /// receive workflow's payload, and the mint step's engine identity.
    /// </summary>
    internal string OpeningStageName { get; }
}
