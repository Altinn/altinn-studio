using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>A user task type whose user action starts an action pipeline that holds the instance.</summary>
internal interface IActionPipelineTask : IProcessTask
{
    /// <summary>The user action that starts the pipeline, such as <c>pay</c>.</summary>
    string StartAction { get; }

    /// <summary>
    /// Composes the pipeline. The rules of <see cref="IServiceTask.DefineExecute"/> apply, messages are answered with
    /// <c>ConcludeOnReplies</c>, and nothing the pipeline runs before its first receiver defers.
    /// </summary>
    ServiceTaskPipeline DefineActionPipeline(PipelineBuilder pipeline);

    /// <summary>The issue process/next refuses with, since only the pipeline moves the task on.</summary>
    ValidationIssue ProcessNextRefusal(string taskId);
}
