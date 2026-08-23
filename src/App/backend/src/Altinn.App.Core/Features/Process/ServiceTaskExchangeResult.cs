namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a multi-message exchange's reply handler may answer: anything a service task concludes with
/// (<see cref="ServiceTaskResult"/>, the whole vocabulary below this type) plus
/// <see cref="AwaitNextReply"/>, which concludes nothing and waits for the next message.
/// </summary>
/// <remarks>
/// The split is what makes "await the next message" unrepresentable where there is no next message to await:
/// only <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/>'s <c>onMessage</c> returns this type —
/// every other handler returns <see cref="ServiceTaskResult"/>, so the compiler rejects
/// <see cref="AwaitNextReply"/> there.
/// </remarks>
public abstract record ServiceTaskExchangeResult
{
    /// <summary>
    /// This message is handled; the exchange is not over. Returnable only from a multi-message exchange's
    /// message handler.
    /// </summary>
    /// <remarks>
    /// An ordinary successful completion: data changes are saved, and the state travels on — publish what the
    /// next message should see. The task stays unconcluded until a later message answers with
    /// <see cref="ServiceTaskResult.Success"/>/<see cref="ServiceTaskResult.FailedPermanent"/> or the
    /// mailbox's timeout runs out.
    /// </remarks>
    public static ServiceTaskAwaitNextReplyResult AwaitNextReply() => ServiceTaskAwaitNextReplyResult.Instance;
}

/// <summary>A reply handler finished its message while the exchange stays open.</summary>
public sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskExchangeResult
{
    internal static readonly ServiceTaskAwaitNextReplyResult Instance = new();

    internal ServiceTaskAwaitNextReplyResult() { }
}
