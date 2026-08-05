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
    /// Adds a durable stage, executed in composition order before the pipeline's conclusion. The
    /// stage runs as its own workflow-engine step and never runs again once it reports
    /// <see cref="ServiceTaskStageResult.Completed"/>; a retry or resume re-enters the pipeline at
    /// the failed stage.
    /// </summary>
    /// <param name="name">
    /// The stage's identity — in the engine's records, logs and dashboards, and how a callback
    /// finds its way back to this stage. <strong>The name is a compatibility surface for
    /// in-flight workflows:</strong> a workflow enqueued with this stage keeps calling back by
    /// name until it settles, so keep names stable. Renaming the work method is free; this
    /// literal is what must not drift.
    /// </param>
    /// <param name="work">
    /// The stage's work. <strong>MUST be idempotent — it may be retried on failure.</strong> Use
    /// <see cref="ServiceTaskContext.StepId"/> (stable across this stage's attempts, unique to
    /// it) as the idempotency key for an outbound call the stage must not repeat. Data changes
    /// via <see cref="ServiceTaskContext.InstanceDataMutator"/> are saved when the stage
    /// completes and are visible to every stage after it; a deferring attempt saves nothing.
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
    public ServiceTaskPipeline Finally(Func<ServiceTaskContext, Task<ServiceTaskResult>> work)
    {
        ArgumentNullException.ThrowIfNull(work);
        return new ServiceTaskPipeline([.. _stages], work);
    }
}
