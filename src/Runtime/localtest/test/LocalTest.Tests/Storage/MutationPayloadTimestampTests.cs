using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Xunit;
using LocalInstanceMutationRepository = LocalTest.Services.Storage.Implementation.InstanceMutationRepository;

namespace LocalTest.Tests.Storage;

public sealed class MutationPayloadTimestampTests
{
    [Fact]
    public void NormalizePayloadTimestamp_WhenKindIsUnspecified_ReadsTheValueAsUtc()
    {
        DateTime normalized = LocalInstanceMutationRepository.NormalizePayloadTimestamp(
            new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Unspecified)
        );

        Assert.Equal(DateTimeKind.Utc, normalized.Kind);
        Assert.Equal(new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc), normalized);
    }

    [Fact]
    public void NormalizePayloadTimestamp_WhenKindIsLocal_ConvertsToUtc()
    {
        DateTime local = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc).ToLocalTime();

        DateTime normalized = LocalInstanceMutationRepository.NormalizePayloadTimestamp(local);

        Assert.Equal(DateTimeKind.Utc, normalized.Kind);
        Assert.Equal(new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc), normalized);
    }

    [Fact]
    public void NormalizePayloadTimestamp_WhenTicksAreSubMicrosecond_TruncatesToMicroseconds()
    {
        DateTime value = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc).AddTicks(17);

        DateTime normalized = LocalInstanceMutationRepository.NormalizePayloadTimestamp(value);

        Assert.Equal(new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc).AddTicks(10), normalized);
    }

    [Fact]
    public async Task Apply_WhenPayloadCarriesUnnormalizedTimestamps_StoresThemNormalized()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            instanceGuid
        );
        DateTime expected = new(2026, 2, 3, 4, 5, 6, DateTimeKind.Utc);
        DataElement dataElement = new()
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "attachment",
            ContentType = "text/plain",
            Created = DateTime.SpecifyKind(expected, DateTimeKind.Unspecified).AddTicks(3),
            CreatedBy = "creator",
        };

        InstanceMutationApplyResult result = await storage.MutationRepository.Apply(
            instanceGuid,
            instanceInternalId: 0,
            new InstanceMutationCommit(
                CreateDataElements: [dataElement],
                UpdateDataElements: [],
                DeleteDataElements: [],
                InstanceUpdates: new Instance
                {
                    Id = instance.Id,
                    InstanceOwner = instance.InstanceOwner,
                    Org = instance.Org,
                    AppId = instance.AppId,
                    Status = new InstanceStatus { IsArchived = true, Archived = expected.AddTicks(3) },
                },
                InstanceUpdateProperties:
                [
                    nameof(Instance.Status),
                    nameof(InstanceStatus.IsArchived),
                    nameof(InstanceStatus.Archived),
                ],
                ExpectedInstanceVersion: versions.InstanceVersion,
                ExpectedProcessStateVersion: versions.ProcessStateVersion,
                LastChanged: expected.ToLocalTime().AddTicks(3),
                LastChangedBy: "normalizing-actor"
            ),
            CancellationToken.None
        );

        Assert.Equal(expected, result.Instance.LastChanged);
        Assert.Equal(expected, result.Instance.Status.Archived);
        Assert.Equal(expected, Assert.Single(result.Instance.Data).Created);
    }
}
