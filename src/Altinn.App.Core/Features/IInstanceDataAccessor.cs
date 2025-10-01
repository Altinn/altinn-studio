using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
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
    /// Get the data types from application metadata.
    /// </summary>
    IReadOnlyCollection<DataType> DataTypes { get; }

    /// <summary>
    /// Get the actual data represented in the data element.
    /// </summary>
    /// <returns>The deserialized data model for this data element</returns>
    /// <exception cref="InvalidOperationException">when identifier does not exist in instance.Data with an applogic data type</exception>
    Task<object> GetFormData(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Get the actual data represented in the data element wrapped in an <see cref="IFormDataWrapper"/>.
    /// </summary>
    /// <returns>The deserialized data model for this data element</returns>
    /// <exception cref="InvalidOperationException">when identifier does not exist in instance.Data with an applogic data type</exception>
    internal Task<IFormDataWrapper> GetFormDataWrapper(DataElementIdentifier dataElementIdentifier);

    /// <summary>
    /// Get a <see cref="IInstanceDataAccessor"/> that provides access to the cleaned data (where all fields marked as "hidden" are removed).
    /// </summary>
    /// <param name="rowRemovalOption">The strategy for "hiddenRow" on group components</param>
    IInstanceDataAccessor GetCleanAccessor(RowRemovalOption rowRemovalOption = RowRemovalOption.SetToNull);

    /// <summary>
    /// Get a <see cref="IInstanceDataAccessor"/> that provides access to the
    /// storage persisted before any in-memory changes in this request.
    /// </summary>
    internal IInstanceDataAccessor GetPreviousDataAccessor();

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
    /// <para>Set the authentication method used when reading and writing data of the given data type.</para>
    /// <para>This method allows multiple calls to the same <see cref="DataType"/> key, but only the last
    /// invocation will be used by the read/write process. If you need to obtain a list of currently registered
    /// overrides, see the <see cref="AuthenticationMethodOverrides"/> property.</para>
    /// </summary>
    /// <param name="dataType">The <see cref="DataType"/> this configuration applies to.</param>
    /// <param name="method">The <see cref="StorageAuthenticationMethod"/> to associate with the given data type.</param>
    void OverrideAuthenticationMethod(DataType dataType, StorageAuthenticationMethod method);

    /// <summary>
    /// Gets the currently registered authentication method overrides.
    /// </summary>
    IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides { get; }
}

/// <summary>
/// Extension methods for IInstanceDataAccessor to simplify usage.
/// </summary>
public static class IInstanceDataAccessorExtensions
{
    /// <summary>
    /// Get the data type from application with the given type.
    /// </summary>
    /// <returns>The data type (or null if it does not exist)</returns>
    public static DataType GetDataType(this IInstanceDataAccessor dataAccessor, string dataTypeId)
    {
        return dataAccessor.DataTypes.FirstOrDefault(dataType =>
                dataTypeId.Equals(dataType.Id, StringComparison.Ordinal)
            )
            ?? throw new InvalidOperationException(
                $"Data type {dataTypeId} not found in applicationmetadata.json (found: {string.Join(", ", dataAccessor.DataTypes.Select(d => d.Id))})"
            );
    }

    /// <summary>
    /// Get the dataType of a data element.
    /// </summary>
    /// <throws>Throws an InvalidOperationException if the data element is not found on the instance</throws>
    public static DataType GetDataType(
        this IInstanceDataAccessor dataAccessor,
        DataElementIdentifier dataElementIdentifier
    )
    {
        var dataType = dataElementIdentifier.DataTypeId ?? dataAccessor.GetDataElement(dataElementIdentifier).DataType;
        return dataAccessor.GetDataType(dataType);
    }

    /// <summary>
    /// Get the data type from a C# class reference.
    ///
    /// Note that this throws an error if multiple data types have a ClassRef that matches the given type.
    /// </summary>
    /// <exception cref="InvalidOperationException">If multiple dataType have a ClassRef that matches the given type</exception>
    public static DataType GetDataType<T>(this IInstanceDataAccessor accessor)
    {
        var dataTypes = accessor.DataTypes.Where(d => d.AppLogic?.ClassRef == typeof(T).FullName).ToArray();
        if (dataTypes.Length == 1)
        {
            return dataTypes[0];
        }

        if (dataTypes.Length == 0)
        {
            throw new InvalidOperationException(
                $"Data type for {typeof(T).FullName} not found in applicationmetadata.json"
            );
        }

        throw new InvalidOperationException(
            $"Multiple data types found that references {typeof(T).FullName} found for multiple in applicationmetadata.json ({string.Join(", ", dataTypes.Select(d => d.Id))}). This means you can't access data just based on type parameter<T>."
        );
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
        IFormDataWrapper data = await accessor.GetFormDataWrapper(dataElementIdentifier);
        return data.BackingData<T>();
    }

    /// <summary>
    /// Extension method to get formdata from a type parameter that must match dataType.AppLogic.ClassRef.
    /// </summary>
    /// <remarks>
    /// This method only supports data types with MaxCount = 1.
    /// </remarks>
    public static async Task<T?> GetFormData<T>(this IInstanceDataAccessor accessor)
        where T : class
    {
        var dataType = accessor.GetDataType<T>();
        return await accessor.GetFormData<T>(dataType);
    }

    /// <summary>
    /// Get form data from a specific data type. (The data type must have MaxCount = 1)
    /// </summary>
    public static async Task<T?> GetFormData<T>(this IInstanceDataAccessor accessor, DataType dataType)
        where T : class
    {
        if (dataType.MaxCount != 1)
        {
            throw new InvalidOperationException(
                $"Data type {dataType.Id} is not a single instance data type, but has MaxCount = {dataType.MaxCount}"
            );
        }

        var dataTypeId = dataType.Id;

        var dataElement = accessor.Instance.Data.FirstOrDefault(dataElement =>
            dataTypeId.Equals(dataElement.DataType, StringComparison.Ordinal)
        );
        if (dataElement is null)
        {
            return null;
        }

        return await accessor.GetFormData<T>(dataElement);
    }

    /// <summary>
    /// Get an array of all the form data elements that has the given type as AppLogic.ClassRef.
    /// </summary>
    public static async Task<T[]> GetAllFormData<T>(this IInstanceDataAccessor accessor)
        where T : class
    {
        var dataType = accessor.GetDataType<T>();
        return await accessor.GetAllFormData<T>(dataType);
    }

    /// <summary>
    /// Get an array of all the form data elements that has the given DataType
    /// </summary>
    public static async Task<T[]> GetAllFormData<T>(this IInstanceDataAccessor accessor, DataType dataType)
        where T : class
    {
        return await Task.WhenAll(accessor.GetDataElementsForType(dataType).Select(e => accessor.GetFormData<T>(e)));
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
            yield return (dataType, dataElement);
        }
    }
}
