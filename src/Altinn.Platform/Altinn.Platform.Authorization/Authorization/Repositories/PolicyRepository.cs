using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Repositories.Interface;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository for handling authorization rules
    /// </summary>
    public class PolicyRepository : IPolicyRepository
    {
        private readonly AzureStorageConfiguration _storageConfig;
        private CloudBlobClient _blobClient;
        private CloudBlobContainer _blobContainer;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRepository"/> class
        /// </summary>
        /// <param name="storageConfig">The storage configuration for Azure Blob Storage.</param>
        public PolicyRepository(IOptions<AzureStorageConfiguration> storageConfig)
        {
            _storageConfig = storageConfig.Value;
            SetUpBlobConnection();
        }

        /// <inheritdoc />
        public async Task<Stream> GetPolicy(string filepath)
        {
            CloudBlockBlob blockBlob = _blobContainer.GetBlockBlobReference(filepath);
            var memoryStream = new MemoryStream();
            await blockBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;
            return memoryStream;
        }

        /// <inheritdoc />
        public async Task<bool> WritePolicy(string filepath, Stream fileStream)
        {
            try
            {
                CloudBlockBlob blockBlob = _blobContainer.GetBlockBlobReference(filepath);
                await blockBlob.UploadFromStreamAsync(fileStream);
                await blockBlob.FetchAttributesAsync();

                // blockBlolb.Properties.Length is -1 before successful upload
                return blockBlob.Properties.Length >= 0;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        private void SetUpBlobConnection()
        {
            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfig.AccountName, _storageConfig.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            // creating blob client
            if (_storageConfig.AccountName.StartsWith(_storageConfig.AccountName))
            {
                StorageUri storageUrl = new StorageUri(new Uri(_storageConfig.BlobEndPoint));
                _blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            }
            else
            {
                _blobClient = storageAccount.CreateCloudBlobClient();
            }

            _blobContainer = _blobClient.GetContainerReference(_storageConfig.StorageContainer);
            _blobContainer.CreateIfNotExistsAsync().GetAwaiter().GetResult();
        }
    }
}
