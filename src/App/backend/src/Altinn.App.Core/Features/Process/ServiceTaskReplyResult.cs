namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What an external stage's reply handler returns: anything a service task step returns
/// (<see cref="ServiceTaskResult"/>, the whole vocabulary below this type), plus <see cref="AwaitNextReply"/>.
/// </summary>
public abstract record ServiceTaskReplyResult
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
    /// (C# forbids narrowing it), so a test per result mapper pins that an unknown result converges as a
    /// permanent failure instead of throwing into a retry ladder.
    /// </remarks>
    private protected ServiceTaskReplyResult() { }

    /// <summary>
    /// This reply is handled; run the handler again for the next one. Data changes are saved, so the next
    /// reply's handler sees them.
    /// </summary>
    public static ServiceTaskReplyResult AwaitNextReply() => ServiceTaskAwaitNextReplyResult.Instance;

    /// <summary>
    /// Done with the replies: the reply address closes and the next item runs, or, after the last item, the task
    /// ends with the default flow.
    /// </summary>
    public static ServiceTaskReplyResult Completed() => ServiceTaskResult.Completed();

    /// <summary>
    /// Ends the task now: the reply address closes, later items never run, and the process moves on.
    /// </summary>
    /// <param name="action">
    /// Optional process action that picks the next flow (e.g. "reject"). When null, the default flow is used.
    /// </param>
    public static ServiceTaskReplyResult EndTask(string? action = null) => ServiceTaskResult.EndTask(action);

    /// <summary>
    /// The handler ran without error, but cannot answer this reply yet: run it again with the same reply after
    /// <paramref name="delay"/>.
    /// </summary>
    /// <param name="delay">How long to wait before the handler runs again.</param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads. Phrase it for a reader.
    /// </param>
    public static ServiceTaskReplyResult Defer(TimeSpan delay, string? reason = null) =>
        ServiceTaskResult.Defer(delay, reason);

    /// <summary>
    /// A transient failure: the workflow engine runs the handler again with the same reply, with backoff.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskReplyResult FailedRetryable(string errorMessage) =>
        ServiceTaskResult.FailedRetryable(errorMessage);

    /// <summary>
    /// A failure no retry fixes: the step fails and the reply address stays open, so a resume can run the
    /// handler again.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskReplyResult FailedPermanent(string errorMessage) =>
        ServiceTaskResult.FailedPermanent(errorMessage);
}

/// <summary>
/// A reply handler handled its reply and waits for the next. Created via
/// <see cref="ServiceTaskReplyResult.AwaitNextReply"/>.
/// </summary>
internal sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskReplyResult
{
    internal static readonly ServiceTaskAwaitNextReplyResult Instance = new();
}
