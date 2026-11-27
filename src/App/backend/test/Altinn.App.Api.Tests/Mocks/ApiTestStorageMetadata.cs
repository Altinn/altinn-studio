using System.Collections.Concurrent;
using System.Net;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Mocks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks;

internal sealed class ApiTestStorageMetadata
{
    private readonly ConcurrentDictionary<string, InstanceState> _instances = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<(string InstanceId, Guid DataElementId), byte> _bumpBeforeNextContentRead =
        new();
    private readonly TaskCompletionSource _firstAggregateMutation = new(
        TaskCreationOptions.RunContinuationsAsynchronously
    );
    private int _aggregateMutationRequestCount;
    private readonly ConcurrentQueue<string?> _sentCallerResults = new();
    private CountdownEvent? _gatheredMutations;
    private CountdownEvent? _checkedMutations;

    private readonly ConcurrentDictionary<string, SemaphoreSlim> _instanceLocks = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, MutationRecord> _mutationRecords = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<
        (string InstanceId, Guid DataElementId, string BlobVersionId),
        byte[]
    > _blobVersions = new();

    /// <summary>What Storage keeps about a committed mutation under its idempotency key.</summary>
    public sealed record MutationRecord(
        string InstanceId,
        int PreviousInstanceVersion,
        int ProducedInstanceVersion,
        IReadOnlyList<Guid> CreatedDataElementIds,
        string? CallerResult
    );

    /// <summary>Serializes the mutations of one instance, as Storage's aggregate lock does.</summary>
    public async Task<IDisposable> LockInstance(InstanceIdentifier instanceIdentifier)
    {
        SemaphoreSlim gate = _instanceLocks.GetOrAdd(instanceIdentifier.GetInstanceId(), _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        return new Release(gate);
    }

    /// <summary>
    /// Storage's replay admission: the record a mutation under this idempotency key committed, when the request
    /// expects the version that mutation started from and the instance is still at the version it produced. Any other
    /// request under a used key is refused.
    /// </summary>
    public MutationRecord? FindReplay(InstanceIdentifier instanceIdentifier, StorageWritePreconditions? preconditions)
    {
        if (
            preconditions?.IdempotencyKey is not { } idempotencyKey
            || preconditions.InstanceVersion is not { } expectedInstanceVersion
            || !_mutationRecords.TryGetValue(idempotencyKey, out MutationRecord? record)
        )
        {
            return null;
        }

        if (record.InstanceId != instanceIdentifier.GetInstanceId())
        {
            throw new PlatformHttpException(
                HttpStatusCode.Conflict,
                "Idempotency key was already used for another instance."
            );
        }

        if (
            record.PreviousInstanceVersion != expectedInstanceVersion
            || GetVersions(instanceIdentifier).InstanceVersion != record.ProducedInstanceVersion
        )
        {
            ThrowPreconditionFailed("Instance version mismatch");
        }

        return record;
    }

    public void RecordMutation(
        InstanceIdentifier instanceIdentifier,
        StorageWritePreconditions? preconditions,
        int previousInstanceVersion,
        IReadOnlyList<Guid> createdDataElementIds,
        string? callerResult
    )
    {
        if (preconditions?.IdempotencyKey is not { } idempotencyKey || preconditions.InstanceVersion is null)
        {
            return;
        }

        _mutationRecords[idempotencyKey] = new MutationRecord(
            instanceIdentifier.GetInstanceId(),
            previousInstanceVersion,
            GetVersions(instanceIdentifier).InstanceVersion!.Value,
            createdDataElementIds,
            callerResult
        );
    }

    /// <summary>Keeps <paramref name="bytes"/> as the content of the element's blob version, as Storage keeps a replaced or deleted version.</summary>
    public void RetainBlobVersion(InstanceIdentifier instanceIdentifier, Guid dataGuid, byte[] bytes)
    {
        if (GetDataElementBlobVersionId(instanceIdentifier, dataGuid) is { } blobVersionId)
        {
            _blobVersions[(instanceIdentifier.GetInstanceId(), dataGuid, blobVersionId)] = bytes;
        }
    }

    public byte[]? GetRetainedBlobVersion(InstanceIdentifier instanceIdentifier, Guid dataGuid, string blobVersionId) =>
        _blobVersions.TryGetValue((instanceIdentifier.GetInstanceId(), dataGuid, blobVersionId), out byte[]? bytes)
            ? bytes
            : null;

    private sealed class Release(SemaphoreSlim gate) : IDisposable
    {
        public void Dispose() => gate.Release();
    }

    public int AggregateMutationRequestCount => Volatile.Read(ref _aggregateMutationRequestCount);

    /// <summary>False to act as a Storage that predates <c>callerResult</c>: it ignores the field and answers without one.</summary>
    public bool KeepsCallerResults { get; set; } = true;

    /// <summary>The <c>callerResult</c> of every aggregate mutation request, in the order they arrived.</summary>
    public IReadOnlyList<string?> SentCallerResults => [.. _sentCallerResults];

    public void RegisterAggregateMutationRequest(StorageInstanceMutationRequest mutation)
    {
        Interlocked.Increment(ref _aggregateMutationRequestCount);
        _sentCallerResults.Enqueue(mutation.CallerResult);
    }

    /// <summary>
    /// Holds every aggregate mutation until <paramref name="count"/> of them have arrived, and then lets them all go at
    /// once, so that they contend for the instance lock.
    /// </summary>
    public void GatherMutations(int count)
    {
        _gatheredMutations = new CountdownEvent(count);
        _checkedMutations = new CountdownEvent(count);
    }

    /// <summary>
    /// Holds a gathered mutation between its checks and its write until the others have passed their checks too, for
    /// half a second at most. Under the instance lock no other one can get there, so the wait runs out; without the lock
    /// every gathered mutation passes its checks before any of them writes.
    /// </summary>
    public async Task WaitForGatheredMutationsToPassTheirChecks(CancellationToken cancellationToken)
    {
        if (_checkedMutations is not { } checkedMutations)
        {
            return;
        }

        checkedMutations.Signal();
        await Task.Run(
            () => checkedMutations.Wait(TimeSpan.FromMilliseconds(500), cancellationToken),
            cancellationToken
        );
    }

    public async Task WaitForGatheredMutations(CancellationToken cancellationToken)
    {
        if (_gatheredMutations is not { } gathered)
        {
            return;
        }

        gathered.Signal();
        if (!await Task.Run(() => gathered.Wait(TimeSpan.FromSeconds(10), cancellationToken), cancellationToken))
        {
            throw new TimeoutException(
                $"Only {gathered.InitialCount - gathered.CurrentCount} of {gathered.InitialCount} gathered mutations "
                    + "arrived, so they did not race."
            );
        }
    }

    public void BumpDataElementBeforeNextContentRead(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        _bumpBeforeNextContentRead[(instanceIdentifier.GetInstanceId(), dataGuid)] = 0;
    }

    public StorageVersionMetadata RegisterLoadedInstance(Instance instance)
    {
        return GetVersions(instance);
    }

    public Task WaitForFirstAggregateMutation(CancellationToken cancellationToken) =>
        _firstAggregateMutation.Task.WaitAsync(cancellationToken);

    public void SetDataElementBlobVersion(InstanceIdentifier instanceIdentifier, Guid dataGuid, int blobVersion)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(blobVersion);
        SetDataElementBlobVersion(instanceIdentifier, dataGuid, (int?)blobVersion);
    }

    public void SetDataElementWithoutBlobVersion(InstanceIdentifier instanceIdentifier, Guid dataGuid) =>
        SetDataElementBlobVersion(instanceIdentifier, dataGuid, null);

    private void SetDataElementBlobVersion(InstanceIdentifier instanceIdentifier, Guid dataGuid, int? blobVersion)
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            state.DataElementVersions[dataGuid] = blobVersion;
        }
    }

    public void ValidateAggregatePreconditions(
        InstanceIdentifier instanceIdentifier,
        StorageInstanceMutationRequest mutation,
        StorageWritePreconditions? preconditions
    )
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            if (
                preconditions?.ProcessStateVersion is { } expectedProcessStateVersion
                && expectedProcessStateVersion != state.ProcessStateVersion
            )
            {
                ThrowPreconditionFailed("Process state version mismatch");
            }

            if (
                preconditions?.InstanceVersion is { } expectedInstanceVersion
                && expectedInstanceVersion != state.InstanceVersion
            )
            {
                ThrowPreconditionFailed("Instance version mismatch");
            }

            foreach (StorageInstanceMutationUpdateDataElement update in mutation.UpdateDataElements)
            {
                if (
                    !StorageClientInterceptor.TryNormalizeExpectedCurrentBlobVersion(
                        update.ExpectedCurrentBlobVersion,
                        out string? expectedCurrentBlobVersion
                    )
                )
                {
                    ThrowBadRequest("expectedCurrentBlobVersion must identify a blob version id");
                }

                if (
                    expectedCurrentBlobVersion is not null
                    && expectedCurrentBlobVersion
                        != CreateDataElementBlobVersionId(state.GetDataElementVersion(update.DataElementId))
                )
                {
                    ThrowPreconditionFailed("Data element content version mismatch");
                }
            }
        }
    }

    public StorageVersionMetadata GetVersions(Instance instance)
    {
        return GetVersions(instance.Id);
    }

    public StorageVersionMetadata GetVersions(InstanceIdentifier instanceIdentifier)
    {
        return GetVersions(instanceIdentifier.GetInstanceId());
    }

    public StorageVersionMetadata GetVersions(string instanceId)
    {
        InstanceState state = GetState(instanceId);
        lock (state)
        {
            return state.Versions;
        }
    }

    public string? GetDataElementBlobVersionId(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            return CreateDataElementBlobVersionId(state.GetDataElementVersion(dataGuid));
        }
    }

    public string? GetDataElementBlobVersionIdForContentRead(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            if (_bumpBeforeNextContentRead.TryRemove((instanceIdentifier.GetInstanceId(), dataGuid), out _))
            {
                state.BumpDataElement(dataGuid);
            }

            return CreateDataElementBlobVersionId(state.GetDataElementVersion(dataGuid));
        }
    }

    public StorageVersionMetadata BumpInstance(Instance instance, bool processStateChanged = false)
    {
        return BumpInstance(instance.Id, processStateChanged);
    }

    public StorageVersionMetadata BumpInstance(string instanceId, bool processStateChanged = false)
    {
        InstanceState state = GetState(instanceId);
        lock (state)
        {
            state.InstanceVersion++;
            if (processStateChanged)
            {
                state.ProcessStateVersion++;
            }

            return state.Versions;
        }
    }

    public (StorageVersionMetadata Versions, string? BlobVersionId) BumpDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid
    )
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            state.InstanceVersion++;
            int dataElementVersion = state.BumpDataElement(dataGuid);
            return (state.Versions, CreateDataElementBlobVersionId(dataElementVersion));
        }
    }

    public void RemoveDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            state.DataElementVersions.Remove(dataGuid);
        }
    }

    public StorageVersionMetadata BumpAggregate(
        InstanceIdentifier instanceIdentifier,
        IEnumerable<Guid> changedDataElements,
        IEnumerable<Guid> deletedDataElements,
        bool processStateChanged
    )
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            state.InstanceVersion++;
            if (processStateChanged)
            {
                state.ProcessStateVersion++;
            }

            foreach (Guid dataGuid in changedDataElements)
            {
                state.BumpDataElement(dataGuid);
            }

            foreach (Guid dataGuid in deletedDataElements)
            {
                state.DataElementVersions.Remove(dataGuid);
            }

            _firstAggregateMutation.TrySetResult();
            return state.Versions;
        }
    }

    private InstanceState GetState(string instanceId) => _instances.GetOrAdd(instanceId, _ => new InstanceState());

    private static string? CreateDataElementBlobVersionId(int? version) =>
        version is null ? null : StorageClientInterceptor.CreateBlobVersionId(version.Value);

    private static void ThrowPreconditionFailed(string message) =>
        throw new PlatformHttpException(HttpStatusCode.PreconditionFailed, message);

    private static void ThrowBadRequest(string message) =>
        throw new PlatformHttpException(HttpStatusCode.BadRequest, message);

    private sealed class InstanceState
    {
        public int InstanceVersion { get; set; } = 1;
        public int ProcessStateVersion { get; set; } = 1;
        public Dictionary<Guid, int?> DataElementVersions { get; } = [];

        public StorageVersionMetadata Versions => new(InstanceVersion, ProcessStateVersion);

        public int? GetDataElementVersion(Guid dataGuid)
        {
            if (!DataElementVersions.TryGetValue(dataGuid, out int? version))
            {
                version = 1;
                DataElementVersions[dataGuid] = version;
            }

            return version;
        }

        public int BumpDataElement(Guid dataGuid)
        {
            int version = (GetDataElementVersion(dataGuid) ?? 0) + 1;
            DataElementVersions[dataGuid] = version;
            return version;
        }
    }
}
