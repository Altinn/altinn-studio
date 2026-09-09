namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task that does one thing: a single unit of work executed (and on failure, retried)
/// durably by the workflow engine when the process enters a BPMN service task. This is the shape
/// almost every service task wants. A task with several consecutive units of work — dispatch then
/// await, or a series of API calls — should implement <see cref="IPipelineServiceTask"/> instead
/// and give each unit its own durable stage.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent — service tasks may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IPipelineServiceTask
{
    /// <summary>
    /// Executes the service task: <see cref="ServiceTaskResult.Success"/> (with optional
    /// auto-advance action), <see cref="ServiceTaskResult.SuccessWithoutAutoAdvance"/>,
    /// <see cref="ServiceTaskResult.Defer"/> to run again later, or a failure. Unhandled
    /// exceptions are treated as retryable failures.
    /// </summary>
    public Task<ServiceTaskResult> Execute(ServiceTaskContext context);

    /// <summary>
    /// A simple service task is a pipeline whose only step is the conclusion: <see cref="Execute"/>
    /// is the pipeline's <c>Finally</c>. This forwarding is the contract — an implementing class
    /// must never replace it (enforced at compile time and at app startup).
    /// </summary>
    [SealedImplementation(
        $"Implement {nameof(IPipelineServiceTask)} directly instead — on an {nameof(IServiceTask)}, {nameof(Execute)} would never run"
    )]
    ServiceTaskPipeline IPipelineServiceTask.Define(ServiceTaskPipelineBuilder pipeline) => pipeline.Finally(Execute);
}
