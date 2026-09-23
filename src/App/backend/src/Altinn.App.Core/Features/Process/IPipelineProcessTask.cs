using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A process task with composable lifecycle work. Register under <see cref="IProcessTask"/> (or its service
/// task interface). Existing command-list implementations remain supported through the default definitions.
/// Definitions depend on configuration alone and are evaluated at startup and enqueue. Named delegate
/// handlers are resolved again in the callback scope; registered command stages execute their persisted input.
/// </summary>
[ImplementableByApps]
public interface IPipelineProcessTask : IProcessTask
{
    /// <summary>Work performed before the transition commits, after common task initialization.</summary>
    ProcessPipeline DefineStartPipeline(string taskId, ProcessPipelineBuilder pipeline) =>
        ProcessPipeline.FromCommands(GetStartCommands(taskId));

    /// <summary>Work performed before the ending hook and before task data is locked.</summary>
    ProcessPipeline DefineEndPipeline(string taskId, ProcessPipelineBuilder pipeline) =>
        ProcessPipeline.FromCommands(GetEndCommands(taskId));

    /// <summary>Work performed before the task's abandon hook.</summary>
    ProcessPipeline DefineAbandonPipeline(string taskId, ProcessPipelineBuilder pipeline) =>
        ProcessPipeline.FromCommands(GetAbandonCommands(taskId));
}
