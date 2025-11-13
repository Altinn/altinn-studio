using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

/// <summary>
/// Interface for service tasks that can be executed during a process.
/// </summary>
[ImplementableByApps]
public interface IServiceTask : IProcessTask
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    public Task<ServiceTaskResult> Execute(ServiceTaskContext context);
}

/// <summary>
/// This class represents the parameters for executing a service task.
/// </summary>
public sealed record ServiceTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to read and modify the instance data during the service task execution.
    /// </summary>
    /// <remarks>Changes are saved after Execute returns a successful result. Keep in mind that data elements from previous tasks are locked.</remarks>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;
}

/// <summary>
/// Base type for the result of executing a service task.
/// </summary>
public abstract record ServiceTaskResult
{
    /// <summary>
    /// Creates a service task result representing successful execution.
    /// </summary>
    public static ServiceTaskSuccessResult Success() => new();

    /// <summary>
    /// Creates a service task result representing failed execution.
    /// </summary>
    /// <param name="errorHandling">Instructions to the process engine on how to handle this error</param>
    public static ServiceTaskFailedResult Failed(ServiceTaskErrorHandling errorHandling) => new(errorHandling);

    /// <summary>
    /// Creates a service task result representing failed execution with instruction to abort the process next request.
    /// </summary>
    public static ServiceTaskFailedResult FailedAbortProcessNext() =>
        new(new ServiceTaskErrorHandling(ServiceTaskErrorStrategy.AbortProcessNext, null));

    /// <summary>
    /// Creates a service task result representing failed execution with instruction to continue to the next element in the process.
    /// </summary>
    /// <param name="action">An optional action can be supplied for the process next call</param>
    public static ServiceTaskFailedResult FailedContinueProcessNext(string? action = "reject") =>
        new(new ServiceTaskErrorHandling(ServiceTaskErrorStrategy.ContinueProcessNext, action));
}

/// <summary>
/// Represents a successful result of executing a service task.
/// </summary>
public sealed record ServiceTaskSuccessResult : ServiceTaskResult;

/// <summary>
/// Represents a failed result of executing a service task.
/// </summary>
public sealed record ServiceTaskFailedResult : ServiceTaskResult
{
    /// <summary>
    /// Instructions to the process engine on how to handle this error
    /// </summary>
    public ServiceTaskErrorHandling ErrorHandling { get; init; }

    /// <inheritdoc cref="ServiceTaskResult.Failed"/>
    public ServiceTaskFailedResult(ServiceTaskErrorHandling errorHandling)
    {
        ErrorHandling = errorHandling;
    }
}

/// <summary>
/// Instructions to the process engine on how to handle errors from service tasks.
/// </summary>
/// <param name="Strategy">Should the process engine stop the <c>process/next</c> execution?</param>
/// <param name="Action">If proceeding with <c>process/next</c>, should we send an action? Defaults to <c>reject</c></param>
public sealed record ServiceTaskErrorHandling(ServiceTaskErrorStrategy Strategy, string? Action = "reject");

/// <summary>
/// Strategy for handling errors from service tasks.
/// </summary>
public enum ServiceTaskErrorStrategy
{
    /// <summary>
    /// Abort the process/next execution.
    /// </summary>
    AbortProcessNext,

    /// <summary>
    /// Move to the next task in the process.
    /// </summary>
    ContinueProcessNext,
}
