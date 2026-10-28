using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using KeyValueEntry = Altinn.Platform.Storage.Interface.Models.KeyValueEntry;

namespace Altinn.App.Core.Features;

/// <summary>
/// Extension of the IInstanceDataAccessor that allows for adding, updating and removing data elements,
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
    /// <para>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sent to storage.
    /// </para>
    /// <para>
    /// <c>generatedFromTask</c> marks the element for automatic deletion when the process (re-)enters that task.
    /// Use it for regenerable artifacts whose lifetime should follow the task, and leave it unset to manage the
    /// element's lifecycle explicitly/manually.
    /// </para>
    /// </remarks>
    BinaryDataChange AddBinaryDataElement(
        string dataTypeId,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes,
        string? generatedFromTask = null,
        List<KeyValueEntry>? metadata = null
    );

    /// <summary>
    /// Add a new data element without app logic to the instance.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sent to storage.
    /// </para>
    /// <para>
    /// <c>generatedFromTask</c> marks the element for automatic deletion when the process (re-)enters that task.
    /// Use it for regenerable artifacts whose lifetime should follow the task, and leave it unset to manage the
    /// element's lifecycle explicitly/manually.
    /// </para>
    /// </remarks>
    BinaryDataChange AddBinaryDataElement(
        DataType dataType,
        string contentType,
        string? filename,
        ReadOnlyMemory<byte> bytes,
        string? generatedFromTask = null,
        List<KeyValueEntry>? metadata = null
    ) => AddBinaryDataElement(dataType.Id, contentType, filename, bytes, generatedFromTask, metadata);

    /// <summary>
    /// Replace the binary content of an existing binary data element.
    /// </summary>
    /// <remarks>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sent to storage.
    /// </remarks>
    BinaryDataChange UpdateBinaryDataElement(
        DataElementIdentifier dataElementIdentifier,
        string contentType,
        ReadOnlyMemory<byte> bytes
    );

    /// <summary>
    /// Remove a data element from the instance.
    ///
    /// Actual removal from storage is not done until the instance is saved.
    /// </summary>
    void RemoveDataElement(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Reads a copy of the element's current form data; changes to the copy are not saved.
    /// </summary>
    /// <remarks>
    /// The copy includes earlier changes in memory, such as changes to the object <see cref="IInstanceDataAccessor.GetFormData"/>
    /// returns and data set with <see cref="ReplaceFormData"/>.
    /// </remarks>
    /// <exception cref="InvalidOperationException">when identifier does not exist in instance.Data with an applogic data type</exception>
    Task<object> GetFormDataCopy(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Makes the state of <paramref name="model"/> at this call the element's form data; it is saved with the other changes.
    /// </summary>
    /// <remarks>
    /// Later changes to <paramref name="model"/> are not saved, also when it is the object that
    /// <see cref="IInstanceDataAccessor.GetFormData"/> returned. Afterwards <see cref="IInstanceDataAccessor.GetFormData"/>
    /// returns the replaced data as an object of its own. To change a form added in this unit of work, change the object
    /// passed to <see cref="AddFormDataElement(string, object)"/>.
    /// </remarks>
    /// <exception cref="ArgumentNullException">when <paramref name="model"/> is null</exception>
    /// <exception cref="InvalidOperationException">
    /// when the element is not on the instance, is marked for deletion, or its data type's classRef is not the type of <paramref name="model"/>
    /// </exception>
    Task ReplaceFormData(DataElementIdentifier dataElementIdentifier, object model);

    /// <summary>
    /// Sets tags, metadata, user-defined metadata, refs or the filename of a data element.
    /// </summary>
    /// <remarks>
    /// Also works for an element added in this unit of work. Each list replaces the element's current list; several calls
    /// for one element keep the last value given for each property. The element in <see cref="IInstanceDataAccessor.Instance"/>
    /// shows the new values at once.
    /// </remarks>
    /// <exception cref="ArgumentNullException">when <paramref name="update"/> is null</exception>
    /// <exception cref="InvalidOperationException">
    /// when the element is not on the instance, is marked for deletion, or a ref names an element added in this unit of work
    /// </exception>
    void UpdateDataElementMetadata(DataElementIdentifier dataElementIdentifier, DataElementMetadataUpdate update);

    /// <summary>
    /// Sets a data value on the instance; null or empty removes the key.
    /// </summary>
    /// <exception cref="ArgumentException">when <paramref name="key"/> is null or blank</exception>
    /// <exception cref="InvalidOperationException">when the key is derived from <c>dataFields</c> in applicationmetadata.json</exception>
    void SetDataValue(string key, string? value);

    /// <summary>
    /// Sets a presentation text on the instance; null or empty removes the key.
    /// </summary>
    /// <exception cref="ArgumentException">when <paramref name="key"/> is null or blank</exception>
    /// <exception cref="InvalidOperationException">when the key is derived from <c>presentationFields</c> in applicationmetadata.json</exception>
    void SetPresentationText(string key, string? value);

    /// <summary>
    /// Sets the instance's substatus.
    /// </summary>
    /// <remarks>
    /// Storage accepts a substatus only from the app owner. Process transitions save it as the app; Storage refuses the
    /// whole save, with its other changes, when it is made with an end user's token.
    /// </remarks>
    void SetSubstatus(Substatus substatus);

    /// <summary>
    /// Confirms the instance as complete on behalf of the app owner.
    /// </summary>
    /// <remarks>
    /// Only a process transition saves the confirmation; any other save of these changes throws.
    /// </remarks>
    void AddCompleteConfirmation();

    /// <summary>
    /// Stop processing the request with current changes and return a BadRequest with the following issues
    /// This is intended to be an alternative to a <see cref="IFileAnalyzer"/> <see cref="IFileValidator"/>
    /// pair to ensure that new binary data is not saved if the data is not valid.
    /// </summary>
    /// <param name="validationIssues"></param>
    void AbandonAllChanges(IEnumerable<ValidationIssue> validationIssues);
}
