using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Describes the implementation of a data element storage.
/// </summary>
public interface IDataRepository
{
    /// <summary>
    /// Creates a dataElement into the repository
    /// </summary>
    /// <param name="dataElement">the data element to insert</param>
    /// <param name="instanceInternalId">the internal id of the parent instance</param>
    /// <param name="cancellationToken">A cancellation token to pass to async operations</param>
    /// <returns>the data element with updated id</returns>
    Task<DataElement> Create(
        DataElement dataElement,
        long instanceInternalId = 0,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads a data element metadata object. Not the actual data.
    /// </summary>
    /// <param name="instanceGuid">the instance guid as partitionKey</param>
    /// <param name="dataElementId">The data element guid</param>
    /// <param name="cancellationToken">A cancellation token to pass to async operations</param>
    /// <returns>The identified data element.</returns>
    Task<DataElement> Read(
        Guid instanceGuid,
        Guid dataElementId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the data element metadata object permanently!
    /// </summary>
    /// <param name="dataElement">the element to delete</param>
    /// <param name="cancellationToken">A cancellation token to pass to async operations</param>
    /// <returns>true if delete went well.</returns>
    Task<bool> Delete(DataElement dataElement, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes the data elements metadata for an instance permanently!
    /// </summary>
    /// <param name="instanceId">the parent instance id of the data elements to delete</param>
    /// <param name="cancellationToken">A cancellation token to pass to async operations</param>
    /// <returns>true if delete went well.</returns>
    Task<bool> DeleteForInstance(string instanceId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the data element with the properties provided in the dictionary
    /// </summary>
    /// <param name="instanceGuid">The instance guid</param>
    /// <param name="dataElementId">The data element id</param>
    /// <param name="propertylist">A dictionary contaning property id (key) and object (value) to be stored</param>
    /// <param name="cancellationToken">A cancellation token to pass to async operations</param>
    /// <remarks>Dictionary can containt at most 10 entries</remarks>
    Task<DataElement> Update(
        Guid instanceGuid,
        Guid dataElementId,
        Dictionary<string, object> propertylist,
        CancellationToken cancellationToken = default
    );
}
