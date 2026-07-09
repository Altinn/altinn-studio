using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Storage;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Instances;

internal interface IInstanceClientWithStorageMetadata
{
    Task<InstanceWithStorageMetadata> GetInstanceWithStorageMetadata(
        string app,
        string org,
        int instanceOwnerPartyId,
        Guid instanceId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    Task<InstanceWithStorageMetadata> UpdatePresentationTextsWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken ct = default
    );

    Task<InstanceWithStorageMetadata> UpdateDataValuesWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        DataValues dataValues,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken ct = default
    );

    Task<InstanceWithStorageMetadata> UpdateProcessAndEventsWithStorageMetadata(
        Instance instance,
        List<InstanceEvent> events,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken ct = default
    );
}
