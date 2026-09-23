namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Composes durable lifecycle stages. Every stage becomes a separate workflow-engine step with its own
/// save and retry boundary. Definitions must be deterministic, cheap and free of side effects.
/// </summary>
public sealed class ProcessPipelineBuilder
{
    private readonly List<ProcessPipelineStage> _stages = [];

    internal ProcessPipelineBuilder() { }

    /// <summary>
    /// Adds a registered command. Its payload is fixed at enqueue and its registration remains independent
    /// of this definition. Stage options override the command defaults field by field.
    /// </summary>
    public ProcessPipelineBuilder Stage(
        WorkflowCommandRef command,
        ProcessStepOptions? options = null,
        string? name = null
    )
    {
        _stages.Add(new ProcessPipelineStage.Command(command, options, name));
        return this;
    }

    /// <summary>
    /// Adds a named handler, resolved from the task in each callback scope. The name is its durable identity
    /// within this phase: keep it stable across deployments. Work must be idempotent. A completed stage saves
    /// its changes; a failed attempt saves nothing. The context carries the explicit task ID.
    /// </summary>
    public ProcessPipelineBuilder Stage(
        string name,
        Func<ProcessEngineCommandContext, Task<ProcessEngineCommandResult>> work,
        ProcessStepOptions? options = null
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentNullException.ThrowIfNull(work);
        if (_stages.OfType<ProcessPipelineStage.Handler>().Any(stage => stage.Name == name))
        {
            throw new ArgumentException($"A lifecycle handler named '{name}' is already defined.", nameof(name));
        }
        _stages.Add(new ProcessPipelineStage.Handler(name, work, options));
        return this;
    }

    /// <summary>Finishes the definition without adding a step or concluding the process task.</summary>
    public ProcessPipeline Build() => new(_stages);
}
