using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Core interface for validation of instances. Only a single implementation of this interface should exist in the app.
/// </summary>
public interface IValidationService
{
    /// <summary>
    /// Validates the instance with all data elements on the current task and ensures that the instance is ready for process next.
    /// </summary>
    /// <remarks>
    /// This method executes validations in the following interfaces
    /// * <see cref="ITaskValidator"/> for the current task
    /// * <see cref="IDataElementValidator"/> for all data elements on the current task
    /// * <see cref="IFormDataValidator"/> for all data elements with app logic on the current task
    /// </remarks>
    /// <param name="instance">The instance to validate</param>
    /// <param name="taskId">instance.Process?.CurrentTask?.ElementId</param>
    /// <param name="dataAccessor">Accessor for instance data to be validated</param>
    /// <param name="language">The language to run validations in</param>
    /// <returns>List of validation issues for this data element</returns>
    Task<List<ValidationIssueWithSource>> ValidateInstanceAtTask(
        Instance instance,
        string taskId,
        IInstanceDataAccessor dataAccessor,
        string? language
    );

    /// <summary>
    ///
    /// </summary>
    /// <param name="instance"></param>
    /// <param name="taskId"></param>
    /// <param name="ignoredValidators"></param>
    /// <param name="changes">List of changed <see cref="DataElement"/> with both previous and next </param>
    /// <param name="dataAccessor"></param>
    /// <param name="language"></param>
    /// <returns></returns>
    public Task<Dictionary<string, List<ValidationIssueWithSource>>> ValidateIncrementalFormData(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor dataAccessor,
        List<string>? ignoredValidators,
        string? language
    );
}
