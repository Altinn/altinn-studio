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

    public int AggregateMutationRequestCount => Volatile.Read(ref _aggregateMutationRequestCount);

    public void RegisterAggregateMutationRequest() => Interlocked.Increment(ref _aggregateMutationRequestCount);

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
