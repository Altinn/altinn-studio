using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Validator for data elements.
/// See <see cref="IFormDataValidator"/> for an alternative validator for data elements with app logic.
/// and that support incremental validation on save.
/// For validating the content of files, see <see cref="IFileAnalyser"/> and <see cref="IFileValidator"/>
/// </summary>
[ImplementableByApps]
public interface IDataElementValidator
{
    /// <summary>
    /// The data type that this validator should run for. This is the id of the data type from applicationmetadata.json
    /// </summary>
    /// <remarks>
    ///
    /// </remarks>
    string DataType { get; }

    /// <summary>
    /// Returns the group id of the validator.
    /// The default is based on the FullName and DataType fields, and should not need customization
    /// </summary>
    string ValidationSource => $"{this.GetType().FullName}-{DataType}";

    /// <summary>
    /// This validator is costly to run, and should only run on process/next or explicit validation requests.
    /// <see cref="IValidator.NoIncrementalValidation"/>
    /// </summary>
    bool NoIncrementalValidation => true;

    /// <summary>
    /// Run validations for a data element. This is supposed to run quickly
    /// </summary>
    /// <param name="instance">The instance to validate</param>
    /// <param name="dataElement"></param>
    /// <param name="dataType"></param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <returns></returns>
    public Task<List<ValidationIssue>> ValidateDataElement(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        string? language
    );
}
