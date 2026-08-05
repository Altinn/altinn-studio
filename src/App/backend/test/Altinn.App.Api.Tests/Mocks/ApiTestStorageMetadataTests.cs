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
}
