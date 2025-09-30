using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Interface for handling validation of form data.
/// (i.e. dataElements with AppLogic defined
/// </summary>
[ImplementableByApps]
public interface IFormDataValidator
{
    /// <summary>
    /// The data type this validator is for.
    ///
    /// To validate all types with form data, just use a "*" as value
    /// </summary>
    string DataType { get; }

    /// <summary>
    /// Used for partial validation to ensure that the validator only runs when relevant fields have changed.
    /// </summary>
    /// <param name="current">The current state of the form data</param>
    /// <param name="previous">The previous state of the form data</param>
    bool HasRelevantChanges(object current, object previous);

    /// <summary>
    /// Returns the group id of the validator. This is used to run partial validations on the backend.
    /// The default is based on the FullName and DataType fields, and should not need customization
    /// </summary>
    string ValidationSource => $"{this.GetType().FullName}-{DataType}";

    /// <summary>
    /// If you override this to return true, the validator will only run on process/next, and not continuously.
    /// <see cref="HasRelevantChanges"/> will never get called
    /// <see cref="IValidator.NoIncrementalValidation"/>
    /// </summary>
    bool NoIncrementalValidation => false;

    /// <summary>
    /// The actual validation function
    /// </summary>
    /// <param name="instance"></param>
    /// <param name="dataElement"></param>
    /// <param name="data"></param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns>List of validation issues</returns>
    Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    );
}
