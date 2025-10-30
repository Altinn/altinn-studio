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
    /// Indicates whether the process should automatically move to the next task after this service task.
    /// </summary>
    public bool? AutoMoveNext { get; init; }

    /// <summary>
    /// The action to use when automatically moving to the next task.
    /// </summary>
    public string? AutoMoveNextAction { get; init; }

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    /// <param name="autoMoveNext">Should the process automatically move to the next task? Defaults to <c>true</c>.</param>
    /// <param name="autoMoveNextAction">The action to use when automatically moving to the next task. Defaults to <c>null</c>.</param>
    public static ServiceTaskSuccessResult Success(bool? autoMoveNext = true, string? autoMoveNextAction = null) =>
        new(autoMoveNext, autoMoveNextAction);

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    /// <param name="autoMoveNext">Should the process automatically move to the next task? Defaults to <c>false</c>.</param>
    /// <param name="autoMoveNextAction">The action to use when automatically moving to the next task. Defaults to <c>reject</c>.</param>
    public static ServiceTaskFailedResult Failed(bool? autoMoveNext = false, string? autoMoveNextAction = "reject") =>
        new(autoMoveNext, autoMoveNextAction);
}

/// <summary>
/// Represents a successful result of executing a service task.
/// </summary>
public sealed record ServiceTaskSuccessResult : ServiceTaskResult
{
    /// <inheritdoc cref="ServiceTaskResult.Success"/>
    public ServiceTaskSuccessResult(bool? autoMoveNext = null, string? autoMoveNextAction = null)
    {
        AutoMoveNext = autoMoveNext;
        AutoMoveNextAction = autoMoveNextAction;
    }
}

/// <summary>
/// Represents a failed result of executing a service task.
/// </summary>
public sealed record ServiceTaskFailedResult : ServiceTaskResult
{
    /// <inheritdoc cref="ServiceTaskResult.Failed"/>
    public ServiceTaskFailedResult(bool? autoMoveNext = null, string? autoMoveNextAction = null)
    {
        AutoMoveNext = autoMoveNext;
        AutoMoveNextAction = autoMoveNextAction;
    }
}
