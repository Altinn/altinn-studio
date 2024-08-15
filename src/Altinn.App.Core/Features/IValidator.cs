using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Main interface for validation of instances
/// </summary>
public interface IValidator
{
    /// <summary>
    /// The task id for the task that the validator is associated with or "*" if the validator should run for all tasks.
    /// </summary>
    public string TaskId { get; }

    /// <summary>
    /// Unique string that identifies the source of the validation issues from this validator
    /// Used for incremental validation. Default implementation should typically work.
    /// </summary>
    public string ValidationSource => $"{GetType().FullName}-{TaskId}";

    /// <summary>
    ///
    /// </summary>
    /// <param name="instance">The instance to validate</param>
    /// <param name="taskId">The current task. </param>
    /// <param name="language">Language for messages, if the messages are too dynamic for the translation system</param>
    /// <param name="instanceDataAccessor">Use this to access data from other data elements</param>
    /// <returns></returns>
    public Task<List<ValidationIssue>> Validate(
        Instance instance,
        string taskId,
        string? language,
        IInstanceDataAccessor instanceDataAccessor
    );

    /// <summary>
    /// For patch requests we typically don't run all validators, because some validators will predictably produce the same issues as previously.
    /// This method is used to determine if the validator has relevant changes, or if the cached issues list can be used.
    /// </summary>
    /// <param name="instance">The instance to validate</param>
    /// <param name="taskId">The current task ID</param>
    /// <param name="changes">List of changed data elements with current and previous value</param>
    /// <param name="instanceDataAccessor">Use this to access data from other data elements</param>
    /// <returns></returns>
    public Task<bool> HasRelevantChanges(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor instanceDataAccessor
    );
}

/// <summary>
/// Represents a change in a data element with current and previous deserialized data
/// </summary>
public class DataElementChange
{
    /// <summary>
    /// The data element the change is related to
    /// </summary>
    public required DataElement DataElement { get; init; }

    /// <summary>
    /// The state of the data element before the change
    /// </summary>
    public required object PreviousValue { get; init; }

    /// <summary>
    /// The state of the data element after the change
    /// </summary>
    public required object CurrentValue { get; init; }
}

/// <summary>
/// Service for accessing data from other data elements in the
/// </summary>
public interface IInstanceDataAccessor
{
    /// <summary>
    /// Get the actual data represented in the data element.
    /// </summary>
    /// <param name="dataElement">The data element to retrieve. Must be from the instance that is currently active</param>
    /// <returns>The deserialized data model for this data element or a stream for binary elements</returns>
    Task<object> Get(DataElement dataElement);
}
