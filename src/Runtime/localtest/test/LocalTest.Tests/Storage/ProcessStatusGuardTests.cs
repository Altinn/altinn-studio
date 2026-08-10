using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Xunit;

namespace LocalTest.Tests.Storage;

public class ProcessStatusGuardTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData(null, ProcessStatus.Idle)]
    [InlineData(ProcessStatus.Idle, null)]
    [InlineData(ProcessStatus.Idle, ProcessStatus.Idle)]
    [InlineData(ProcessStatus.Processing, ProcessStatus.Processing)]
    public void EnsureExpectedStatus_WhenStatusMatches_DoesNotThrow(
        ProcessStatus? currentStatus,
        ProcessStatus? expectedStatus
    )
    {
        Instance instance = InstanceWithStatus(currentStatus);

        ProcessStatusHelper.EnsureExpectedStatus(instance, expectedStatus);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing, null, "processing")]
    [InlineData(ProcessStatus.Processing, ProcessStatus.Idle, "processing")]
    [InlineData(ProcessStatus.Idle, ProcessStatus.Processing, "idle")]
    [InlineData(null, ProcessStatus.Processing, "idle")]
    public void EnsureExpectedStatus_WhenStatusDiffers_ThrowsWithCurrentStatus(
        ProcessStatus? currentStatus,
        ProcessStatus? expectedStatus,
        string expectedWireStatus
    )
    {
        Instance instance = InstanceWithStatus(currentStatus);

        ProcessStatusConflictException exception =
            Assert.Throws<ProcessStatusConflictException>(() =>
                ProcessStatusHelper.EnsureExpectedStatus(instance, expectedStatus)
            );

        Assert.Equal(
            $"Process status did not match expected status. Current status: '{expectedWireStatus}'.",
            exception.Message
        );
    }

    [Fact]
    public void EnsureExpectedStatus_WithoutProcess_TreatsInstanceAsIdle()
    {
        Instance instance = new();

        ProcessStatusHelper.EnsureExpectedStatus(instance);
    }

    [Fact]
    public async Task Apply_WhenProcessingWithoutVersionFence_ThrowsProcessStatusConflict()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await CreateProcessingInstance(storage);
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);

        await Assert.ThrowsAsync<ProcessStatusConflictException>(() =>
            storage.MutationRepository.Apply(
                instanceGuid,
                instanceInternalId: 0,
                UnfencedDataValuesMutation(instance, expectedInstanceVersion: null)
            )
        );
    }

    [Fact]
    public async Task Apply_WhenProcessingWithVersionFence_SkipsTheStatusBackstop()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await CreateProcessingInstance(storage);
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );

        InstanceMutationApplyResult result = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            UnfencedDataValuesMutation(instance, versions.InstanceVersion)
        );

        Assert.False(result.Replayed);
        Assert.Equal("value", result.Instance.DataValues["key"]);
    }

    private static Instance InstanceWithStatus(ProcessStatus? status) =>
        new() { Process = new ProcessState { Status = status } };

    private static InstanceMutationCommit UnfencedDataValuesMutation(
        Instance instance,
        int? expectedInstanceVersion
    ) =>
        new(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: new Instance
            {
                Id = instance.Id,
                InstanceOwner = instance.InstanceOwner,
                Org = instance.Org,
                AppId = instance.AppId,
                Created = instance.Created,
                Process = instance.Process,
                Status = instance.Status,
                DataValues = new Dictionary<string, string> { ["key"] = "value" },
            },
            InstanceUpdateProperties: [nameof(Instance.DataValues)],
            ExpectedInstanceVersion: expectedInstanceVersion,
            ExpectedProcessStateVersion: null
        );

    private static async Task<Instance> CreateProcessingInstance(LocalStorageFixture storage)
    {
        Instance instance = await storage.CreateInstance();
        instance.Process = new ProcessState
        {
            Status = ProcessStatus.Processing,
            CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
        };
        return await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process)],
            CancellationToken.None
        );
    }
}
