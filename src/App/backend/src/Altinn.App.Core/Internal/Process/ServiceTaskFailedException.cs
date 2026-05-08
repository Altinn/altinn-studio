namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Exception thrown when a service task fails during workflow execution.
/// The process state has already been committed to Storage at this point;
/// this exception signals that the post-commit service task execution did not succeed.
/// </summary>
internal sealed class ServiceTaskFailedException : ProcessException
{
    /// <summary>
    /// The type identifier of the service task that failed (e.g., "pdf", "eFormidling").
    /// </summary>
    public string ServiceTaskType { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="ServiceTaskFailedException"/> class.
    /// </summary>
    /// <param name="serviceTaskType">The type identifier of the service task.</param>
    /// <param name="errorDetail">Optional error detail from the callback response.</param>
    public ServiceTaskFailedException(string serviceTaskType, string? errorDetail = null)
        : base($"Service task {serviceTaskType} failed with an exception!")
    {
        ServiceTaskType = serviceTaskType;
    }
}
