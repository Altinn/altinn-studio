using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Repositories.Interface;
using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository for handling delegations
    /// </summary>
    public class PolicyDelegationRepository : IPolicyDelegationRepository
    {
        private readonly ILogger<PolicyDelegationRepository> _logger;
        private readonly AzureStorageConfiguration _storageConfig;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyDelegationRepository"/> class
        /// </summary>
        /// <param name="storageConfig">The storage configuration for Azure Blob Storage.</param>
        /// <param name="logger">logger</param>
        public PolicyDelegationRepository(
            IOptions<AzureStorageConfiguration> storageConfig,
            ILogger<PolicyDelegationRepository> logger)
        {
            _logger = logger;
            _storageConfig = storageConfig.Value;
        }

        /// <inheritdoc />
        public async Task<Stream> GetDelegationPolicyAsync(string filepath)
        {
            BlobClient blockBlob = CreateBlobClient(filepath);
            Stream memoryStream = new MemoryStream();

            if (await blockBlob.ExistsAsync())
            {
                await blockBlob.DownloadToAsync(memoryStream);
                memoryStream.Position = 0;

                return memoryStream;
            }

            return memoryStream;
        }

        /// <inheritdoc />
        public async Task<bool> WriteDelegationPolicyAsync(string filepath, Stream fileStream)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                await blockBlob.UploadAsync(fileStream, true);
                BlobProperties properties = await blockBlob.GetPropertiesAsync();

                return properties.ContentLength > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save delegation policy file {filepath}. " + ex);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<bool> InsertDelegation()
        {
            throw new NotImplementedException();
        }

        private BlobClient CreateBlobClient(string blobName)
        {
            StorageSharedKeyCredential storageCredentials = new StorageSharedKeyCredential(_storageConfig.AccountName, _storageConfig.AccountKey);
            BlobServiceClient serviceClient = new BlobServiceClient(new Uri(_storageConfig.BlobEndpoint), storageCredentials);
            BlobContainerClient blobContainerClient = serviceClient.GetBlobContainerClient(_storageConfig.MetadataContainer);

            return blobContainerClient.GetBlobClient(blobName);
        }
    }
}
