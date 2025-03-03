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
    /// <returns>The deserialized data model for this data element</returns>
    /// <exception cref="InvalidOperationException">when identifier does not exist in instance.Data with an applogic data type</exception>
    Task<object> GetFormData(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Gets the raw binary data from a DataElement.
    /// </summary>
    /// <remarks>Form data elements (with appLogic) will get json serialized UTF-8</remarks>
    /// <exception cref="InvalidOperationException">when identifier does not exist in instance.Data</exception>
    Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Get a data element from an instance by id,
    /// </summary>
    /// <exception cref="InvalidOperationException">If the data element is not found on the instance</exception>
    DataElement GetDataElement(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Get the data type from application with the given type.
    /// </summary>
    /// <param name="dataTypeId">DataType.Id (from applicationmetadata.json)</param>
    /// <returns>The data type (or null if it does not exist)</returns>
    DataType? GetDataType(string dataTypeId);
}

/// <summary>
/// Extension methods for IInstanceDataAccessor to simplify usage.
/// </summary>
public static class IInstanceDataAccessorExtensions
{
    /// <summary>
    /// Get the dataType of a data element.
    /// </summary>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    public static DataType GetDataType(
        this IInstanceDataAccessor dataAccessor,
        DataElementIdentifier dataElementIdentifier
    )
    {
        var dataElement = dataAccessor.GetDataElement(dataElementIdentifier);
        var dataType = dataAccessor.GetDataType(dataElement.DataType);
        if (dataType is null)
        {
            throw new InvalidOperationException(
                $"Data type {dataElement.DataType} not found in applicationmetadata.json"
            );
        }

        return dataType;
    }

    /// <summary>
    /// Get the actual data represented in the data element (cast into T).
    /// </summary>
    /// <returns>The deserialized data model for this data element or an exception for non-form data elements</returns>
    public static async Task<T> GetFormData<T>(
        this IInstanceDataAccessor accessor,
        DataElementIdentifier dataElementIdentifier
    )
        where T : class
    {
        object data = await accessor.GetFormData(dataElementIdentifier);
        if (data is T t)
        {
            return t;
        }
        throw new InvalidOperationException($"Data element {dataElementIdentifier} is not of type {typeof(T)}");
    }

    /// <summary>
    /// Get all elements of a specific data type.
    /// </summary>
    public static IEnumerable<DataElement> GetDataElementsForType(
        this IInstanceDataAccessor accessor,
        string dataTypeId
    ) => accessor.Instance.Data.Where(dataElement => dataTypeId.Equals(dataElement.DataType, StringComparison.Ordinal));

    /// <summary>
    /// Get all elements of a specific data type.
    /// </summary>
    public static IEnumerable<DataElement> GetDataElementsForType(
        this IInstanceDataAccessor accessor,
        DataType dataType
    ) => accessor.GetDataElementsForType(dataType.Id);

    /// <summary>
    /// Retrieves the data elements associated with a specific task.
    /// </summary>
    /// <param name="accessor">The instance data accessor.</param>
    /// <param name="taskId">The identifier of the task.</param>
    /// <returns>An enumerable collection of tuples containing the data type and data element associated with the specified task.</returns>
    public static IEnumerable<(DataType dataType, DataElement dataElement)> GetDataElementsForTask(
        this IInstanceDataAccessor accessor,
        string taskId
    )
    {
        foreach (var dataElement in accessor.Instance.Data)
        {
            var dataType = accessor.GetDataType(dataElement.DataType);
            if (taskId.Equals(dataType?.TaskId, StringComparison.Ordinal))
            {
                yield return (dataType, dataElement);
            }
        }
    }

    /// <summary>
    /// Get all form data elements along with their data types.
    /// </summary>
    public static IEnumerable<(DataType dataType, DataElement dataElement)> GetDataElementsWithFormData(
        this IInstanceDataAccessor accessor
    )
    {
        foreach (var dataElement in accessor.Instance.Data)
        {
            var dataType = accessor.GetDataType(dataElement.DataType);
            if (dataType?.AppLogic?.ClassRef is not null)
            {
                yield return (dataType, dataElement);
            }
        }
    }

    /// <summary>
    /// Get all form data elements along with their data types for a specific task.
    /// </summary>
    public static IEnumerable<(DataType dataType, DataElement dataElement)> GetDataElementsWithFormDataForTask(
        this IInstanceDataAccessor accessor,
        string taskId
    )
    {
        foreach (var dataElement in accessor.Instance.Data)
        {
            var dataType = accessor.GetDataType(dataElement.DataType);
            if (dataType?.AppLogic?.ClassRef is not null && taskId.Equals(dataType.TaskId, StringComparison.Ordinal))
            {
                yield return (dataType, dataElement);
            }
        }
    }

    /// <summary>
    /// Get all data elements along with their data types.
    /// </summary>
    public static IEnumerable<(DataType dataType, DataElement dataElement)> GetDataElements(
        this IInstanceDataAccessor accessor
    )
    {
        foreach (var dataElement in accessor.Instance.Data)
        {
            var dataType = accessor.GetDataType(dataElement.DataType);
            if (dataType is not null)
            {
                yield return (dataType, dataElement);
            }
        }
    }
}
