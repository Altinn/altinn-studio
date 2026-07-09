#nullable disable

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

public interface IInstanceMutationRepository
{
    /// <summary>
    /// Admits a replay when an idempotent aggregate mutation has already been committed.
    /// Returns the replayed result with an instance snapshot, or throws when replay cannot be admitted.
    /// </summary>
    Task<InstanceMutationApplyResult> TryReplayAdmission(
        Guid instanceGuid,
        int expectedInstanceVersion,
        int currentInstanceVersion,
        int currentProcessStateVersion,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    );

    Task<InstanceMutationApplyResult> Apply(
        Guid instanceGuid,
        long instanceInternalId,
        InstanceMutationCommit mutation,
        CancellationToken cancellationToken = default
    );
}

public sealed record InstanceMutationCommit(
    IReadOnlyList<DataElement> CreateDataElements,
    IReadOnlyList<InstanceMutationDataElementUpdate> UpdateDataElements,
    IReadOnlyList<InstanceMutationDataElementDelete> DeleteDataElements,
    Instance InstanceUpdates,
    IReadOnlyList<string> InstanceUpdateProperties,
    int? ExpectedInstanceVersion,
    int? ExpectedProcessStateVersion,
    ProcessState ProcessState = null,
    IReadOnlyList<InstanceEvent> InstanceEvents = null,
    string IdempotencyKey = null,
    DateTime? LastChanged = null,
    string LastChangedBy = null
);

public sealed record InstanceMutationApplyResult(
    bool Replayed,
    IReadOnlyList<string> CreatedDataElementIds,
    Instance Instance,
    InstanceVersionResult Versions,
    IReadOnlyDictionary<string, string> DataElementBlobVersionIds
)
{
    public static InstanceMutationApplyResult ReplayWithCreatedDataElementIds(
        IReadOnlyList<string> createdDataElementIds,
        Instance instance,
        InstanceVersionResult versions,
        IReadOnlyDictionary<string, string> dataElementBlobVersionIds
    ) => new(true, createdDataElementIds, instance, versions, dataElementBlobVersionIds);
}

public sealed record InstanceMutationDataElementUpdate(
    Guid DataElementId,
    Dictionary<string, object> Properties,
    string ExpectedCurrentBlobVersion,
    bool EnforceLockCheck
);

public sealed record InstanceMutationDataElementDelete(DataElement DataElement, bool EnforceLockCheck);
