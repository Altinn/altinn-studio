using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data;

internal interface IDataClientWithStorageMetadata
{
    Task<byte[]> GetDataBytesWithExpectedBlobVersionId(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        string? expectedBlobVersionId = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads one blob version of a data element. Storage serves it to the instance's service owner only, also after
    /// the element was deleted or its content replaced, until its cleanup removes the version.
    /// </summary>
    /// <returns>The bytes of the version, or null when Storage does not have it.</returns>
    Task<byte[]?> GetBlobVersionBytes(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        string blobVersionId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    Task<DataElementWithStorageMetadata> InsertBinaryDataWithStorageMetadata(
        string instanceId,
        string dataType,
        string contentType,
        string? filename,
        Stream stream,
        string? generatedFromTask = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken cancellationToken = default
    );

    Task<DataElementWithStorageMetadata> UpdateBinaryDataWithStorageMetadata(
        InstanceIdentifier instanceIdentifier,
        string? contentType,
        string? filename,
        Guid dataGuid,
        Stream stream,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken cancellationToken = default
    );

    Task<DataElementWithStorageMetadata> UpdateDataElementWithStorageMetadata(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken cancellationToken = default
    );

    Task<DeleteDataWithStorageMetadata> DeleteDataWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken cancellationToken = default
    );
}
