using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes what a process task does in one lifecycle phase (start, end or abandon) as ordered stages. Passed to
/// <see cref="IProcessTask.DefineStart"/>, <see cref="IProcessTask.DefineEnd"/> and
/// <see cref="IProcessTask.DefineAbandon"/>; the lifecycle counterpart of <see cref="ServiceTaskPipelineBuilder"/>.
/// </summary>
/// <remarks>
/// When a phase has more than one stage, each stage runs as its own workflow engine step: its data changes are saved
/// when it completes, and a failed stage is retried without running the stages before it again. A phase with a
/// single stage runs as one step, exactly as a task without a pipeline does.
/// </remarks>
public sealed class ProcessTaskPipelineBuilder
{
    private readonly List<ProcessTaskStage> _stages = [];

    internal ProcessTaskPipelineBuilder() { }

    /// <summary>
    /// Adds a stage. A stage that throws fails its step, and the workflow engine retries it.
    /// </summary>
    /// <param name="work">The stage's work. Must be idempotent: a retried step runs it again.</param>
    /// <param name="options">Options for this stage's step, overriding the engine defaults.</param>
    public ProcessTaskPipelineBuilder Stage(Func<ProcessTaskContext, Task> work, ProcessStepOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(work);
        options?.Validate();
        _stages.Add(new ProcessTaskStage(work, options));
        return this;
    }

    /// <summary>
    /// Finishes the definition.
    /// </summary>
    public ProcessTaskPipeline Build() => new(_stages);
}
