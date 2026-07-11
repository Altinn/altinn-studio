using System.Collections.Concurrent;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Tests.Mocks;

internal sealed class ApiTestStorageMetadata
{
    private readonly ConcurrentDictionary<string, InstanceState> _instances = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<(string InstanceId, Guid DataElementId), byte> _bumpBeforeNextContentRead =
        new();

    public void BumpDataElementBeforeNextContentRead(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        _bumpBeforeNextContentRead[(instanceIdentifier.GetInstanceId(), dataGuid)] = 0;
    }

    public StorageVersionMetadata RegisterLoadedInstance(Instance instance)
    {
        StorageVersionMetadata metadata = GetVersions(instance);
        InstanceStorageMetadataRegistry.Set(instance, metadata);
        return metadata;
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

    public StorageDataElementMetadata GetDataElementMetadata(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            return new StorageDataElementMetadata(CreateDataElementETag(state.GetDataElementVersion(dataGuid)));
        }
    }

    public StorageDataElementMetadata GetDataElementMetadataForContentRead(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid
    )
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            if (_bumpBeforeNextContentRead.TryRemove((instanceIdentifier.GetInstanceId(), dataGuid), out _))
            {
                state.BumpDataElement(dataGuid);
            }

            return new StorageDataElementMetadata(CreateDataElementETag(state.GetDataElementVersion(dataGuid)));
        }
    }

    public StorageVersionMetadata BumpInstance(Instance instance, bool processStateChanged = false)
    {
        StorageVersionMetadata metadata = BumpInstance(instance.Id, processStateChanged);
        InstanceStorageMetadataRegistry.Set(instance, metadata);
        return metadata;
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

    public (StorageVersionMetadata Versions, StorageDataElementMetadata DataElement) BumpDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid
    )
    {
        InstanceState state = GetState(instanceIdentifier.GetInstanceId());
        lock (state)
        {
            state.InstanceVersion++;
            int dataElementVersion = state.BumpDataElement(dataGuid);
            return (state.Versions, new StorageDataElementMetadata(CreateDataElementETag(dataElementVersion)));
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

    public (
        StorageVersionMetadata Versions,
        IReadOnlyDictionary<string, StorageDataElementMetadata> DataElements
    ) BumpAggregate(
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

            Dictionary<string, StorageDataElementMetadata> dataElementMetadata = new(StringComparer.Ordinal);
            foreach (Guid dataGuid in changedDataElements)
            {
                int version = state.BumpDataElement(dataGuid);
                dataElementMetadata[dataGuid.ToString()] = new StorageDataElementMetadata(
                    CreateDataElementETag(version)
                );
            }

            foreach (Guid dataGuid in deletedDataElements)
            {
                state.DataElementVersions.Remove(dataGuid);
            }

            return (state.Versions, dataElementMetadata);
        }
    }

    private InstanceState GetState(string instanceId) => _instances.GetOrAdd(instanceId, _ => new InstanceState());

    private static string CreateDataElementETag(int version) => $"\"{version}\"";

    private sealed class InstanceState
    {
        public int InstanceVersion { get; set; } = 1;
        public int ProcessStateVersion { get; set; } = 1;
        public Dictionary<Guid, int> DataElementVersions { get; } = [];

        public StorageVersionMetadata Versions => new(InstanceVersion, ProcessStateVersion);

        public int GetDataElementVersion(Guid dataGuid)
        {
            if (!DataElementVersions.TryGetValue(dataGuid, out int version))
            {
                version = 1;
                DataElementVersions[dataGuid] = version;
            }

            return version;
        }

        public int BumpDataElement(Guid dataGuid)
        {
            int version = GetDataElementVersion(dataGuid) + 1;
            DataElementVersions[dataGuid] = version;
            return version;
        }
    }
}
