namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a reply handler that leaves the task unconcluded may answer — the <c>onMessage</c> of
/// <see cref="ServiceTaskPipelineBuilder.HandleReplies"/>: anything a pipeline stage answers
/// (<see cref="ServiceTaskStageResult"/>, the whole vocabulary below this type) plus
/// <see cref="AwaitNextReply"/>, which concludes nothing and waits for the next message.
/// </summary>
/// <remarks>
/// <para>
/// The same move as <see cref="ServiceTaskExchangeResult"/>, one rung down: that root widens the answers a
/// service task <em>concludes</em> with, this one widens the answers a <em>stage</em> gives. Which of the two
/// a handler answers to is therefore what decides whether it can conclude the task at all — concluding and
/// advancing the process live on <see cref="ServiceTaskResult"/>, which is not below this root, so a handler
/// answering here can say "this exchange is done, the pipeline moves on"
/// (<see cref="ServiceTaskStageResult.Completed"/>) and has no way to say more.
/// </para>
/// <para>
/// The split is what makes "await the next message" unrepresentable where there is no next message to await:
/// only a reply handler's <c>onMessage</c> answers this type. A stage, and every <c>onClosed</c>, answers
/// <see cref="ServiceTaskStageResult"/> — so the compiler rejects <see cref="AwaitNextReply"/> there.
/// </para>
/// <para>
/// It rejects it a step later than one would like, and that is accepted rather than fixed: statics are
/// inherited, so <c>ServiceTaskStageResult.AwaitNextReply()</c> resolves from app code and the refusal lands
/// on the <em>return</em> as a conversion failure — <c>CS0029</c>, or <c>CS1503</c> where the task's type
/// argument is spelled out — rather than at the call that looks wrong. Nothing unrepresentable becomes
/// representable: the value simply cannot be returned from anywhere that would misuse it, and
/// <see cref="ServiceTaskResult"/> has carried the identical wart since the first reply terminal shipped, so
/// it is precedented and not worth reshaping the vocabulary over.
/// </para>
/// </remarks>
public abstract record ServiceTaskStageExchangeResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason <see cref="ServiceTaskExchangeResult"/>'s own
    /// constructor gives: the answers below are the whole vocabulary the runtime can act on, and it has
    /// nothing to give a subtype it does not know. Read that constructor's remarks before changing this one's
    /// accessibility — what holds the property is one committed approval file, and only in CI — and note that
    /// the record copy-constructor route it describes is open on this root too.
    /// </summary>
    private protected ServiceTaskStageExchangeResult() { }

    /// <summary>
    /// This message is handled; the exchange is not over. Returnable only from the <c>onMessage</c> of
    /// <see cref="ServiceTaskPipelineBuilder.HandleReplies"/> — the reply terminal's own <c>onMessage</c> has
    /// <see cref="ServiceTaskExchangeResult.AwaitNextReply"/> for the same purpose.
    /// </summary>
    /// <remarks>
    /// An ordinary successful completion: data changes are saved, and the state travels on — publish what the
    /// next message should see. The exchange stays open until a later message is answered with
    /// <see cref="ServiceTaskStageResult.Completed"/> or
    /// <see cref="ServiceTaskStageResult.FailedPermanent"/>, or the mailbox's timeout runs out.
    /// </remarks>
    public static ServiceTaskStageAwaitNextReplyResult AwaitNextReply() =>
        ServiceTaskStageAwaitNextReplyResult.Instance;
}

/// <summary>
/// A reply handler the pipeline carries on past finished its message while the exchange stays open.
/// </summary>
/// <remarks>
/// <strong>Two types of identical shape exist on purpose</strong>, the same way
/// <see cref="Internal.WorkflowEngine.Models.Engine.MailboxDisposedReason"/> and
/// <see cref="MailboxClosedReason"/> do: this one closes <see cref="ServiceTaskStageExchangeResult"/> and
/// <see cref="ServiceTaskAwaitNextReplyResult"/> closes <see cref="ServiceTaskExchangeResult"/>. The two
/// roots are different contracts — one can conclude the task, the other cannot — and a type has one base, so
/// the duplication is what keeps both roots closed. Do not merge them behind a shared base, an interface or a
/// generic: that would put "await the next message" back within reach of the handlers each root exists to
/// keep it away from. App authors only ever name the factories, so the pair is invisible at use sites.
/// </remarks>
public sealed record ServiceTaskStageAwaitNextReplyResult : ServiceTaskStageExchangeResult
{
    internal static readonly ServiceTaskStageAwaitNextReplyResult Instance = new();

    internal ServiceTaskStageAwaitNextReplyResult() { }
}
