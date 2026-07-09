#nullable disable

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
    Task<DataElementWriteResult<DataElement>> Create(
        DataElement dataElement,
        long instanceInternalId = 0,
        CancellationToken cancellationToken = default,
        int? expectedInstanceVersion = null,
        int? expectedProcessStateVersion = null
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
    /// Deletes data-element metadata and detaches current blob-version metadata for later cleanup.
    /// </summary>
    /// <param name="dataElement">the element to delete</param>
    /// <param name="cancellationToken">A cancellation token to pass to async operations</param>
    /// <returns>true if delete went well.</returns>
    Task<InstanceVersionResult> Delete(
        DataElement dataElement,
        CancellationToken cancellationToken = default,
        int? expectedInstanceVersion = null,
        int? expectedProcessStateVersion = null
    );

    /// <summary>
    /// Deletes the data elements metadata folder for an instance.
    /// This folder-level cleanup path does not preserve detached blob-version metadata for retry.
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
    Task<DataElementWriteResult<DataElement>> Update(
        Guid instanceGuid,
        Guid dataElementId,
        Dictionary<string, object> propertylist,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates the data element with storage-level update context and preconditions.
    /// </summary>
    Task<DataElementWriteResult<DataElement>> Update(
        Guid instanceGuid,
        Guid dataElementId,
        Dictionary<string, object> propertylist,
        DataElementUpdateContext context,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates read status without bumping storage-owned instance versions.
    /// </summary>
    Task<DataElementWriteResult<DataElement>> UpdateReadStatus(
        Guid instanceGuid,
        Guid dataElementId,
        bool isRead,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates lock status without bumping storage-owned instance versions.
    /// </summary>
    Task<DataElementWriteResult<DataElement>> UpdateLockStatus(
        Guid instanceGuid,
        Guid dataElementId,
        bool locked,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates file scan status without bumping storage-owned instance versions.
    /// </summary>
    Task<DataElementWriteResult<DataElement>> UpdateFileScanStatus(
        Guid instanceGuid,
        Guid dataElementId,
        FileScanStatus fileScanStatus,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Allocates a blob version ID before a blob upload.
    /// </summary>
    Task<string> CreateBlobVersionId(
        Guid instanceGuid,
        Guid dataElementId,
        string appId,
        string blobStorageOrg,
        int? storageAccountNumber,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes detached blob-version metadata after the physical blob has been deleted.
    /// </summary>
    Task<bool> DeleteBlobVersion(
        Guid instanceGuid,
        Guid dataElementId,
        string blobVersionId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads blob versions that are no longer attached to data element metadata.
    /// </summary>
    Task<IReadOnlyList<string>> ReadDetachedBlobVersions(
        Guid instanceGuid,
        Guid dataElementId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads the currently committed blob version for a data element.
    /// </summary>
    Task<string> ReadCurrentBlobVersion(
        Guid instanceGuid,
        Guid dataElementId,
        CancellationToken cancellationToken = default
    );
}
