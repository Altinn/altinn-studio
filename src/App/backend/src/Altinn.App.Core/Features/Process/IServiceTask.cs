using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task: the work the workflow engine runs durably when the process enters a BPMN service task,
/// composed as a pipeline in <see cref="DefineExecute"/>. A task that does one thing is a pipeline of one stage,
/// <c>pipeline.Stage(Execute)</c>. A task with several units of work gives each its own stage, and work answered by
/// a message from an external system is an <c>ExternalStage</c>.
/// </summary>
/// <remarks>
/// Each stage runs as its own workflow-engine step, and a completed stage never runs again.
/// <strong>Implementations MUST be idempotent — every stage may be retried on failure.</strong>
/// Authoring guidance: <c>src/App/backend/docs/service-task-pipelines.md</c> in the altinn-studio repository.
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IProcessTask
{
    /// <summary>
    /// Composes the pipeline the task runs between its start and its end, as one or more <c>Stage</c> and
    /// <c>ExternalStage</c> calls. Called at enqueue, on every callback, and at app startup, so it must be cheap,
    /// deterministic and side-effect free.
    /// </summary>
    public void DefineExecute(PipelineBuilder.ServiceTask pipeline);
}
