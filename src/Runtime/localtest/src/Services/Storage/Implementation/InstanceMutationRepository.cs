#nullable disable

using System.Net;
using System.Security.Cryptography;
using System.Text;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace LocalTest.Services.Storage.Implementation;

public sealed class InstanceMutationRepository(
    IOptions<LocalPlatformSettings> localPlatformSettings,
    IInstanceRepository instanceRepository,
    IDataRepository dataRepository,
    ILogger<InstanceMutationRepository> logger,
    IInstanceEventRepository instanceEventRepository = null
) : IInstanceMutationRepository
{
    private static readonly PartitionedAsyncLock _aggregateLocks = new PartitionedAsyncLock();
    private static readonly PartitionedAsyncLock _idempotencyKeyLocks = new PartitionedAsyncLock();

    private readonly LocalPlatformSettings _localPlatformSettings = localPlatformSettings.Value;
    private readonly IInstanceRepository _instanceRepository = instanceRepository;
    private readonly IDataRepository _dataRepository = dataRepository;
    private readonly InstanceRepository _localInstanceRepository =
        instanceRepository as InstanceRepository
        ?? throw new InvalidOperationException(
            $"{nameof(InstanceMutationRepository)} requires LocalTest {nameof(InstanceRepository)}."
        );
    private readonly DataRepository _localDataRepository =
        dataRepository as DataRepository
        ?? throw new InvalidOperationException(
            $"{nameof(InstanceMutationRepository)} requires LocalTest {nameof(DataRepository)}."
        );
    private readonly ILogger<InstanceMutationRepository> _logger = logger;
    private readonly IInstanceEventRepository _instanceEventRepository = instanceEventRepository;

    public async Task<InstanceMutationApplyResult> TryReplayAdmission(
        Guid instanceGuid,
        int expectedInstanceVersion,
        int currentInstanceVersion,
        int currentProcessStateVersion,
        string idempotencyKey,
        CancellationToken cancellationToken = default
    )
    {
        using IDisposable aggregateLock = await _aggregateLocks.Lock(instanceGuid.ToString());
        using IDisposable idempotencyKeyLock = await _idempotencyKeyLocks.Lock(idempotencyKey);
        InstanceVersionResult lockedCurrentVersions = await _instanceRepository.ReadVersions(
            instanceGuid,
            cancellationToken
        );

        return await TryReplayIdempotentMutation(
            instanceGuid,
            lockedCurrentVersions,
            expectedInstanceVersion,
            idempotencyKey,
            cancellationToken
        );
    }

    public async Task<InstanceMutationApplyResult> Apply(
        Guid instanceGuid,
        long instanceInternalId,
        InstanceMutationCommit mutation,
        CancellationToken cancellationToken = default
    )
    {
        (DateTime mutationLastChanged, string mutationLastChangedBy) = GetMutationStamp(mutation);
        using IDisposable aggregateLock = await _aggregateLocks.Lock(instanceGuid.ToString());

        if (_instanceEventRepository is null && mutation.InstanceEvents?.Count > 0)
        {
            throw new InvalidOperationException(
                "Instance event repository is required when aggregate mutations include instance events."
            );
        }

        InstanceMutationApplyResult result;
        string idempotencyRecordPath = null;
        IDisposable idempotencyKeyLock = null;

        try
        {
            if (
                !string.IsNullOrWhiteSpace(mutation.IdempotencyKey)
                && mutation.ExpectedInstanceVersion is not null
            )
            {
                idempotencyKeyLock = await _idempotencyKeyLocks.Lock(mutation.IdempotencyKey);
            }

            InstanceVersionResult currentVersions = await _instanceRepository.ReadVersions(
                instanceGuid,
                cancellationToken
            );

            if (
                !string.IsNullOrWhiteSpace(mutation.IdempotencyKey)
                && mutation.ExpectedInstanceVersion is { } previousInstanceVersion
            )
            {
                int producedInstanceVersion = currentVersions.InstanceVersion + 1;
                var freshRecord = new InstanceMutationIdempotencyRecord(
                    instanceGuid,
                    previousInstanceVersion,
                    producedInstanceVersion,
                    GetCreatedDataElementIds(mutation)
                );

                (bool inserted, string path) = await TryWriteIdempotencyRecord(
                    mutation.IdempotencyKey,
                    freshRecord,
                    cancellationToken
                );
                idempotencyRecordPath = inserted ? path : null;
                if (!inserted)
                {
                    return await TryReplayIdempotentMutation(
                        instanceGuid,
                        currentVersions,
                        previousInstanceVersion,
                        mutation.IdempotencyKey,
                        cancellationToken
                    );
                }
            }

            InstanceVersionResult producedVersions;
            if (HasStoredInstanceUpdate(mutation))
            {
                producedVersions = await _localInstanceRepository.RunWithInstanceLock(
                    mutation.InstanceUpdates,
                    () =>
                        ApplyVersionedMutation(
                            instanceGuid,
                            instanceInternalId,
                            mutation,
                            mutationLastChanged,
                            mutationLastChangedBy,
                            instanceLockHeld: true,
                            cancellationToken
                        )
                );
            }
            else
            {
                producedVersions = await ApplyVersionedMutation(
                    instanceGuid,
                    instanceInternalId,
                    mutation,
                    mutationLastChanged,
                    mutationLastChangedBy,
                    instanceLockHeld: false,
                    cancellationToken
                );
            }

            result = await BuildMutationResult(
                replayed: false,
                instanceGuid,
                GetCreatedDataElementIds(mutation),
                producedVersions,
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            if (idempotencyRecordPath is not null && File.Exists(idempotencyRecordPath))
            {
                File.Delete(idempotencyRecordPath);
            }

            _logger.LogError(
                ex,
                "Failed to apply aggregate mutation for instance {InstanceGuid}.",
                instanceGuid
            );
            throw;
        }
        finally
        {
            idempotencyKeyLock?.Dispose();
        }

        return result;
    }

    private static bool HasProcessUpdate(InstanceMutationCommit mutation) =>
        mutation.InstanceUpdateProperties?.Contains(nameof(Instance.Process)) == true;

    private static bool HasInstanceUpdate(InstanceMutationCommit mutation) =>
        mutation.InstanceUpdateProperties?.Count > 0;

    private static bool HasStoredInstanceUpdate(InstanceMutationCommit mutation) =>
        HasInstanceUpdate(mutation)
        || mutation.CreateDataElements?.Count > 0
        || mutation.UpdateDataElements?.Count > 0
        || mutation.DeleteDataElements?.Count > 0
        || HasExplicitMutationStamp(mutation);

    private static bool HasExplicitMutationStamp(InstanceMutationCommit mutation) =>
        mutation.LastChanged is not null
        || mutation.LastChangedBy is not null
        || mutation.InstanceUpdates?.LastChangedBy is not null;

    private async Task<InstanceVersionResult> ApplyVersionedMutation(
        Guid instanceGuid,
        long instanceInternalId,
        InstanceMutationCommit mutation,
        DateTime mutationLastChanged,
        string mutationLastChangedBy,
        bool instanceLockHeld,
        CancellationToken cancellationToken
    )
    {
        return await InstanceVersionMetadataStore.Mutate(
            _localPlatformSettings,
            instanceGuid,
            mutation.ExpectedInstanceVersion,
            mutation.ExpectedProcessStateVersion,
            bumpInstanceVersion: true,
            bumpProcessStateVersion: HasProcessUpdate(mutation),
            async () =>
            {
                await ApplyMutationUnderVersionLock(
                    instanceGuid,
                    instanceInternalId,
                    mutation,
                    mutationLastChanged,
                    mutationLastChangedBy,
                    instanceLockHeld,
                    cancellationToken
                );
            },
            cancellationToken
        );
    }

    private async Task ApplyMutationUnderVersionLock(
        Guid instanceGuid,
        long instanceInternalId,
        InstanceMutationCommit mutation,
        DateTime mutationLastChanged,
        string mutationLastChangedBy,
        bool instanceLockHeld,
        CancellationToken cancellationToken
    )
    {
        MutationSnapshot snapshot = CreateMutationSnapshot(instanceGuid, mutation.InstanceUpdates);

        try
        {
            foreach (DataElement dataElement in mutation.CreateDataElements ?? [])
            {
                StampDataElement(dataElement, mutationLastChanged, mutationLastChangedBy);
                await _localDataRepository.CreateWithoutVersionBump(
                    dataElement,
                    instanceInternalId,
                    cancellationToken
                );
            }

            foreach (InstanceMutationDataElementUpdate update in mutation.UpdateDataElements ?? [])
            {
                StampDataElementUpdate(
                    update.Properties,
                    mutationLastChanged,
                    mutationLastChangedBy
                );
                await _localDataRepository.UpdateWithoutVersionBump(
                    instanceGuid,
                    update.DataElementId,
                    update.Properties,
                    new DataElementUpdateContext
                    {
                        ExpectedCurrentBlobVersion = update.ExpectedCurrentBlobVersion,
                        EnforceLockCheck = update.EnforceLockCheck,
                    },
                    cancellationToken
                );
            }

            foreach (InstanceMutationDataElementDelete delete in mutation.DeleteDataElements ?? [])
            {
                DataElement dataElement = delete.DataElement;
                if (delete.EnforceLockCheck && dataElement.Locked)
                {
                    throw new RepositoryException(
                        $"Data element {dataElement.Id} is locked and cannot be updated or deleted.",
                        HttpStatusCode.Conflict
                    );
                }

                await _localDataRepository.DeleteWithoutVersionBump(dataElement, cancellationToken);
            }

            Instance instanceUpdates = await BuildFullInstanceUpdates(
                instanceGuid,
                mutation,
                mutationLastChanged,
                mutationLastChangedBy,
                instanceLockHeld,
                cancellationToken
            );

            await ApplyInstanceUpdates(
                instanceUpdates,
                mutation,
                mutation.InstanceUpdateProperties ?? [],
                instanceLockHeld,
                cancellationToken
            );

            if (_instanceEventRepository is not null && mutation.InstanceEvents?.Count > 0)
            {
                foreach (InstanceEvent instanceEvent in mutation.InstanceEvents)
                {
                    instanceEvent.Id ??= Guid.NewGuid();
                    instanceEvent.InstanceId ??= instanceUpdates.Id;
                    await _instanceEventRepository.InsertInstanceEvent(
                        instanceEvent,
                        instanceUpdates
                    );
                }
            }
        }
        catch
        {
            RestoreSnapshot(snapshot);
            throw;
        }
        finally
        {
            DeleteSnapshot(snapshot);
        }
    }

    private async Task ApplyInstanceUpdates(
        Instance instanceUpdates,
        InstanceMutationCommit mutation,
        IReadOnlyList<string> updateProperties,
        bool instanceLockHeld,
        CancellationToken cancellationToken
    )
    {
        bool shouldWriteInstanceMetadata = HasStoredInstanceUpdate(mutation);
        if (updateProperties.Count == 0 && !shouldWriteInstanceMetadata)
        {
            return;
        }

        if (!instanceLockHeld)
        {
            throw new InvalidOperationException(
                "Aggregate instance updates require the instance file lock before the version lock."
            );
        }

        ApplyReadStatusTransitions(instanceUpdates, mutation.CreateDataElements ?? []);

        await _localInstanceRepository.UpdateWithoutVersionBumpUnderExistingLock(
            instanceUpdates,
            [.. updateProperties],
            cancellationToken
        );
    }

    private static void ApplyReadStatusTransitions(
        Instance instance,
        IReadOnlyList<DataElement> createdDataElements
    )
    {
        if (instance.Status?.ReadStatus != ReadStatus.Read)
        {
            return;
        }

        if (createdDataElements.Any(dataElement => !dataElement.IsRead))
        {
            instance.Status.ReadStatus = ReadStatus.UpdatedSinceLastReview;
        }
        else if (instance.Data is null || !instance.Data.Any(dataElement => dataElement.IsRead))
        {
            instance.Status.ReadStatus = ReadStatus.Unread;
        }
    }

    private async Task<Instance> BuildFullInstanceUpdates(
        Guid instanceGuid,
        InstanceMutationCommit mutation,
        DateTime mutationLastChanged,
        string mutationLastChangedBy,
        bool instanceLockHeld,
        CancellationToken cancellationToken
    )
    {
        bool shouldWriteInstanceMetadata = HasStoredInstanceUpdate(mutation);
        if (
            (
                mutation.InstanceUpdateProperties is null
                || mutation.InstanceUpdateProperties.Count == 0
            ) && !shouldWriteInstanceMetadata
        )
        {
            return mutation.InstanceUpdates;
        }

        (Instance existingInstance, _) = instanceLockHeld
            ? await _localInstanceRepository.GetOneWithoutLock(
                instanceGuid,
                false,
                cancellationToken
            )
            : await _instanceRepository.GetOne(instanceGuid, false, cancellationToken);
        if (existingInstance is null)
        {
            throw new RepositoryException(
                $"Instance {instanceGuid} was not found.",
                HttpStatusCode.NotFound
            );
        }
        existingInstance.Data = await _localDataRepository.ReadAll(instanceGuid);

        IReadOnlyList<string> updateProperties = mutation.InstanceUpdateProperties ?? [];
        if (updateProperties.Contains(nameof(Instance.PresentationTexts)))
        {
            existingInstance.PresentationTexts = ApplyStringDictionaryPatch(
                existingInstance.PresentationTexts,
                mutation.InstanceUpdates.PresentationTexts
            );
        }

        if (updateProperties.Contains(nameof(Instance.DataValues)))
        {
            existingInstance.DataValues = ApplyStringDictionaryPatch(
                existingInstance.DataValues,
                mutation.InstanceUpdates.DataValues
            );
        }

        if (updateProperties.Contains(nameof(Instance.Process)))
        {
            existingInstance.Process = mutation.ProcessState ?? mutation.InstanceUpdates.Process;
        }

        if (updateProperties.Contains(nameof(Instance.CompleteConfirmations)))
        {
            if (mutation.InstanceUpdates.CompleteConfirmations is { } incomingConfirmations)
            {
                existingInstance.CompleteConfirmations ??= [];
                existingInstance.CompleteConfirmations.AddRange(incomingConfirmations);
            }
        }

        if (updateProperties.Contains(nameof(Instance.Status)))
        {
            existingInstance.Status = ApplyStatusPatch(
                existingInstance.Status,
                mutation.InstanceUpdates.Status,
                updateProperties
            );
        }

        if (updateProperties.Contains(nameof(InstanceStatus.Substatus)))
        {
            existingInstance.Status ??= new InstanceStatus();
            existingInstance.Status.Substatus = mutation.InstanceUpdates.Status?.Substatus;
        }

        if (shouldWriteInstanceMetadata)
        {
            existingInstance.LastChanged = mutationLastChanged;
            existingInstance.LastChangedBy = mutationLastChangedBy;
        }

        return existingInstance;
    }

    private static InstanceStatus ApplyStatusPatch(
        InstanceStatus current,
        InstanceStatus patch,
        IReadOnlyCollection<string> updateProperties
    )
    {
        current ??= new InstanceStatus();
        if (patch is null)
        {
            return current;
        }

        if (updateProperties.Contains(nameof(InstanceStatus.IsArchived)))
        {
            current.IsArchived = patch.IsArchived;
        }

        if (updateProperties.Contains(nameof(InstanceStatus.Archived)))
        {
            current.Archived = patch.Archived;
        }

        if (updateProperties.Contains(nameof(InstanceStatus.IsSoftDeleted)))
        {
            current.IsSoftDeleted = patch.IsSoftDeleted;
        }

        if (updateProperties.Contains(nameof(InstanceStatus.SoftDeleted)))
        {
            current.SoftDeleted = patch.SoftDeleted;
        }

        if (updateProperties.Contains(nameof(InstanceStatus.IsHardDeleted)))
        {
            current.IsHardDeleted = patch.IsHardDeleted;
        }

        if (updateProperties.Contains(nameof(InstanceStatus.HardDeleted)))
        {
            current.HardDeleted = patch.HardDeleted;
        }

        return current;
    }

    private static (DateTime LastChanged, string LastChangedBy) GetMutationStamp(
        InstanceMutationCommit mutation
    ) =>
        (
            mutation.LastChanged ?? DateTime.UtcNow,
            mutation.LastChangedBy ?? mutation.InstanceUpdates?.LastChangedBy
        );

    private static void StampDataElement(
        DataElement dataElement,
        DateTime lastChanged,
        string lastChangedBy
    )
    {
        dataElement.LastChanged = lastChanged;
        dataElement.LastChangedBy = lastChangedBy;
    }

    private static void StampDataElementUpdate(
        Dictionary<string, object> propertyList,
        DateTime lastChanged,
        string lastChangedBy
    )
    {
        propertyList["/lastChanged"] = lastChanged;
        propertyList["/lastChangedBy"] = lastChangedBy;
    }

    private static Dictionary<string, string> ApplyStringDictionaryPatch(
        Dictionary<string, string> current,
        Dictionary<string, string> patch
    )
    {
        current ??= [];

        foreach (KeyValuePair<string, string> entry in patch ?? [])
        {
            if (string.IsNullOrEmpty(entry.Value))
            {
                current.Remove(entry.Key);
            }
            else
            {
                current[entry.Key] = entry.Value;
            }
        }

        return current;
    }

    private static IReadOnlyList<string> GetCreatedDataElementIds(
        InstanceMutationCommit mutation
    ) => [.. (mutation.CreateDataElements ?? []).Select(dataElement => dataElement.Id)];

    private string GetInstancePath(Instance instance) =>
        Path.Combine(GetInstanceFolder() + instance.Id.Replace("/", "_") + ".json");

    private string GetInstanceFolder() =>
        _localPlatformSettings.LocalTestingStorageBasePath
        + _localPlatformSettings.DocumentDbFolder
        + _localPlatformSettings.InstanceCollectionFolder;

    private string GetDataForInstanceFolder(string instanceId) =>
        Path.Combine(GetDataCollectionFolder() + instanceId.Replace("/", "_") + "/");

    private string GetDataCollectionFolder() =>
        _localPlatformSettings.LocalTestingStorageBasePath
        + _localPlatformSettings.DocumentDbFolder
        + _localPlatformSettings.DataCollectionFolder;

    private string GetInstanceEventFolder() =>
        _localPlatformSettings.LocalTestingStorageBasePath
        + _localPlatformSettings.DocumentDbFolder
        + _localPlatformSettings.InstanceEventsCollectionFolder;

    private async Task<InstanceMutationApplyResult> TryReplayIdempotentMutation(
        Guid instanceGuid,
        InstanceVersionResult currentVersions,
        int previousInstanceVersion,
        string idempotencyKey,
        CancellationToken cancellationToken
    )
    {
        InstanceMutationIdempotencyRecord record = await ReadIdempotencyRecord(
            idempotencyKey,
            cancellationToken
        );
        if (record is null)
        {
            await ThrowIfInstanceNotFound(instanceGuid, cancellationToken);
            throw new InstanceVersionMismatchException(
                currentVersions.InstanceVersion,
                currentVersions.ProcessStateVersion
            );
        }

        if (record.InstanceGuid != instanceGuid)
        {
            await ThrowIfInstanceNotFound(instanceGuid, cancellationToken);
            throw new RepositoryException(
                "Idempotency key was already used for another instance.",
                HttpStatusCode.Conflict
            );
        }

        if (
            record.PreviousInstanceVersion != previousInstanceVersion
            || currentVersions.InstanceVersion > record.ProducedInstanceVersion
            || currentVersions.InstanceVersion != record.ProducedInstanceVersion
        )
        {
            await ThrowIfInstanceNotFound(instanceGuid, cancellationToken);
            throw new InstanceVersionMismatchException(
                currentVersions.InstanceVersion,
                currentVersions.ProcessStateVersion
            );
        }

        return await BuildMutationResult(
            replayed: true,
            instanceGuid,
            record.CreatedDataElementIds ?? [],
            currentVersions,
            cancellationToken
        );
    }

    private async Task<InstanceMutationApplyResult> BuildMutationResult(
        bool replayed,
        Guid instanceGuid,
        IReadOnlyList<string> createdDataElementIds,
        InstanceVersionResult versions,
        CancellationToken cancellationToken
    )
    {
        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            true,
            cancellationToken
        );
        if (instance is null)
        {
            throw new RepositoryException(
                $"Instance {instanceGuid} was not found.",
                HttpStatusCode.NotFound
            );
        }

        return replayed
            ? InstanceMutationApplyResult.ReplayWithCreatedDataElementIds(
                createdDataElementIds,
                instance,
                versions
            )
            : new InstanceMutationApplyResult(false, createdDataElementIds, instance, versions);
    }

    private async Task ThrowIfInstanceNotFound(
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        (Instance instance, _) = await _instanceRepository.GetOne(
            instanceGuid,
            false,
            cancellationToken
        );
        if (instance is null)
        {
            throw new RepositoryException(
                $"Instance {instanceGuid} was not found.",
                HttpStatusCode.NotFound
            );
        }
    }

    private async Task<InstanceMutationIdempotencyRecord> ReadIdempotencyRecord(
        string idempotencyKey,
        CancellationToken cancellationToken
    )
    {
        string path = GetIdempotencyRecordPath(idempotencyKey);
        if (!File.Exists(path))
        {
            return null;
        }

        string content = await File.ReadAllTextAsync(path, cancellationToken);
        return JsonConvert.DeserializeObject<InstanceMutationIdempotencyRecord>(content);
    }

    private async Task<(bool Inserted, string Path)> TryWriteIdempotencyRecord(
        string idempotencyKey,
        InstanceMutationIdempotencyRecord record,
        CancellationToken cancellationToken
    )
    {
        string path = GetIdempotencyRecordPath(idempotencyKey);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        try
        {
            await using FileStream stream = new(
                path,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None
            );
            await using StreamWriter writer = new(stream);
            await writer.WriteAsync(
                JsonConvert.SerializeObject(record).AsMemory(),
                cancellationToken
            );
            return (true, path);
        }
        catch (IOException) when (File.Exists(path))
        {
            return (false, path);
        }
    }

    private string GetIdempotencyRecordPath(string idempotencyKey)
    {
        string keyHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey))
        );
        return Path.Combine(GetMutationIdempotencyFolder(), $"{keyHash}.json");
    }

    private string GetMutationIdempotencyFolder() =>
        Path.Combine(
            _localPlatformSettings.LocalTestingStorageBasePath
                + _localPlatformSettings.DocumentDbFolder,
            ".mutationidempotency"
        );

    private MutationSnapshot CreateMutationSnapshot(Guid instanceGuid, Instance instanceUpdates)
    {
        string instancePath = GetInstancePath(instanceUpdates);
        string dataFolder = GetDataForInstanceFolder(instanceGuid.ToString());
        string instanceEventFolder = GetInstanceEventFolder();
        string snapshotRoot = Path.Combine(
            Path.GetTempPath(),
            $"localtest-aggregate-{Guid.NewGuid()}"
        );
        string snapshotInstancePath = Path.Combine(snapshotRoot, "instance.json");
        string snapshotDataFolder = Path.Combine(snapshotRoot, "data");
        string snapshotInstanceEventFolder = Path.Combine(snapshotRoot, "instanceevents");
        bool hadInstanceFile = File.Exists(instancePath);
        bool hadDataFolder = Directory.Exists(dataFolder);
        bool hadInstanceEventFolder = Directory.Exists(instanceEventFolder);

        Directory.CreateDirectory(snapshotRoot);
        if (hadInstanceFile)
        {
            File.Copy(instancePath, snapshotInstancePath);
        }

        if (hadDataFolder)
        {
            CopyDirectory(dataFolder, snapshotDataFolder);
        }

        if (hadInstanceEventFolder)
        {
            CopyDirectory(instanceEventFolder, snapshotInstanceEventFolder);
        }

        return new MutationSnapshot(
            snapshotRoot,
            instancePath,
            dataFolder,
            instanceEventFolder,
            snapshotInstancePath,
            snapshotDataFolder,
            snapshotInstanceEventFolder,
            hadInstanceFile,
            hadDataFolder,
            hadInstanceEventFolder
        );
    }

    private static void RestoreSnapshot(MutationSnapshot snapshot) =>
        RestoreSnapshot(
            snapshot.InstancePath,
            snapshot.DataFolder,
            snapshot.SnapshotInstancePath,
            snapshot.SnapshotDataFolder,
            snapshot.InstanceEventFolder,
            snapshot.SnapshotInstanceEventFolder,
            snapshot.HadInstanceFile,
            snapshot.HadDataFolder,
            snapshot.HadInstanceEventFolder
        );

    private static void DeleteSnapshot(MutationSnapshot snapshot)
    {
        if (Directory.Exists(snapshot.SnapshotRoot))
        {
            Directory.Delete(snapshot.SnapshotRoot, true);
        }
    }

    private static void RestoreSnapshot(
        string instancePath,
        string dataFolder,
        string snapshotInstancePath,
        string snapshotDataFolder,
        string instanceEventFolder,
        string snapshotInstanceEventFolder,
        bool hadInstanceFile,
        bool hadDataFolder,
        bool hadInstanceEventFolder
    )
    {
        if (hadInstanceFile)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(instancePath)!);
            File.Copy(snapshotInstancePath, instancePath, overwrite: true);
        }
        else if (File.Exists(instancePath))
        {
            File.Delete(instancePath);
        }

        if (Directory.Exists(dataFolder))
        {
            Directory.Delete(dataFolder, true);
        }

        if (hadDataFolder)
        {
            CopyDirectory(snapshotDataFolder, dataFolder);
        }

        if (Directory.Exists(instanceEventFolder))
        {
            Directory.Delete(instanceEventFolder, true);
        }

        if (hadInstanceEventFolder)
        {
            CopyDirectory(snapshotInstanceEventFolder, instanceEventFolder);
        }
    }

    private static void CopyDirectory(string source, string destination)
    {
        Directory.CreateDirectory(destination);
        foreach (
            string directory in Directory.GetDirectories(source, "*", SearchOption.AllDirectories)
        )
        {
            Directory.CreateDirectory(
                Path.Combine(destination, Path.GetRelativePath(source, directory))
            );
        }

        foreach (string file in Directory.GetFiles(source, "*", SearchOption.AllDirectories))
        {
            File.Copy(
                file,
                Path.Combine(destination, Path.GetRelativePath(source, file)),
                overwrite: true
            );
        }
    }

    private sealed record InstanceMutationIdempotencyRecord(
        Guid InstanceGuid,
        int PreviousInstanceVersion,
        int ProducedInstanceVersion,
        IReadOnlyList<string> CreatedDataElementIds
    );

    private sealed record MutationSnapshot(
        string SnapshotRoot,
        string InstancePath,
        string DataFolder,
        string InstanceEventFolder,
        string SnapshotInstancePath,
        string SnapshotDataFolder,
        string SnapshotInstanceEventFolder,
        bool HadInstanceFile,
        bool HadDataFolder,
        bool HadInstanceEventFolder
    );
}
