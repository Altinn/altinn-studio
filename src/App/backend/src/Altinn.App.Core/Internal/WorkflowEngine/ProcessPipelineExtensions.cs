using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal static class ProcessPipelineExtensions
{
    internal static ProcessPipeline ResolveLifecyclePipeline(this IProcessTask task, string taskId, string phase)
    {
        var builder = new ProcessPipelineBuilder();
        return (
                phase switch
                {
                    "start" => task.DefineStartPipeline(taskId, builder),
                    "end" => task.DefineEndPipeline(taskId, builder),
                    "abandon" => task.DefineAbandonPipeline(taskId, builder),
                    _ => throw new ArgumentException($"Unknown lifecycle phase '{phase}'.", nameof(phase)),
                }
            )
            ?? throw new InvalidOperationException(
                $"Task '{taskId}' returned null when defining its {phase} pipeline."
            );
    }
}
