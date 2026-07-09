using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Storage;

namespace Altinn.App.Core.Internal.Data;

internal interface IInstanceMutationClient
{
    Task<InstanceMutationWithStorageMetadata> CommitInstanceMutationWithStorageMetadata(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageInstanceMutationRequest mutation,
        IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts,
        StorageAuthenticationMethod? authenticationMethod = null,
        StorageWritePreconditions? preconditions = null,
        CancellationToken cancellationToken = default
    );
}
