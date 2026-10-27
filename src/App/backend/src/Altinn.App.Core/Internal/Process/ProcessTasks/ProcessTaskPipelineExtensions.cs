using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// The phases of a task's lifecycle that a process task composes a pipeline for, with
/// <see cref="IProcessTask.DefineStart"/>, <see cref="IProcessTask.DefineEnd"/> and <see cref="IProcessTask.DefineAbandon"/>.
/// </summary>
internal enum LifecyclePhase
{
    Start,
    End,
    Abandon,
}

/// <summary>
/// How the engine reads a task's lifecycle pipelines. The planner, the commands that run the stages and the startup
/// validation all compose them through here, so they agree on what a composition that goes wrong means.
/// </summary>
internal static class ProcessTaskPipelineExtensions
{
    /// <summary>
    /// The pipeline the task composes for the phase, from a fresh builder. Throws when the task's method returns null,
    /// which no honest implementation does (the builder is the only source of a pipeline) but an unstubbed mock does:
    /// at startup that is a finding naming the task and the phase, at run time a failed step.
    /// </summary>
    public static Pipeline ResolvePipeline(this IProcessTask task, LifecyclePhase phase)
    {
        var builder = new PipelineBuilder();
        Pipeline? pipeline = phase switch
        {
            LifecyclePhase.Start => task.DefineStart(builder),
            LifecyclePhase.End => task.DefineEnd(builder),
            LifecyclePhase.Abandon => task.DefineAbandon(builder),
            _ => throw new ArgumentOutOfRangeException(nameof(phase), phase, null),
        };

        return pipeline
            ?? throw new InvalidOperationException(
                $"{task.GetType().Name}.Define{phase} returned null — a process task must return the pipeline "
                    + "composed from the supplied builder."
            );
    }

    /// <summary>The phase as the engine's messages name it: <c>start</c>, <c>end</c> or <c>abandon</c>.</summary>
    public static string Name(this LifecyclePhase phase) =>
        phase switch
        {
            LifecyclePhase.Start => "start",
            LifecyclePhase.End => "end",
            LifecyclePhase.Abandon => "abandon",
            _ => throw new ArgumentOutOfRangeException(nameof(phase), phase, null),
        };
}
