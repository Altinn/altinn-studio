namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The mailbox a stage opened, handed out by the mailbox-opening
/// <see cref="ServiceTaskPipelineBuilder.Stage(string, Func{ServiceTaskContext, ServiceTaskMailbox, Task{ServiceTaskStageResult}}, MailboxOptions, out MailboxHandle, ProcessStepOptions?)"/>
/// overload and passed to the reply terminal that answers it.
/// </summary>
/// <remarks>
/// Deliberately opaque and impossible to construct: passing one to
/// <see cref="ServiceTaskPipelineBuilder.ConcludeOnReply"/> or
/// <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/> is therefore proof that the mailbox it names is
/// really declared, at compile time rather than at startup. The builder additionally refuses a handle from
/// another pipeline, and one answered twice.
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
