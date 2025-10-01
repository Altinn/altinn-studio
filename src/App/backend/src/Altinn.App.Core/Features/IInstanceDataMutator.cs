using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Extension of the IInstanceDataAccessor that allows for adding and removing data elements,
/// and also indicate that it is OK to mutate the models
/// </summary>
public interface IInstanceDataMutator : IInstanceDataAccessor
{
    /// <summary>
    /// Add a new data element with app logic to the instance of this accessor
    /// </summary>
    /// <remarks>
    /// Serialization of data is done immediately, so the data object should be in a valid state.
    /// </remarks>
    /// <throws>Throws an InvalidOperationException if the dataType is not found in applicationmetadata</throws>
    FormDataChange AddFormDataElement(string dataTypeId, object model);

    /// <summary>
    /// Add a new data element with app logic to the instance of this accessor
    /// </summary>
    /// <remarks>
    /// Serialization of data is done immediately, so the data object should be in a valid state.
    /// </remarks>
    /// <throws>Throws an InvalidOperationException if the dataType is not found in applicationmetadata</throws>
    FormDataChange AddFormDataElement(DataType dataType, object model) => AddFormDataElement(dataType.Id, model);

    /// <summary>
    /// Add a new data element without app logic to the instance.
    /// </summary>
    /// <remarks>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sent to storage.
    /// </remarks>
    BinaryDataChange AddBinaryDataElement(
        string dataTypeId,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    );

    /// <summary>
    /// Add a new data element without app logic to the instance.
    /// </summary>
    /// <remarks>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sendt to storage.
    /// </remarks>
    BinaryDataChange AddBinaryDataElement(
        DataType dataType,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes
    ) => AddBinaryDataElement(dataType.Id, contentType, filename, bytes);

    /// <summary>
    /// Remove a data element from the instance.
    ///
    /// Actual removal from storage is not done until the instance is saved.
    /// </summary>
    void RemoveDataElement(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Stop processing the request with current changes and return a BadRequest with the following issues
    /// This is intended to be an alternative to a <see cref="IFileAnalyser"/> <see cref="IFileValidator"/>
    /// pair to ensure that new binary data is not saved if the data is not valid.
    /// </summary>
    /// <param name="validationIssues"></param>
    void AbandonAllChanges(IEnumerable<ValidationIssue> validationIssues);
}
