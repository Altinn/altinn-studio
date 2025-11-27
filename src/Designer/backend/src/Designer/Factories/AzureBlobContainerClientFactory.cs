using System;
using Altinn.Studio.Designer.Configuration;
using Azure.Identity;
using Azure.Storage.Blobs;

namespace Altinn.Studio.Designer.Factories;
public class AzureBlobContainerClientFactory(SharedContentClientSettings settings) : IBlobContainerClientFactory
{
    private readonly SharedContentClientSettings _settings = settings;

    public BlobContainerClient GetContainerClient()
    {
        string storageContainerName = _settings.StorageContainerName;
        string storageAccountUrl = _settings.StorageAccountUrl;
        BlobServiceClient blobServiceClient = new(new Uri(storageAccountUrl), new DefaultAzureCredential());
        return blobServiceClient.GetBlobContainerClient(storageContainerName);
    }
}
