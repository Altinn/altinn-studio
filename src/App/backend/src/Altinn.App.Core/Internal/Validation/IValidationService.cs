using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Core interface for validation of instances. Only a single implementation of this interface should exist in the app.
/// </summary>
public interface IValidationService
{
    /// <summary>
    /// Validates the instance with all data elements on the current task and ensures that the instance is ready for process next.
    /// </summary>
    /// <param name="dataAccessor">Accessor for instance data to be validated</param>
    /// <param name="taskId">The task to run validations for (overriding instance.Process?.CurrentTask?.ElementId)</param>
    /// <param name="ignoredValidators">List of <see cref="IValidator.ValidationSource"/> to ignore</param>
    /// <param name="onlyIncrementalValidators">only run validators that implements incremental validation</param>
    /// <param name="language">The language to run validations in</param>
    /// <returns>List of validation issues for this data element</returns>
    Task<List<ValidationIssueWithSource>> ValidateInstanceAtTask(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        List<string>? ignoredValidators,
        bool? onlyIncrementalValidators,
        string? language
    );

    /// <summary>
    /// Given a list of changes, evaluate <see cref="IValidator.HasRelevantChanges"/> and run the relevant validators to get
    /// the issues from the validators that might return different results based on the changes.
    /// </summary>
    /// <param name="dataAccessor">Accessor for instance data to be validated</param>
    /// <param name="taskId">The task to run validations for (overriding instance.Process?.CurrentTask?.ElementId)</param>
    /// <param name="changes">List of changed data elements and values to forward to <see cref="IValidator.HasRelevantChanges"/></param>
    /// <param name="ignoredValidators">List of <see cref="IValidator.ValidationSource"/> to ignore</param>
    /// <param name="language">The language to run validations in</param>
    /// <returns>Dictionary where the key is the <see cref="IValidator.ValidationSource"/> and the value is the list of issues this validator produces</returns>
    public Task<List<ValidationSourcePair>> ValidateIncrementalFormData(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes,
        List<string>? ignoredValidators,
        string? language
    );
}
