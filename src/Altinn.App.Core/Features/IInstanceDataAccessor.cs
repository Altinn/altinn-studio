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
    Task<object> GetFormData(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Gets the raw binary data from a DataElement.
    /// </summary>´
    /// <remarks>Form data elements (with appLogic) will get json serialized UTF-8</remarks>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    /// <returns></returns>
    Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Get a data element from an instance by id,
    /// </summary>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    DataElement GetDataElement(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Get the dataType of a data element.
    /// </summary>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    DataType GetDataType(DataElementIdentifier dataElementIdentifier);
}
