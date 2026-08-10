using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Services.Storage.Implementation;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace LocalTest.Tests.Storage;

public class InstanceMutationResponseContractTests
{
    [Fact]
    public async Task CreateUpdateAndReplay_ResponseSnapshotCarriesBlobVersionId()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        InstanceVersionResult initialVersions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        Guid dataElementId = Guid.NewGuid();
        string createBlobVersion = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        const string idempotencyKey = "content-etag-create";
        var createMutation = new InstanceMutationCommit(
            CreateDataElements:
            [
                new DataElement
                {
                    Id = dataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "attachment",
                    ContentType = "text/plain",
                    BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                        instance.AppId,
                        instanceGuid.ToString(),
                        createBlobVersion
                    ),
                    Created = DateTime.UtcNow,
                    LastChanged = DateTime.UtcNow,
                },
            ],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: MutationInstance(instance),
            InstanceUpdateProperties: [],
            ExpectedInstanceVersion: initialVersions.InstanceVersion,
            ExpectedProcessStateVersion: initialVersions.ProcessStateVersion,
            IdempotencyKey: idempotencyKey
        );

        InstanceMutationApplyResult created = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            createMutation
        );

        AssertSnapshotWireContract(created, createBlobVersion);

        InstanceMutationApplyResult replayed = await storage.MutationRepository.TryReplayAdmission(
            instanceGuid,
            initialVersions.InstanceVersion,
            created.Versions.InstanceVersion,
            created.Versions.ProcessStateVersion,
            idempotencyKey
        );

        Assert.True(replayed.Replayed);
        AssertSnapshotWireContract(replayed, createBlobVersion);

        string updateBlobVersion = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        var updateMutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements:
            [
                new InstanceMutationDataElementUpdate(
                    dataElementId,
                    new Dictionary<string, object>
                    {
                        ["/blobStoragePath"] = BlobRepository.GetVersionedBlobPath(
                            instance.AppId,
                            instanceGuid.ToString(),
                            updateBlobVersion
                        ),
                        ["/currentBlobVersion"] = updateBlobVersion,
                        ["/filename"] = "updated.txt",
                    },
                    createBlobVersion,
                    EnforceLockCheck: true
                ),
            ],
            DeleteDataElements: [],
            InstanceUpdates: MutationInstance(created.Instance),
            InstanceUpdateProperties: [],
            ExpectedInstanceVersion: created.Versions.InstanceVersion,
            ExpectedProcessStateVersion: created.Versions.ProcessStateVersion
        );

        InstanceMutationApplyResult updated = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            updateMutation
        );

        AssertSnapshotWireContract(updated, updateBlobVersion);
    }

    [Fact]
    public async Task Apply_PersistsCommitInstanceEvents_AndReplayAddsNone()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        InstanceVersionResult initialVersions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        Guid dataElementId = Guid.NewGuid();
        string blobVersion = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        const string idempotencyKey = "in-commit-created-event";
        var mutation = new InstanceMutationCommit(
            CreateDataElements:
            [
                new DataElement
                {
                    Id = dataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "attachment",
                    ContentType = "text/plain",
                    BlobStoragePath = BlobRepository.GetVersionedBlobPath(
                        instance.AppId,
                        instanceGuid.ToString(),
                        blobVersion
                    ),
                    Created = DateTime.UtcNow,
                    LastChanged = DateTime.UtcNow,
                },
            ],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: MutationInstance(instance),
            InstanceUpdateProperties: [],
            ExpectedInstanceVersion: initialVersions.InstanceVersion,
            ExpectedProcessStateVersion: initialVersions.ProcessStateVersion,
            InstanceEvents:
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.Created.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                    DataId = dataElementId.ToString(),
                    Created = DateTime.UtcNow,
                },
            ],
            IdempotencyKey: idempotencyKey
        );

        InstanceMutationApplyResult applied = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            mutation
        );

        Assert.False(applied.Replayed);
        InstanceEvent persistedEvent = Assert.Single(
            await storage.InstanceEventRepository.ListInstanceEvents(instance.Id, null, null, null)
        );
        Assert.Equal(InstanceEventType.Created.ToString(), persistedEvent.EventType);
        Assert.Equal(dataElementId.ToString(), persistedEvent.DataId);

        InstanceMutationApplyResult replayed = await storage.MutationRepository.TryReplayAdmission(
            instanceGuid,
            initialVersions.InstanceVersion,
            applied.Versions.InstanceVersion,
            applied.Versions.ProcessStateVersion,
            idempotencyKey
        );

        Assert.True(replayed.Replayed);
        Assert.Single(
            await storage.InstanceEventRepository.ListInstanceEvents(instance.Id, null, null, null)
        );
    }

    [Fact]
    public async Task Apply_VersionMismatch_PersistsNoInstanceEvents()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        InstanceVersionResult initialVersions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        var mutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: MutationInstance(instance),
            InstanceUpdateProperties: [nameof(Instance.PresentationTexts)],
            ExpectedInstanceVersion: initialVersions.InstanceVersion + 1,
            ExpectedProcessStateVersion: initialVersions.ProcessStateVersion,
            InstanceEvents:
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.Saved.ToString(),
                    InstanceId = instance.Id,
                    InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
                    Created = DateTime.UtcNow,
                },
            ]
        );

        await Assert.ThrowsAsync<InstanceVersionMismatchException>(() =>
            storage.MutationRepository.Apply(instanceGuid, instanceInternalId: 0, mutation)
        );

        Assert.Empty(
            await storage.InstanceEventRepository.ListInstanceEvents(instance.Id, null, null, null)
        );
    }

    private static void AssertSnapshotWireContract(
        InstanceMutationApplyResult result,
        string expectedBlobVersionId
    )
    {
        InstanceMutationResponse response = new()
        {
            Instance = result.Instance,
            CreatedDataElementIds = [.. result.CreatedDataElementIds],
            Replayed = result.Replayed,
        };

        JObject json = JObject.Parse(JsonConvert.SerializeObject(response));
        DataElement dataElement = Assert.Single(result.Instance.Data);

        Assert.Equal(response.Instance.Id, json["instance"]?["id"]?.Value<string>());
        Assert.Equal(expectedBlobVersionId, dataElement.BlobVersionId);
        Assert.Equal(
            expectedBlobVersionId,
            json["instance"]?["data"]?[0]?["blobVersionId"]?.Value<string>()
        );
    }

    private static Instance MutationInstance(Instance instance) =>
        new()
        {
            Id = instance.Id,
            InstanceOwner = instance.InstanceOwner,
            Org = instance.Org,
            AppId = instance.AppId,
            Created = instance.Created,
            LastChanged = instance.LastChanged,
            LastChangedBy = instance.LastChangedBy,
        };
}
