namespace Altinn.App.Core.Features.Process;

/// <summary>Composes registered commands as durable lifecycle stages, each with its own save and retry boundary.</summary>
public sealed class ProcessPipelineBuilder
{
    private readonly List<ProcessPipelineStage.Command> _stages = [];

    internal ProcessPipelineBuilder() { }

    /// <summary>Adds a command whose registration is independent of this definition. Stage options override command defaults.</summary>
    public ProcessPipelineBuilder Stage(WorkflowCommandRef command, ProcessStepOptions? options = null)
    {
        _stages.Add(new ProcessPipelineStage.Command(command, options));
        return this;
    }

    /// <summary>Finishes the definition without adding a step or concluding the process task.</summary>
    public ProcessPipeline Build() => new(_stages);
}
