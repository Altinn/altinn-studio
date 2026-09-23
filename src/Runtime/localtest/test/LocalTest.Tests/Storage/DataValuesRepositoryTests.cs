using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataValuesRepositoryTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UpdateDataValues_PatchesOnlyRequestedKeysWithoutVersionBump(
        bool sendPreconditions
    )
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        instance.Process = new ProcessState
        {
            Status = ProcessStatus.Processing,
            CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
        };
        instance.DataValues = new()
        {
            ["preserved"] = "value",
            ["replaced"] = "old",
            ["remove-null"] = "old",
            ["remove-empty"] = "old",
        };
        await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process), nameof(Instance.DataValues)],
            CancellationToken.None
        );
        Guid id = GetGuid(instance);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(id);

        (Instance updated, InstanceVersionResult returnedVersions) =
            await storage.InstanceRepository.UpdateDataValues(
                id,
                new Dictionary<string, string>
                {
                    ["replaced"] = "new",
                    ["dialog.id"] = "dialog-1",
                    ["remove-null"] = null!,
                    ["remove-empty"] = string.Empty,
                },
                CancellationToken.None,
                sendPreconditions ? versions.InstanceVersion : null,
                sendPreconditions ? versions.ProcessStateVersion : null
            );

        Assert.Equal(3, updated.DataValues.Count);
        Assert.Equal("value", updated.DataValues["preserved"]);
        Assert.Equal("new", updated.DataValues["replaced"]);
        Assert.Equal("dialog-1", updated.DataValues["dialog.id"]);
        Assert.Equal(ProcessStatus.Processing, updated.Process.Status);
        Assert.Equal("Task_1", updated.Process.CurrentTask.ElementId);
        Assert.Equal(instance.LastChanged, updated.LastChanged);
        Assert.Equal(instance.LastChangedBy, updated.LastChangedBy);
        Assert.Equal(versions, returnedVersions);
        Assert.Equal(versions, await storage.InstanceRepository.ReadVersions(id));
        (Instance persisted, _) = await storage.InstanceRepository.GetOne(
            id,
            true,
            CancellationToken.None
        );
        Assert.Equal(updated.ToString(), persisted.ToString());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UpdateDataValues_StalePreconditionWhileProcessing_RejectsWithoutMutation(
        bool instanceVersion
    )
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        instance.Process = new ProcessState { Status = ProcessStatus.Processing };
        await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process)],
            CancellationToken.None
        );
        Guid id = GetGuid(instance);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(id);

        StorageVersionMismatchException exception =
            await Assert.ThrowsAnyAsync<StorageVersionMismatchException>(() =>
                storage.InstanceRepository.UpdateDataValues(
                    id,
                    new Dictionary<string, string> { ["dialog.id"] = "not-applied" },
                    CancellationToken.None,
                    instanceVersion ? 0 : null,
                    instanceVersion ? null : 0
                )
            );

        Assert.IsType(
            instanceVersion
                ? typeof(InstanceVersionMismatchException)
                : typeof(ProcessStateVersionMismatchException),
            exception
        );
        (Instance persisted, _) = await storage.InstanceRepository.GetOne(
            id,
            true,
            CancellationToken.None
        );
        Assert.Equal(instance.ToString(), persisted.ToString());
        Assert.Equal(versions, await storage.InstanceRepository.ReadVersions(id));
    }

    [Fact]
    public async Task Update_StaleSnapshotForPresentationTexts_PreservesDataValuesPatch()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid id = GetGuid(instance);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(id);

        await storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["dialog.id"] = "dialog-1" },
            CancellationToken.None
        );
        instance.PresentationTexts = new() { ["title"] = "Updated title" };
        Instance updated = await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.PresentationTexts)],
            CancellationToken.None,
            versions.InstanceVersion,
            versions.ProcessStateVersion
        );

        Assert.Equal("dialog-1", updated.DataValues?["dialog.id"]);
        Assert.Equal("Updated title", updated.PresentationTexts["title"]);
        (Instance persisted, _) = await storage.InstanceRepository.GetOne(
            id,
            false,
            CancellationToken.None
        );
        Assert.Equal("dialog-1", persisted.DataValues?["dialog.id"]);
        Assert.Equal("Updated title", persisted.PresentationTexts["title"]);
        Assert.Equal(
            new InstanceVersionResult(versions.InstanceVersion + 1, versions.ProcessStateVersion),
            await storage.InstanceRepository.ReadVersions(id)
        );
    }

    [Fact]
    public async Task UpdateDataValues_WithDataElements_DoesNotPersistDerivedInstanceFields()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        instance.Status.ReadStatus = ReadStatus.Read;
        await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Status)],
            CancellationToken.None
        );
        Guid id = GetGuid(instance);
        var element = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = id.ToString(),
            DataType = "attachment",
            Created = instance.LastChanged!.Value.AddHours(1),
            LastChanged = instance.LastChanged.Value.AddHours(1),
            LastChangedBy = "data-actor",
            IsRead = false,
        };
        await storage.DataRepository.Create(element);

        (Instance updated, _) = await storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["dialog.id"] = "dialog-1" },
            CancellationToken.None
        );

        Assert.Equal(element.Id, Assert.Single(updated.Data).Id);
        Assert.Equal(element.LastChanged, updated.LastChanged);
        Assert.Equal(element.LastChangedBy, updated.LastChangedBy);
        Assert.Equal(ReadStatus.UpdatedSinceLastReview, updated.Status.ReadStatus);
        (Instance persisted, _) = await storage.InstanceRepository.GetOne(
            id,
            false,
            CancellationToken.None
        );
        Assert.Equal("dialog-1", persisted.DataValues["dialog.id"]);
        Assert.Equal(instance.LastChanged, persisted.LastChanged);
        Assert.Equal(instance.LastChangedBy, persisted.LastChangedBy);
        Assert.Equal(ReadStatus.Read, persisted.Status.ReadStatus);
    }

    [Fact]
    public async Task UpdateDataValues_BetweenMutations_ApplyAndReplayReturnCurrentDataValues()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        instance.Process = new ProcessState
        {
            CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
        };
        await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process)],
            CancellationToken.None
        );
        Guid id = GetGuid(instance);
        InstanceVersionResult initialVersions = await storage.InstanceRepository.ReadVersions(id);

        await storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["dialog.id"] = "dialog-1" },
            CancellationToken.None
        );
        instance.Process.Status = ProcessStatus.Processing;
        var processMutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: instance,
            InstanceUpdateProperties: [nameof(Instance.Process)],
            ExpectedInstanceVersion: initialVersions.InstanceVersion,
            ExpectedProcessStateVersion: initialVersions.ProcessStateVersion,
            IdempotencyKey: Guid.NewGuid().ToString()
        );
        InstanceMutationApplyResult processResult = await storage.MutationRepository.Apply(
            id,
            0,
            processMutation
        );
        Assert.Equal("dialog-1", processResult.Instance.DataValues["dialog.id"]);
        InstanceVersionResult processVersions = await storage.InstanceRepository.ReadVersions(id);
        Assert.Equal(initialVersions.InstanceVersion + 1, processVersions.InstanceVersion);

        await storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["dialog.id"] = "dialog-2" },
            CancellationToken.None
        );
        var dataValuesMutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: new Instance
            {
                Id = instance.Id,
                InstanceOwner = instance.InstanceOwner,
                DataValues = new() { ["case.number"] = "42" },
            },
            InstanceUpdateProperties: [nameof(Instance.DataValues)],
            ExpectedInstanceVersion: processVersions.InstanceVersion,
            ExpectedProcessStateVersion: processVersions.ProcessStateVersion,
            IdempotencyKey: Guid.NewGuid().ToString()
        );
        InstanceMutationApplyResult dataValuesResult = await storage.MutationRepository.Apply(
            id,
            0,
            dataValuesMutation
        );
        Assert.Equal("dialog-2", dataValuesResult.Instance.DataValues["dialog.id"]);
        Assert.Equal("42", dataValuesResult.Instance.DataValues["case.number"]);
        Assert.Equal(ProcessStatus.Processing, dataValuesResult.Instance.Process.Status);
        Assert.Equal("Task_1", dataValuesResult.Instance.Process.CurrentTask.ElementId);
        InstanceVersionResult dataValuesVersions = await storage.InstanceRepository.ReadVersions(
            id
        );
        Assert.Equal(processVersions.InstanceVersion + 1, dataValuesVersions.InstanceVersion);
        Assert.Equal(processVersions.ProcessStateVersion, dataValuesVersions.ProcessStateVersion);

        await storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["dialog.id"] = "dialog-3" },
            CancellationToken.None
        );
        InstanceMutationApplyResult replay = await storage.MutationRepository.Apply(
            id,
            0,
            dataValuesMutation
        );
        Assert.True(replay.Replayed);
        Assert.Equal("dialog-3", replay.Instance.DataValues["dialog.id"]);
    }

    [Fact]
    public async Task UpdateDataValues_ConcurrentPatchesWithSameVersions_PreserveBothChanges()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid id = GetGuid(instance);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(id);
        TaskCompletionSource entered = new(TaskCreationOptions.RunContinuationsAsynchronously);
        TaskCompletionSource release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        Task gate = storage.InstanceRepository.RunWithInstanceLock(
            instance,
            async () =>
            {
                entered.SetResult();
                await release.Task;
                return true;
            }
        );
        await entered.Task;
        var first = storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["first"] = "one" },
            CancellationToken.None,
            versions.InstanceVersion,
            versions.ProcessStateVersion
        );
        var second = storage.InstanceRepository.UpdateDataValues(
            id,
            new Dictionary<string, string> { ["second"] = "two" },
            CancellationToken.None,
            versions.InstanceVersion,
            versions.ProcessStateVersion
        );
        release.SetResult();
        await Task.WhenAll(gate, first, second);

        (Instance persisted, _) = await storage.InstanceRepository.GetOne(
            id,
            true,
            CancellationToken.None
        );
        Assert.Equal("one", persisted.DataValues["first"]);
        Assert.Equal("two", persisted.DataValues["second"]);
        Assert.Equal(versions, await storage.InstanceRepository.ReadVersions(id));
    }

    private static Guid GetGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);
}
