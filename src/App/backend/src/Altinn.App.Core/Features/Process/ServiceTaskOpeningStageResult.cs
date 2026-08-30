namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The result of a pipeline stage that <strong>opens a mailbox</strong> — the work delegate of
/// <see cref="ServiceTaskPipelineBuilder.Stage(Func{ServiceTaskContext, ServiceTaskMailbox, Task{ServiceTaskOpeningStageResult}}, MailboxOptions, out MailboxHandle, ProcessStepOptions?)"/>:
/// the whole stage vocabulary, plus <see cref="Conclude"/> for the send that discovers the task's outcome
/// on its own — an answer that can never arrive needs no exchange to say so.
/// </summary>
/// <remarks>
/// Deliberately its own root rather than a subtype of <see cref="ServiceTaskStageResult"/>: that type sits
/// below <see cref="ServiceTaskStageExchangeResult"/>, and rooting this vocabulary anywhere in that chain
/// would put either <c>AwaitNextReply</c> within a stage's reach or <see cref="Conclude"/> within a reply
/// handler's. The duplicated members are the price of both roots staying closed — do not merge them behind
/// a shared base, an interface or a generic.
/// </remarks>
public abstract record ServiceTaskOpeningStageResult
{
    /// <summary>
    /// Declares no constructor an app can call, for the reason <see cref="ServiceTaskExchangeResult"/>'s own
    /// constructor gives — read that constructor's remarks before changing this one's accessibility.
    /// </summary>
    private protected ServiceTaskOpeningStageResult() { }

    /// <summary>
    /// The stage is complete: the pipeline advances. Recorded durably by the engine — a completed
    /// stage never runs again. Data changes made through
    /// <see cref="ServiceTaskContext.InstanceDataMutator"/> are saved, so the stages after this
    /// one see them. From the last stage before the exchange's reply handler, completing is also what
    /// starts the exchange's receive leg.
    /// </summary>
    public static ServiceTaskOpeningStageResult Completed() => CompletedServiceTaskOpeningStageResult.Instance;

    /// <summary>
    /// The stage ran without error, but the outcome it awaits has not arrived yet: run this stage
    /// again after <paramref name="delay"/>. Semantics are identical to
    /// <see cref="ServiceTaskResult.Defer"/> — stateless, no error recorded, retry counter reset, bounded by
    /// the stage's <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="delay">How long to wait before this stage runs again — this re-check only.</param>
    /// <param name="reason">
    /// Optional description of what is being waited for, surfaced on status reads — phrase it for a
    /// reader, not a log parser.
    /// </param>
    public static ServiceTaskOpeningStageResult Defer(TimeSpan delay, string? reason = null)
    {
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(delay, TimeSpan.Zero);
        return new DeferredServiceTaskOpeningStageResult(delay, reason);
    }

    /// <summary>
    /// Creates a retryable failure. The workflow engine will retry this stage with backoff.
    /// Use this for transient errors (external service down, timeout, rate limit, etc.).
    /// A failed attempt saves nothing: the retry starts from exactly the state this attempt received.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskOpeningStageResult FailedRetryable(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskOpeningStageResult(errorMessage, FailureKind.Retryable);
    }

    /// <summary>
    /// Creates a permanent (non-retryable) failure. The workflow engine will stop retrying and mark
    /// the stage as failed immediately. Use this for errors that won't resolve by retrying
    /// (validation failure, missing config, bad data, etc.). A failed attempt saves nothing: an operational
    /// resume re-runs this stage from exactly the state this attempt received. Mailboxes already open stay
    /// open — a resume may still carry the exchange on; conclude with
    /// <see cref="Conclude"/> to close them instead.
    /// </summary>
    /// <param name="errorMessage">Human-readable error message describing the failure.</param>
    public static ServiceTaskOpeningStageResult FailedPermanent(string errorMessage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(errorMessage);
        return new FailedServiceTaskOpeningStageResult(errorMessage, FailureKind.Permanent);
    }

    /// <summary>
    /// Concludes the <strong>whole task</strong> from this stage: every mailbox the task has opened is
    /// closed before anything downstream starts, no receiver is enqueued, the pipeline items composed after
    /// this stage never run, and the process advances (or not) per <paramref name="result"/>. For the send
    /// whose failure already settles the matter — a recipient address that does not exist — where waiting
    /// out the exchange would only delay the same verdict. Conclude only on failures remediated case-side;
    /// an app-level failure (credentials, configuration) should be an ordinary <see cref="FailedPermanent"/>
    /// instead, so the mailbox stays open and fixing the problem plus resuming the workflow lets the
    /// exchange complete.
    /// </summary>
    /// <param name="result">
    /// How the task concludes. <see cref="ServiceTaskResult.Success"/> and
    /// <see cref="ServiceTaskResult.FailedPermanent"/> conclude; a wrapped
    /// <see cref="ServiceTaskResult.FailedRetryable"/> or <see cref="ServiceTaskResult.Defer"/> concludes
    /// nothing and acts exactly as the stage vocabulary's own member.
    /// </param>
    /// <remarks>
    /// Honored only from the <strong>last stage before the segment's reply handler</strong> — the pipeline
    /// runs any stage composed between this one and the handler as its own later engine step, which a
    /// conclusion here cannot cancel. A conclusion from any earlier stage fails the step permanently. The
    /// composition cannot reject the misplacement eagerly: whether a stage's work concludes is invisible
    /// until it runs.
    /// </remarks>
    public static ServiceTaskOpeningStageResult Conclude(ServiceTaskResult result)
    {
        ArgumentNullException.ThrowIfNull(result);
        return new ConcludedServiceTaskOpeningStageResult(result);
    }
}

internal sealed record CompletedServiceTaskOpeningStageResult : ServiceTaskOpeningStageResult
{
    public static readonly CompletedServiceTaskOpeningStageResult Instance = new();
}

internal sealed record DeferredServiceTaskOpeningStageResult(TimeSpan Delay, string? Reason)
    : ServiceTaskOpeningStageResult;

internal sealed record FailedServiceTaskOpeningStageResult(string ErrorMessage, FailureKind Kind)
    : ServiceTaskOpeningStageResult;

internal sealed record ConcludedServiceTaskOpeningStageResult(ServiceTaskResult Result) : ServiceTaskOpeningStageResult;
