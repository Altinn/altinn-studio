using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Mocks;

namespace Altinn.App.Api.Tests.Mocks;

public sealed class ApiTestStorageMetadataTests
{
    [Fact]
    public void GetDataElementMetadata_DefaultsNormalElementToVersionOne()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        Guid dataId = Guid.NewGuid();

        var actual = metadata.GetDataElementMetadata(instanceIdentifier, dataId);

        Assert.Equal(StorageClientInterceptor.CreateDataETag(1), actual.ETag);
    }

    [Fact]
    public void GetDataElementMetadata_PreservesExplicitVersion()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        Guid dataId = Guid.NewGuid();
        metadata.SetDataElementBlobVersion(instanceIdentifier, dataId, 7);

        var actual = metadata.GetDataElementMetadata(instanceIdentifier, dataId);

        Assert.Equal(StorageClientInterceptor.CreateDataETag(7), actual.ETag);
    }

    [Fact]
    public void BumpDataElement_WhenElementHasNoBlobVersion_CreatesVersionOne()
    {
        var metadata = new ApiTestStorageMetadata();
        var instanceIdentifier = new InstanceIdentifier(123456, Guid.NewGuid());
        Guid dataId = Guid.NewGuid();
        metadata.SetDataElementWithoutBlobVersion(instanceIdentifier, dataId);

        Assert.Null(metadata.GetDataElementMetadata(instanceIdentifier, dataId).ETag);
        var actual = metadata.BumpDataElement(instanceIdentifier, dataId);

        Assert.Equal(StorageClientInterceptor.CreateDataETag(1), actual.DataElement.ETag);
    }
}
