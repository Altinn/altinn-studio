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
    /// <param name="language">The language to run validations in</param>
    /// <returns>List of validation issues for this data element</returns>
    Task<List<ValidationIssue>> ValidateInstanceAtTask(Instance instance, string taskId, string? language);

    /// <summary>
    /// Validate a single data element regardless of whether it has AppLogic (eg. datamodel) or not.
    /// </summary>
    /// <remarks>
    /// This method executes validations in the following interfaces
    /// * <see cref="IDataElementValidator"/> for all data elements on the current task
    /// * <see cref="IFormDataValidator"/> for all data elements with app logic on the current task
    ///
    /// This method does not run task validations
    /// </remarks>
    /// <param name="instance">The instance to validate</param>
    /// <param name="dataElement">The data element to run validations for</param>
    /// <param name="dataType">The data type (from applicationmetadata) that the element is an instance of</param>
    /// <param name="language">The language to run validations in</param>
    /// <returns>List of validation issues for this data element</returns>
    Task<List<ValidationIssue>> ValidateDataElement(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        string? language
    );

    /// <summary>
    /// Validates a single data element. Used by frontend to continuously validate form data as it changes.
    /// </summary>
    /// <remarks>
    /// This method executes validations for <see cref="IFormDataValidator"/>
    /// </remarks>
    /// <param name="instance">The instance to validate</param>
    /// <param name="dataElement">The data element to run validations for</param>
    /// <param name="dataType">The type of the data element</param>
    /// <param name="data">The data deserialized to the strongly typed object that represents the form data</param>
    /// <param name="previousData">The previous data so that validators can know if they need to run again with <see cref="IFormDataValidator.HasRelevantChanges"/></param>
    /// <param name="ignoredValidators">List validators that should not be run (for incremental validation). Typically known validators that frontend knows how to replicate</param>
    /// <param name="language">The language to run validations in</param>
    /// <returns>A dictionary containing lists of validation issues grouped by <see cref="IFormDataValidator.ValidationSource"/> and/or <see cref="ValidationIssue.Source"/></returns>
    Task<Dictionary<string, List<ValidationIssue>>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        object data,
        object? previousData,
        List<string>? ignoredValidators,
        string? language
    );
}
