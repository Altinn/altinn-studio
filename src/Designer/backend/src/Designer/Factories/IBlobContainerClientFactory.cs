using Azure.Storage.Blobs;

namespace Altinn.Studio.Designer.Factories;

public interface IBlobContainerClientFactory
{
    BlobContainerClient GetContainerClient();
}
