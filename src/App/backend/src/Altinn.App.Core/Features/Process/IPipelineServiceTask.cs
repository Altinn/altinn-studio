using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task defined as a pipeline: ordered durable stages followed by the one conclusion,
/// composed in <see cref="Define"/>. The conclusion is a final step for work that finishes by itself
/// or by polling, or a reply terminal for work answered by a message into a mailbox a stage opened. A
/// task that does one thing should implement <see cref="IServiceTask"/> instead — this interface
/// specialized to just the concluding step.
/// </summary>
/// <remarks>
/// Each stage runs as its own workflow-engine step, and a completed stage never runs again.
/// <strong>Implementations MUST be idempotent — every stage may be retried on failure.</strong>
/// Authoring guidance: <c>docs/service-task-pipelines.md</c> in the app-lib repository.
/// </remarks>
[ImplementableByApps]
public interface IPipelineServiceTask : IProcessTask, IProcessStepConfigurable
{
    /// <summary>
    /// Defines the task's pipeline: zero or more <c>Stage</c> calls, ended by exactly one terminal —
    /// <c>Finally</c>, or <c>ConcludeOnReplies</c> when a stage opened a mailbox. Called at enqueue, on
    /// every callback, and at app startup, so it must be cheap, deterministic and side-effect free.
    /// </summary>
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline);
}
