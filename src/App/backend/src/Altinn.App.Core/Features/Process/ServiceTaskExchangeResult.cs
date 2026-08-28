namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What a reply handler may answer: anything a service task concludes with (<see cref="ServiceTaskResult"/>,
/// the whole vocabulary below this type) plus <see cref="AwaitNextReply"/>, which concludes nothing and waits
/// for the next message. Only <see cref="ServiceTaskPipelineBuilder.ConcludeOnReplies"/>'s <c>onMessage</c>
/// returns this type — its <c>onClosed</c>, and <see cref="ServiceTaskPipelineBuilder.Finally"/>, return
/// <see cref="ServiceTaskResult"/>, so the compiler rejects <see cref="AwaitNextReply"/> where there is no
/// next message to await. A handler the pipeline carries on past answers
/// <see cref="ServiceTaskStageExchangeResult"/> instead — a separate root, on purpose.
/// </summary>
public abstract record ServiceTaskExchangeResult
{
    /// <summary>
    /// Declares no constructor an app can call, closing the vocabulary: the runtime maps each answer by type
    /// and has nothing to give a subtype it does not know.
    /// </summary>
    /// <remarks>
    /// No test can hold this property (<c>Altinn.App.Core.Tests</c> is an <c>InternalsVisibleTo</c> friend);
    /// the committed public-API approval file is what notices a widening, and <em>only in CI</em> — AutoVerify
    /// rewrites it silently on a developer machine. Read that file's diff by hand if you touch the
    /// accessibility of this constructor or its siblings'. The record copy-constructor stays reachable
    /// (C# forbids narrowing it), so four tests pin that an unknown result converges as a permanent failure
    /// instead of throwing into a retry ladder.
    /// </remarks>
    private protected ServiceTaskExchangeResult() { }

    /// <summary>
    /// This message is handled; the exchange is not over. Data changes are saved and the state travels on —
    /// publish what the next message should see.
    /// </summary>
    public static ServiceTaskAwaitNextReplyResult AwaitNextReply() => ServiceTaskAwaitNextReplyResult.Instance;
}

/// <summary>A reply terminal finished its message while the exchange stays open.</summary>
/// <remarks>
/// Identical shape to <see cref="ServiceTaskStageAwaitNextReplyResult"/> on purpose — see that type's
/// remarks. Do not deduplicate.
/// </remarks>
public sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskExchangeResult
{
    internal static readonly ServiceTaskAwaitNextReplyResult Instance = new();

    internal ServiceTaskAwaitNextReplyResult() { }
}
