using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal static class ProcessPipelineExtensions
{
    internal static ProcessPipeline ResolveLifecyclePipeline(this IProcessTask task, string taskId, string phase)
    {
        var builder = new ProcessPipelineBuilder();
        ProcessPipeline? pipeline = task is IPipelineProcessTask composed
            ? phase switch
            {
                "start" => composed.DefineStartPipeline(taskId, builder),
                "end" => composed.DefineEndPipeline(taskId, builder),
                "abandon" => composed.DefineAbandonPipeline(taskId, builder),
                _ => throw new ArgumentException($"Unknown lifecycle phase '{phase}'.", nameof(phase)),
            }
            : ProcessPipeline.FromCommands(
                phase switch
                {
                    "start" => task.GetStartCommands(taskId),
                    "end" => task.GetEndCommands(taskId),
                    "abandon" => task.GetAbandonCommands(taskId),
                    _ => throw new ArgumentException($"Unknown lifecycle phase '{phase}'.", nameof(phase)),
                }
            );
        return pipeline
            ?? throw new InvalidOperationException(
                $"Task '{taskId}' returned null when defining its {phase} pipeline."
            );
    }
}
