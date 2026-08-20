namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes a service task's pipeline inside <see cref="IPipelineServiceTask.Define"/>: zero or
/// more <see cref="Stage"/> calls, ended by the one <see cref="Finally"/>. The types enforce the
/// shape — <see cref="Finally"/> is the only way to obtain the <see cref="ServiceTaskPipeline"/>
/// that <c>Define</c> must return, so a pipeline always ends with exactly one conclusion.
/// </summary>
/// <remarks>
/// The builder validates eagerly: an empty or duplicate stage name, a null work delegate, or
/// invalid <see cref="ProcessStepOptions"/> throw from the composing call itself, which surfaces
/// as an app startup failure when the pipeline is validated.
/// </remarks>
public sealed class ServiceTaskPipelineBuilder
{
    private readonly List<ServiceTaskStage> _stages = [];

    /// <summary>
    /// Whether a <see cref="ServiceTaskPipeline.WithReplyFrom"/> declaration was made on any pipeline that
    /// originated from this builder. The builder is created fresh for each
    /// <see cref="ServiceTaskLookupExtensions.ResolvePipeline"/> call, so this records "did <em>this</em> Define
    /// declare a mailbox" without state that could leak to another task — which is why the mark lives here rather
    /// than on the immutable pipeline.
    /// </summary>
    internal bool MailboxDeclared { get; private set; }

    internal void NoteMailboxDeclaration() => MailboxDeclared = true;

    /// <summary>
    /// Adds a durable stage, executed in composition order before the pipeline's conclusion. The
    /// stage runs as its own workflow-engine step and never runs again once it reports
    /// <see cref="ServiceTaskStageResult.Completed"/>; a retry or resume re-enters the pipeline at
    /// the failed stage.
    /// </summary>
    /// <param name="name">
    /// The stage's identity — in the engine's records, and how a callback finds its way back to
    /// this stage. Printable ASCII only (it travels in HTTP header values). <strong>A
    /// compatibility surface for in-flight workflows:</strong> a workflow enqueued with this
    /// stage keeps calling back by name until it settles. Renaming the work method is free; this
    /// literal is what must not drift.
    /// </param>
    /// <param name="work">
    /// The stage's work. <strong>MUST be idempotent — it may be retried on failure.</strong> Use
    /// <see cref="ServiceTaskContext.StepId"/> as the idempotency key for an outbound call the
    /// stage must not repeat. Data changes via <see cref="ServiceTaskContext.InstanceDataMutator"/>
    /// are saved when the stage completes; a deferring attempt saves nothing.
    /// </param>
    /// <param name="options">
    /// Optional per-stage execution options (timeout, retry strategy, wait budget) for the engine
    /// step this stage becomes, winning field-wise over the task's own
    /// <see cref="IProcessStepConfigurable.StepOptions"/>.
    /// </param>
    public ServiceTaskPipelineBuilder Stage(
        string name,
        Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentNullException.ThrowIfNull(work);
        if (name.Any(c => c < 0x20 || c > 0x7E))
        {
            throw new ArgumentException(
                $"Stage name '{name}' contains a character outside printable ASCII. Stage names travel in "
                    + "engine step identities that cross HTTP header boundaries, which reject non-ASCII values.",
                nameof(name)
            );
        }
        if (_stages.Any(s => string.Equals(s.Name, name, StringComparison.Ordinal)))
        {
            throw new ArgumentException(
                $"Duplicate stage name '{name}'. Names are the stages' identity and must be unique within the pipeline.",
                nameof(name)
            );
        }
        options?.Validate();

        _stages.Add(new ServiceTaskStage(name, work, options));
        return this;
    }

    /// <summary>
    /// Ends the pipeline with its conclusion — the one step that decides how the task concludes
    /// (success, auto-advance action, park, defer, failure), executed after every stage has
    /// completed. For a polling pipeline this is where the wait lives: return
    /// <see cref="ServiceTaskResult.Defer"/> until the outcome arrives, bounded by the task's
    /// <see cref="ProcessStepOptions.WaitBudget"/>.
    /// </summary>
    /// <param name="work">
    /// The concluding work. The idempotency and state-saving rules of
    /// <see cref="Stage(string, Func{ServiceTaskContext, Task{ServiceTaskStageResult}}, ProcessStepOptions?)"/>
    /// apply here too.
    /// </param>
    /// <param name="options">
    /// Optional execution options (timeout, retry strategy, wait budget) for the concluding step
    /// alone, winning field-wise over the task's own
    /// <see cref="IProcessStepConfigurable.StepOptions"/>. Declare a polling pipeline's
    /// <see cref="ProcessStepOptions.WaitBudget"/> here rather than on the task: the task's options
    /// are inherited by every stage as well, so a budget declared there is also handed to stages
    /// that never wait, where it reads as though it might apply.
    /// </param>
    public ServiceTaskPipeline Finally(
        Func<ServiceTaskContext, Task<ServiceTaskResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();
        return new ServiceTaskPipeline([.. _stages], work, options, mailbox: null, origin: this);
    }
}
