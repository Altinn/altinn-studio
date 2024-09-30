using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Service for accessing data from other data elements in the
/// </summary>
public interface IInstanceDataAccessor
{
    /// <summary>
    /// The instance that the accessor can access data for.
    /// </summary>
    Instance Instance { get; }

    /// <summary>
    /// Get the actual data represented in the data element.
    /// </summary>
    /// <returns>The deserialized data model for this data element or an exception for non-form data elements</returns>
    Task<object> GetFormData(DataElementId dataElementId);

    /// <summary>
    /// Gets the raw binary data from a DataElement.
    /// </summary>´
    /// <remarks>Form data elements (with appLogic) will get json serialized UTF-8</remarks>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    /// <returns></returns>
    Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementId dataElementId);

    /// <summary>
    /// Get a data element from an instance by id,
    /// </summary>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    DataElement GetDataElement(DataElementId dataElementId);

    /// <summary>
    /// Add a new data element with app logic to the instance of this accessor
    /// </summary>
    /// <remarks>
    /// Serialization of data is done immediately, so the data object should be in a valid state.
    /// </remarks>
    /// <throws>Throws an InvalidOperationException if the dataType is not found in applicationmetadata</throws>
    void AddFormDataElement(string dataType, object data);

    /// <summary>
    /// Add a new data element without app logic to the instance.
    /// </summary>
    /// <remarks>
    /// Saving to storage is not done until the instance is saved, so mutations to data might or might not be sendt to storage.
    /// </remarks>
    void AddAttachmentDataElement(string dataType, string contentType, string? filename, ReadOnlyMemory<byte> bytes);

    /// <summary>
    /// Remove a data element from the instance.
    ///
    /// Actual removal from storage is not done until the instance is saved.
    /// </summary>
    void RemoveDataElement(DataElementId dataElementId);
}
