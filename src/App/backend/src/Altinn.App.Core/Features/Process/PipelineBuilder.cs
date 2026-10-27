namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes the stages of a process task's lifecycle pipeline: the work the task does when it starts, ends or is
/// abandoned (<see cref="Internal.Process.ProcessTasks.IProcessTask.DefineStart"/>, <c>DefineEnd</c> and
/// <c>DefineAbandon</c>). Each stage runs as a workflow step of its own that saves on its own, so a stage that fails
/// is retried without the ones before it. The stages run inside the transition, before it commits, and never
/// advance the process, so unlike a <see cref="ServiceTaskPipelineBuilder"/> there is no conclusion: the pipeline
/// ends with <see cref="Build"/>. A stage is the same work a service task stage is, so the two can share it.
/// </summary>
public sealed class PipelineBuilder
{
    private readonly List<PipelineStage.Plain> _stages = [];

    internal PipelineBuilder() { }

    /// <summary>
    /// Composes a stage. It completes, defers until a later attempt, or fails for the step to be retried or not.
    /// A stage that defers must leave the instance data unchanged. A stage that throws fails the step as
    /// retryable.
    /// </summary>
    /// <param name="work">The stage's work.</param>
    /// <param name="options">The step options for this stage, which override the task's.</param>
    public PipelineBuilder Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();
        _stages.Add(new PipelineStage.Plain(work, options));
        return this;
    }

    /// <summary>
    /// The composed pipeline. A pipeline with no stages plans no steps.
    /// </summary>
    public Pipeline Build() => new(_stages);
}
