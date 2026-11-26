using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Mocks;

namespace Altinn.App.Api.Tests.Mocks;

public sealed class ApiTestStorageMetadataTests
{
    [Fact]
    public void GetDataElementBlobVersionId_DefaultsNormalElementToVersionOne()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        Guid dataId = Guid.NewGuid();

        string? actual = metadata.GetDataElementBlobVersionId(instanceIdentifier, dataId);

        Assert.Equal(StorageClientInterceptor.CreateBlobVersionId(1), actual);
    }

    [Fact]
    public void GetDataElementBlobVersionId_PreservesExplicitVersion()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        Guid dataId = Guid.NewGuid();
        metadata.SetDataElementBlobVersion(instanceIdentifier, dataId, 7);

        string? actual = metadata.GetDataElementBlobVersionId(instanceIdentifier, dataId);

        Assert.Equal(StorageClientInterceptor.CreateBlobVersionId(7), actual);
    }

    [Fact]
    public void BumpDataElement_WhenElementHasNoBlobVersion_CreatesVersionOne()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        Guid dataId = Guid.NewGuid();
        metadata.SetDataElementWithoutBlobVersion(instanceIdentifier, dataId);

        Assert.Null(metadata.GetDataElementBlobVersionId(instanceIdentifier, dataId));
        var actual = metadata.BumpDataElement(instanceIdentifier, dataId);

        Assert.Equal(StorageClientInterceptor.CreateBlobVersionId(1), actual.BlobVersionId);
    }

    // As Storage does: a workflow-owned save with a used idempotency key on the same previous instance version is the
    // committed one again, whatever its body; once the instance has moved on, the key no longer replays.
    [Fact]
    public void FindReplayedMutation_ReplaysAKeyOnItsPreviousVersion_UntilTheInstanceMovesOn()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        var preconditions = new StorageWritePreconditions(InstanceVersion: 1, IdempotencyKey: "step");
        Guid created = Guid.NewGuid();
        Assert.Null(metadata.FindReplayedMutation(instanceIdentifier, preconditions));
        StorageVersionMetadata produced = metadata.BumpAggregate(instanceIdentifier, [created], [], false);
        metadata.RecordCommittedMutation(instanceIdentifier, preconditions, produced, [created]);

        Assert.Equal([created], metadata.FindReplayedMutation(instanceIdentifier, preconditions));
        Assert.Throws<PlatformHttpException>(() =>
            metadata.FindReplayedMutation(instanceIdentifier, preconditions with { InstanceVersion = 2 })
        );
        metadata.BumpInstance(instanceIdentifier.GetInstanceId());
        Assert.Throws<PlatformHttpException>(() => metadata.FindReplayedMutation(instanceIdentifier, preconditions));
    }
}
