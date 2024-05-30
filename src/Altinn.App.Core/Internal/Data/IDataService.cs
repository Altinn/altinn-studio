using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// DRAFT. Don't make public yet.
/// Service that simplifies access to data elements through the IDataClient.
/// </summary>
public interface IDataService
{
    /// <summary>
    /// Retrieves a single data element by dataTypeId and deserializes it to an object of type T.
    /// </summary>
    /// <typeparam name="T">The type of the data element.</typeparam>
    /// <param name="instance">The instance associated with the object.</param>
    /// <param name="dataTypeId">The ID of the data type.</param>
    /// <returns>A tuple containing the ID of the data element and the retrieved model.</returns>
    Task<(Guid dataElementId, T? model)> GetByType<T>(Instance instance, string dataTypeId);

    /// <summary>
    /// Retrieves a single data element by its ID and deserializes it to an object of type T.
    /// </summary>
    /// <typeparam name="T">The type of the data element.</typeparam>
    /// <param name="instance">The instance associated with the object.</param>
    /// <param name="dataElementId">The ID of the data element.</param>
    /// <returns>The object of type T.</returns>
    Task<T> GetById<T>(Instance instance, Guid dataElementId);

    /// <summary>
    /// Inserts a data element for the instance.
    /// </summary>
    /// <param name="instanceIdentifier"></param>
    /// <param name="dataTypeId"></param>
    /// <param name="data"></param>
    /// <returns></returns>
    Task<DataElement> InsertJsonObject(InstanceIdentifier instanceIdentifier, string dataTypeId, object data);

    /// <summary>
    /// Updates a data element for the instance.
    /// </summary>
    /// <param name="instanceIdentifier"></param>
    /// <param name="dataTypeId"></param>
    /// <param name="dataElementId"></param>
    /// <param name="data"></param>
    /// <returns></returns>
    Task<DataElement> UpdateJsonObject(
        InstanceIdentifier instanceIdentifier,
        string dataTypeId,
        Guid dataElementId,
        object data
    );

    /// <summary>
    /// Deletes a data element by its ID.
    /// </summary>
    /// <param name="instanceIdentifier">The instance associated with the object.</param>
    /// <param name="dataElementId">The ID of the data element to delete.</param>
    /// <returns>A boolean indicating success/failure.</returns>
    Task<bool> DeleteById(InstanceIdentifier instanceIdentifier, Guid dataElementId);
}
