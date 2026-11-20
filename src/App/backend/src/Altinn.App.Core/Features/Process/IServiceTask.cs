using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task: the work the workflow engine runs durably when the process enters a BPMN service task,
/// composed as a pipeline in <see cref="DefineExecute"/>. A task that does one thing is a pipeline of one step that
/// ends it — <c>pipeline.Stage(Execute)</c>. A task with several consecutive units of work — dispatch then await,
/// or a series of API calls — gives each unit its own durable stage ahead of the step that ends the task, which is
/// either work that finishes by itself or by polling, or the replies to a message sent into a mailbox a stage
/// opened.
/// </summary>
/// <remarks>
/// Each stage runs as its own workflow-engine step, and a completed stage never runs again.
/// <strong>Implementations MUST be idempotent — every stage may be retried on failure.</strong>
/// Authoring guidance: <c>docs/service-task-pipelines.md</c> in the app-lib repository.
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IProcessTask
{
    /// <summary>
    /// Defines the pipeline the task runs between its start and its end: steps that carry on, ended by exactly one
    /// step that ends the task. What a step's work returns decides which it is: <see cref="StageResult"/> carries on,
    /// <see cref="ServiceTaskResult"/> ends the task. Each call takes the step's options, such as its timeout and
    /// retry strategy. Called at enqueue, on every callback, and at app startup, so it must be cheap, deterministic
    /// and side-effect free.
    /// </summary>
    public ServiceTaskPipeline DefineExecute(PipelineBuilder.ServiceTask pipeline);
}
