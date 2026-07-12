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
    public async Task CreateUpdateAndReplay_ResponseSnapshotCarriesContentEtagWithoutLegacyMap()
    {
        await using var storage = new ContentEtagStorageFixture();
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

        AssertSnapshotWireContract(created, $"\"{createBlobVersion}\"");

        InstanceMutationApplyResult replayed = await storage.MutationRepository.TryReplayAdmission(
            instanceGuid,
            initialVersions.InstanceVersion,
            created.Versions.InstanceVersion,
            created.Versions.ProcessStateVersion,
            idempotencyKey
        );

        Assert.True(replayed.Replayed);
        AssertSnapshotWireContract(replayed, $"\"{createBlobVersion}\"");

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

        AssertSnapshotWireContract(updated, $"\"{updateBlobVersion}\"");
    }

    private static void AssertSnapshotWireContract(
        InstanceMutationApplyResult result,
        string expectedContentEtag
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
        Assert.Equal(expectedContentEtag, dataElement.ContentEtag);
        Assert.Equal(
            expectedContentEtag,
            json["instance"]?["data"]?[0]?["contentEtag"]?.Value<string>()
        );
        Assert.Null(json["dataElementContentEtags"]);
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
