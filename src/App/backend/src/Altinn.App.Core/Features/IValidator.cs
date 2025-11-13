using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Main interface for validation of instances
/// </summary>
[ImplementableByApps]
public interface IValidator
{
    /// <summary>
    /// The task id for the task that the validator is associated with or "*" if the validator should run for all tasks.
    /// </summary>
    /// <remarks>Ignored if <see cref="ShouldRunForTask"/> is implemented</remarks>
    public string TaskId { get; }

    /// <summary>
    /// Check if this validator should run for the given task
    ///
    /// Default implementations check <see cref="TaskId"/>
    /// </summary>
    public bool ShouldRunForTask(string taskId) => TaskId == "*" || TaskId == taskId;

    /// <summary>
    /// Unique string that identifies the source of the validation issues from this validator
    /// Used for incremental validation. Default implementation should typically work.
    /// </summary>
    public string ValidationSource => $"{GetType().FullName}-{TaskId}";

    /// <summary>
    /// If true, this validator is costly to run, and should not run on every PATCH request, but only on `/process/next`
    /// or when explicit validation is requested.
    ///
    /// Always returning false from <see cref="HasRelevantChanges"/> has a similar effect, but setting this to false informs
    /// frontend that the issues from the validator can't be cached, because FE won't be informed when the issue is fixed.
    /// Issues from validators with NoIncrementalValidation will be shown once but prevent process/next from succeeding.
    /// </summary>
    bool NoIncrementalValidation => false;

    /// <summary>
    /// Indicates whether this validator should run against a cleaned view of the data where fields marked as hidden are removed.
    /// </summary>
    /// <remarks>
    /// Defaults to <c>false</c>. When <c>true</c>, the validation pipeline will supply a cleaned accessor for both
    /// <see cref="Validate"/> and <see cref="HasRelevantChanges"/>, ensuring consistent visibility semantics.
    /// </remarks>
    bool ShouldRunAfterRemovingHiddenData => false;

    /// <summary>
    /// Run this validator and return all the issues this validator is aware of.
    /// </summary>
    /// <param name="dataAccessor">Use this to access the form data from <see cref="DataElement"/>s</param>
    /// <param name="taskId">The current task. </param>
    /// <param name="language">Language for messages, if the messages are too dynamic for the translation system</param>
    /// <returns></returns>
    public Task<List<ValidationIssue>> Validate(IInstanceDataAccessor dataAccessor, string taskId, string? language);

    /// <summary>
    /// For patch requests we typically don't run all validators, because some validators will predictably produce the same issues as previously.
    /// This method is used to determine if the validator has relevant changes, or if the cached issues list can be used.
    /// </summary>
    /// <param name="dataAccessor">Use this to access instance and data from data elements</param>
    /// <param name="taskId">The current task ID</param>
    /// <param name="changes">List of changed data elements with current and previous value</param>
    /// <returns></returns>
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes);
}
