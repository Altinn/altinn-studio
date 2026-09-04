using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Moq;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataServiceBlobCleanupTests
{
    [Fact]
    public async Task CleanupDeletedDataElementBlobs_WithDetachedVersions_AlsoDeletesTheLegacyBlob()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        string blobVersionId = await storage.DataRepository.CreateBlobVersionId(
            instanceGuid,
            dataElementId,
            instance.AppId,
            instance.Org,
            storageAccountNumber: null
        );
        DataElement dataElement = await CreateAndDelete(
            storage,
            instanceGuid,
            dataElementId,
            BlobRepository.GetVersionedBlobPath(
                instance.AppId,
                instanceGuid.ToString(),
                blobVersionId
            )
        );
        Mock<IBlobRepository> blobRepository = CreateBlobRepository();

        await CreateDataService(storage, blobRepository)
            .CleanupDeletedDataElementBlobs(
                instance,
                dataElement,
                storageAccountNumber: null,
                CancellationToken.None
            );

        blobRepository.Verify(
            repository =>
                repository.DeleteBlob(instance.Org, dataElement.BlobStoragePath, null),
            Times.Once
        );
        blobRepository.Verify(
            repository =>
                repository.DeleteBlob(
                    instance.Org,
                    DataElementHelper.DataFileName(
                        instance.AppId,
                        instanceGuid.ToString(),
                        dataElementId.ToString()
                    ),
                    null
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task CleanupDeletedDataElementBlobs_WithoutBlobVersion_DeletesTheStoredPath()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
        Guid dataElementId = Guid.NewGuid();
        DataElement dataElement = await CreateAndDelete(
            storage,
            instanceGuid,
            dataElementId,
            $"{instance.AppId}/legacy-layout/{instanceGuid}/{dataElementId}"
        );
        Mock<IBlobRepository> blobRepository = CreateBlobRepository();

        await CreateDataService(storage, blobRepository)
            .CleanupDeletedDataElementBlobs(
                instance,
                dataElement,
                storageAccountNumber: null,
                CancellationToken.None
            );

        blobRepository.Verify(
            repository =>
                repository.DeleteBlob(instance.Org, dataElement.BlobStoragePath, null),
            Times.Once
        );
        blobRepository.Verify(
            repository =>
                repository.DeleteBlob(
                    instance.Org,
                    DataElementHelper.DataFileName(
                        instance.AppId,
                        instanceGuid.ToString(),
                        dataElementId.ToString()
                    ),
                    null
                ),
            Times.Never
        );
    }

    private static async Task<DataElement> CreateAndDelete(
        LocalStorageFixture storage,
        Guid instanceGuid,
        Guid dataElementId,
        string blobStoragePath
    )
    {
        DataElement dataElement = (
            await storage.DataRepository.Create(
                new DataElement
                {
                    Id = dataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "attachment",
                    ContentType = "text/plain",
                    BlobStoragePath = blobStoragePath,
                    Created = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
                    LastChanged = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
                }
            )
        ).DataElement;

        await storage.DataRepository.Delete(dataElement);
        return dataElement;
    }

    private static Mock<IBlobRepository> CreateBlobRepository()
    {
        var blobRepository = new Mock<IBlobRepository>();
        blobRepository
            .Setup(repository =>
                repository.DeleteBlob(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>())
            )
            .ReturnsAsync(true);
        return blobRepository;
    }

    private static DataService CreateDataService(
        LocalStorageFixture storage,
        Mock<IBlobRepository> blobRepository
    ) =>
        new(
            storage.DataRepository,
            blobRepository.Object,
            instanceEventService: null,
            instanceMutationRepository: null,
            instanceRepository: null
        );
}
