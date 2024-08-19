using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Interface for handling validation of tasks.
/// </summary>
public interface ITaskValidator
{
    /// <summary>
    /// The task id this validator is for, or "*" if relevant for all tasks.
    /// </summary>
    string TaskId { get; }

    /// <summary>
    /// Returns the name to be used in the "Source" of property in all
    /// <see cref="ValidationIssue"/>'s created by the validator.
    /// </summary>
    /// <remarks>
    /// The default is based on the FullName and TaskId fields, and should not need customization
    /// </remarks>
    string ValidationSource => $"{GetType().FullName}-{TaskId}";

    /// <summary>
    /// Actual validation logic for the task
    /// </summary>
    /// <param name="instance">The instance to validate</param>
    /// <param name="taskId">current task to run validations for</param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns>List of validation issues to add to this task validation</returns>
    Task<List<ValidationIssue>> ValidateTask(Instance instance, string taskId, string? language);
}
