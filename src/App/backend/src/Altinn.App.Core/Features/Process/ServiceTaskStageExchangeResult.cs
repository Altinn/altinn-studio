namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a reply handler that leaves the task unconcluded may answer — the <c>onMessage</c> of
/// <see cref="ServiceTaskPipelineBuilder.HandleReplies"/>: anything a pipeline stage answers
/// (<see cref="ServiceTaskStageResult"/>, the whole vocabulary below this type) plus
/// <see cref="AwaitNextReply"/>. The same move as <see cref="ServiceTaskExchangeResult"/>, one rung down —
/// concluding the task and advancing the process live on <see cref="ServiceTaskResult"/>, which is not below
/// this root, so a handler the pipeline carries on past cannot reach them.
/// </summary>
public abstract record ServiceTaskStageExchangeResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason <see cref="ServiceTaskExchangeResult"/>'s own
    /// constructor gives — read that constructor's remarks before changing this one's accessibility.
    /// </summary>
    private protected ServiceTaskStageExchangeResult() { }

    /// <summary>
    /// This message is handled; the exchange is not over. Data changes are saved and the state travels on —
    /// publish what the next message should see.
    /// </summary>
    public static ServiceTaskStageAwaitNextReplyResult AwaitNextReply() =>
        ServiceTaskStageAwaitNextReplyResult.Instance;
}

/// <summary>
/// A reply handler the pipeline carries on past finished its message while the exchange stays open.
/// </summary>
/// <remarks>
/// Identical shape to <see cref="ServiceTaskAwaitNextReplyResult"/> on purpose: the two roots are different
/// contracts — one can conclude the task, the other cannot — and a type has one base, so the duplication is
/// what keeps both roots closed. Do not merge them behind a shared base, an interface or a generic.
/// </remarks>
public sealed record ServiceTaskStageAwaitNextReplyResult : ServiceTaskStageExchangeResult
{
    internal static readonly ServiceTaskStageAwaitNextReplyResult Instance = new();

    internal ServiceTaskStageAwaitNextReplyResult() { }
}
