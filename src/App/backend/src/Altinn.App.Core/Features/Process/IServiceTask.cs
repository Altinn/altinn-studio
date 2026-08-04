using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Interface for service tasks that can be executed during a process.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - service tasks may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IProcessTask, IProcessStepConfigurable
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    public Task<ServiceTaskResult> Execute(ServiceTaskContext context);
}
