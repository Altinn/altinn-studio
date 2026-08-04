namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task that does one thing: a single unit of work executed (and on failure, retried) as
/// one workflow-engine step. For a task with several consecutive units of work — dispatch then
/// await, or a series of API calls — implement <see cref="IStagedServiceTask"/> instead, so each
/// unit gets its own durable step.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - service tasks may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IServiceTaskBase
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    public Task<ServiceTaskResult> Execute(ServiceTaskContext context);
}
