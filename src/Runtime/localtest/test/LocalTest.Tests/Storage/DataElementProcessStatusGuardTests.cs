using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataElementProcessStatusGuardTests
{
    [Fact]
    public async Task Create_WhenProcessing_ThrowsProcessStatusConflict()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, Guid instanceGuid) = await CreateProcessingInstance(storage);
        Guid dataElementId = Guid.NewGuid();

        ProcessStatusConflictException exception =
            await Assert.ThrowsAsync<ProcessStatusConflictException>(() =>
                storage.DataRepository.Create(
                    CreateDataElement(instance, instanceGuid, dataElementId, locked: false)
                )
            );

        Assert.Equal(ProcessStatus.Processing, exception.CurrentProcessStatus);
        Assert.Empty(await storage.DataRepository.ReadAll(instanceGuid));
    }

    [Fact]
    public async Task Create_WhenVersionMismatchAndProcessing_ReportsTheVersionMismatch()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, Guid instanceGuid) = await CreateProcessingInstance(storage);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );

        await Assert.ThrowsAsync<InstanceVersionMismatchException>(() =>
            storage.DataRepository.Create(
                CreateDataElement(instance, instanceGuid, Guid.NewGuid(), locked: false),
                expectedInstanceVersion: versions.InstanceVersion + 1
            )
        );
    }

    [Fact]
    public async Task Update_WhenProcessing_ThrowsProcessStatusConflict()
    {
        await using var storage = new LocalStorageFixture();
        (_, Guid instanceGuid, Guid dataElementId) = await SeedDataElement(storage, locked: false);

        ProcessStatusConflictException exception =
            await Assert.ThrowsAsync<ProcessStatusConflictException>(() =>
                storage.DataRepository.Update(
                    instanceGuid,
                    dataElementId,
                    new Dictionary<string, object> { ["/contentType"] = "text/markdown" }
                )
            );

        Assert.Equal(ProcessStatus.Processing, exception.CurrentProcessStatus);
        DataElement stored = await storage.DataRepository.Read(instanceGuid, dataElementId);
        Assert.Equal("text/plain", stored.ContentType);
    }

    // updatedataelement_v3 compares the lock before the process status, so a locked element
    // during processing reports 'locked' rather than 'process_status_conflict'.
    [Fact]
    public async Task Update_WhenLockedAndProcessing_ReportsLockedRatherThanTheStatusConflict()
    {
        await using var storage = new LocalStorageFixture();
        (_, Guid instanceGuid, Guid dataElementId) = await SeedDataElement(storage, locked: true);

        RepositoryException exception = await Assert.ThrowsAsync<RepositoryException>(() =>
            storage.DataRepository.Update(
                instanceGuid,
                dataElementId,
                new Dictionary<string, object> { ["/contentType"] = "text/markdown" },
                new DataElementUpdateContext { IgnoreLock = false }
            )
        );

        Assert.Contains("locked", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateLockStatus_WhenProcessing_ThrowsProcessStatusConflict()
    {
        await using var storage = new LocalStorageFixture();
        (_, Guid instanceGuid, Guid dataElementId) = await SeedDataElement(storage, locked: false);

        ProcessStatusConflictException exception =
            await Assert.ThrowsAsync<ProcessStatusConflictException>(() =>
                storage.DataRepository.UpdateLockStatus(instanceGuid, dataElementId, true)
            );

        Assert.Equal(ProcessStatus.Processing, exception.CurrentProcessStatus);
        DataElement stored = await storage.DataRepository.Read(instanceGuid, dataElementId);
        Assert.False(stored.Locked);
    }

    // updatedataelement_lockstatus resolves the data element before comparing the process status.
    [Fact]
    public async Task UpdateLockStatus_WhenTheElementIsMissingAndProcessing_ReportsNotFound()
    {
        await using var storage = new LocalStorageFixture();
        (_, Guid instanceGuid) = await CreateProcessingInstance(storage);

        RepositoryException exception = await Assert.ThrowsAsync<RepositoryException>(() =>
            storage.DataRepository.UpdateLockStatus(instanceGuid, Guid.NewGuid(), true)
        );

        Assert.IsNotType<ProcessStatusConflictException>(exception);
    }

    [Fact]
    public async Task UpdateReadStatusAndFileScanStatus_WhenProcessing_RemainUnguarded()
    {
        await using var storage = new LocalStorageFixture();
        (_, Guid instanceGuid, Guid dataElementId) = await SeedDataElement(storage, locked: false);

        await storage.DataRepository.UpdateReadStatus(instanceGuid, dataElementId, true);
        await storage.DataRepository.UpdateFileScanStatus(
            instanceGuid,
            dataElementId,
            new FileScanStatus { FileScanResult = FileScanResult.Clean }
        );

        DataElement stored = await storage.DataRepository.Read(instanceGuid, dataElementId);
        Assert.True(stored.IsRead);
        Assert.Equal(FileScanResult.Clean, stored.FileScanResult);
    }

    private static async Task<(Instance Instance, Guid InstanceGuid)> CreateProcessingInstance(
        LocalStorageFixture storage
    )
    {
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        instance.Process = new ProcessState
        {
            Status = ProcessStatus.Processing,
            CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
        };
        instance = await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process)],
            CancellationToken.None
        );
        return (instance, instanceGuid);
    }

    private static async Task<(
        Instance Instance,
        Guid InstanceGuid,
        Guid DataElementId
    )> SeedDataElement(LocalStorageFixture storage, bool locked)
    {
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        await storage.DataRepository.Create(
            CreateDataElement(instance, instanceGuid, dataElementId, locked)
        );

        instance.Process = new ProcessState
        {
            Status = ProcessStatus.Processing,
            CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
        };
        instance = await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process)],
            CancellationToken.None
        );
        return (instance, instanceGuid, dataElementId);
    }

    private static DataElement CreateDataElement(
        Instance instance,
        Guid instanceGuid,
        Guid dataElementId,
        bool locked
    ) =>
        new()
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "attachment",
            ContentType = "text/plain",
            BlobStoragePath = DataElementHelper.DataFileName(
                instance.AppId,
                instanceGuid.ToString(),
                dataElementId.ToString()
            ),
            Locked = locked,
            Created = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
            LastChanged = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
        };
}
