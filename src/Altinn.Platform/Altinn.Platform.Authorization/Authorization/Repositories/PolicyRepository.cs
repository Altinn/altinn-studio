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
        private readonly CloudBlobClient _blobClient;
        private readonly CloudBlobContainer _blobContainer;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRepository"/> class
        /// </summary>
        /// <param name="storageConfig">The storage configuration for Azure Blob Storage.</param>
        public PolicyRepository(IOptions<AzureStorageConfiguration> storageConfig)
        {
            _storageConfig = storageConfig.Value;

            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials(_storageConfig.AccountName, _storageConfig.AccountKey);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            _blobClient = CreateBlobClient(storageCredentials, storageAccount);
            _blobContainer = _blobClient.GetContainerReference(_storageConfig.StorageContainer);
        }

        /// <inheritdoc />
        public Task<Stream> GetPolicy(string filepath)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc />
        public Task<Stream> UpdatePolicy(string filepath, Stream fileStream)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc />
        public async Task<string> WritePolicy(string filepath, Stream fileStream)
        {
            throw new NotImplementedException();
        }

        private CloudBlobClient CreateBlobClient(StorageCredentials storageCredentials, CloudStorageAccount storageAccount)
        {
            CloudBlobClient blobClient;
            if (_storageConfig.AccountName.StartsWith(_storageConfig.AccountName))
            {
                StorageUri storageUrl = new StorageUri(new Uri(_storageConfig.BlobEndPoint));
                blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            }
            else
            {
                blobClient = storageAccount.CreateCloudBlobClient();
            }

            return blobClient;
        }
    }
}
