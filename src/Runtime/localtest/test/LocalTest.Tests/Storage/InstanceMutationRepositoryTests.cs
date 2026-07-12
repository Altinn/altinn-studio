using System.Net;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class InstanceMutationRepositoryTests
{
    [Fact]
    public async Task Apply_WhenCompleteConfirmationsAreUpdated_AppendsIncomingConfirmations()
    {
        await using var storage = new LocalStorageFixture();
        DateTime existingConfirmedOn = new(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc);
        DateTime incomingConfirmedOn = new(2026, 1, 3, 3, 4, 5, DateTimeKind.Utc);
        DateTime mutationLastChanged = new(2026, 1, 4, 3, 4, 5, DateTimeKind.Utc);
        Instance instance = await storage.InstanceRepository.Create(
            CreateInstance(
                lastChanged: new DateTime(2026, 1, 1, 3, 4, 5, DateTimeKind.Utc),
                lastChangedBy: "seed-actor",
                completeConfirmations:
                [
                    new CompleteConfirmation
                    {
                        StakeholderId = "existing-org",
                        ConfirmedOn = existingConfirmedOn,
                    },
                ]
            ),
            CancellationToken.None
        );
        Guid instanceGuid = GetInstanceGuid(instance);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );

        var incomingConfirmation = new CompleteConfirmation
        {
            StakeholderId = "incoming-org",
            ConfirmedOn = incomingConfirmedOn,
        };
        Instance instanceUpdates = CreateMutationInstance(
            instance,
            mutationLastChanged,
            "append-actor"
        );
        instanceUpdates.CompleteConfirmations = [incomingConfirmation];
        var mutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: instanceUpdates,
            InstanceUpdateProperties: [nameof(Instance.CompleteConfirmations)],
            ExpectedInstanceVersion: versions.InstanceVersion,
            ExpectedProcessStateVersion: versions.ProcessStateVersion,
            LastChanged: mutationLastChanged,
            LastChangedBy: "append-actor"
        );

        InstanceMutationApplyResult result = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            mutation,
            CancellationToken.None
        );

        List<CompleteConfirmation> confirmations =
        [
            .. result.Instance.CompleteConfirmations.OrderBy(c => c.StakeholderId),
        ];
        Assert.Collection(
            confirmations,
            confirmation =>
            {
                Assert.Equal("existing-org", confirmation.StakeholderId);
                Assert.Equal(existingConfirmedOn, confirmation.ConfirmedOn);
            },
            confirmation =>
            {
                Assert.Equal("incoming-org", confirmation.StakeholderId);
                Assert.Equal(incomingConfirmedOn, confirmation.ConfirmedOn);
            }
        );
        Assert.Equal(mutationLastChanged, result.Instance.LastChanged);
        Assert.Equal("append-actor", result.Instance.LastChangedBy);
    }

    [Fact]
    public async Task Apply_WhenDataElementOnlyMutationHasOldInstanceTimestamp_StampsInstanceAndElementWithFreshDefaultedStamp()
    {
        await using var storage = new LocalStorageFixture();
        DateTime oldInstanceLastChanged = new(2026, 1, 1, 3, 4, 5, DateTimeKind.Utc);
        Instance instance = await storage.InstanceRepository.Create(
            CreateInstance(lastChanged: oldInstanceLastChanged, lastChangedBy: null),
            CancellationToken.None
        );
        Guid instanceGuid = GetInstanceGuid(instance);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        Guid dataElementId = Guid.NewGuid();
        DateTime payloadCreated = new(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc);
        DateTime payloadLastChanged = new(2026, 1, 3, 3, 4, 5, DateTimeKind.Utc);
        var dataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "attachment",
            ContentType = "text/plain",
            Created = payloadCreated,
            CreatedBy = "creator",
            LastChanged = payloadLastChanged,
            LastChangedBy = "payload-actor",
        };
        var mutation = new InstanceMutationCommit(
            CreateDataElements: [dataElement],
            UpdateDataElements: [],
            DeleteDataElements: [],
            InstanceUpdates: CreateMutationInstance(
                instance,
                oldInstanceLastChanged,
                lastChangedBy: null
            ),
            InstanceUpdateProperties: [],
            ExpectedInstanceVersion: versions.InstanceVersion,
            ExpectedProcessStateVersion: versions.ProcessStateVersion,
            LastChanged: null,
            LastChangedBy: null
        );
        DateTime lowerBound = DateTime.UtcNow.AddSeconds(-1);

        InstanceMutationApplyResult result = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            mutation,
            CancellationToken.None
        );

        DateTime upperBound = DateTime.UtcNow.AddSeconds(1);
        DataElement createdDataElement = Assert.Single(result.Instance.Data);
        Assert.NotEqual(payloadLastChanged, createdDataElement.LastChanged);
        Assert.True(result.Instance.LastChanged > oldInstanceLastChanged);
        Assert.InRange(result.Instance.LastChanged!.Value, lowerBound, upperBound);
        Assert.Equal(result.Instance.LastChanged, createdDataElement.LastChanged);
        Assert.Null(result.Instance.LastChangedBy);
        Assert.Null(createdDataElement.LastChangedBy);
        Assert.Equal(payloadCreated, createdDataElement.Created);
        Assert.Equal("creator", createdDataElement.CreatedBy);
    }

    [Fact]
    public async Task Apply_WhenLockedDataElementDeleteEnforcesLock_ThrowsConflict()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.InstanceRepository.Create(
            CreateInstance(
                lastChanged: new DateTime(2026, 1, 1, 3, 4, 5, DateTimeKind.Utc),
                lastChangedBy: "seed-actor"
            ),
            CancellationToken.None
        );
        Guid instanceGuid = GetInstanceGuid(instance);
        DataElement dataElement = (
            await storage.DataRepository.Create(
                CreateDataElement(instanceGuid, locked: true),
                cancellationToken: CancellationToken.None
            )
        ).DataElement;
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        var mutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [new InstanceMutationDataElementDelete(dataElement, true)],
            InstanceUpdates: CreateMutationInstance(instance, instance.LastChanged, "delete-actor"),
            InstanceUpdateProperties: [],
            ExpectedInstanceVersion: versions.InstanceVersion,
            ExpectedProcessStateVersion: versions.ProcessStateVersion,
            LastChanged: instance.LastChanged,
            LastChangedBy: "delete-actor"
        );

        RepositoryException exception = await Assert.ThrowsAsync<RepositoryException>(() =>
            storage.MutationRepository.Apply(instanceGuid, instanceInternalId: 0, mutation)
        );

        Assert.Equal(HttpStatusCode.Conflict, exception.StatusCodeSuggestion);
        Assert.Contains(dataElement.Id, exception.Message, StringComparison.Ordinal);
        DataElement stored = await storage.DataRepository.Read(
            instanceGuid,
            Guid.Parse(dataElement.Id)
        );
        Assert.True(stored.Locked);
    }

    [Fact]
    public async Task Apply_WhenLockedDataElementDeleteIgnoresLock_Deletes()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.InstanceRepository.Create(
            CreateInstance(
                lastChanged: new DateTime(2026, 1, 1, 3, 4, 5, DateTimeKind.Utc),
                lastChangedBy: "seed-actor"
            ),
            CancellationToken.None
        );
        Guid instanceGuid = GetInstanceGuid(instance);
        DataElement dataElement = (
            await storage.DataRepository.Create(
                CreateDataElement(instanceGuid, locked: true),
                cancellationToken: CancellationToken.None
            )
        ).DataElement;
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        var mutation = new InstanceMutationCommit(
            CreateDataElements: [],
            UpdateDataElements: [],
            DeleteDataElements: [new InstanceMutationDataElementDelete(dataElement, false)],
            InstanceUpdates: CreateMutationInstance(instance, instance.LastChanged, "delete-actor"),
            InstanceUpdateProperties: [],
            ExpectedInstanceVersion: versions.InstanceVersion,
            ExpectedProcessStateVersion: versions.ProcessStateVersion,
            LastChanged: instance.LastChanged,
            LastChangedBy: "delete-actor"
        );

        InstanceMutationApplyResult result = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            mutation
        );

        Assert.DoesNotContain(result.Instance.Data ?? [], element => element.Id == dataElement.Id);
    }

    private static Instance CreateInstance(
        DateTime lastChanged,
        string? lastChangedBy,
        List<CompleteConfirmation>? completeConfirmations = null
    ) =>
        new()
        {
            InstanceOwner = new InstanceOwner { PartyId = "501337" },
            Org = "ttd",
            AppId = "ttd/localtest-repository-tests",
            Created = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = new InstanceStatus(),
            LastChanged = lastChanged,
            LastChangedBy = lastChangedBy,
            CompleteConfirmations = completeConfirmations,
        };

    private static Instance CreateMutationInstance(
        Instance instance,
        DateTime? lastChanged,
        string? lastChangedBy
    ) =>
        new()
        {
            Id = instance.Id,
            InstanceOwner = instance.InstanceOwner,
            Org = instance.Org,
            AppId = instance.AppId,
            Created = instance.Created,
            LastChanged = lastChanged,
            LastChangedBy = lastChangedBy,
        };

    private static DataElement CreateDataElement(Guid instanceGuid, bool locked) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "attachment",
            ContentType = "text/plain",
            Created = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
            CreatedBy = "creator",
            LastChanged = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
            LastChangedBy = "creator",
            Locked = locked,
        };

    private static Guid GetInstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);
}
