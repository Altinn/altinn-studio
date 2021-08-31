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
    /// Repository for handling policy files
    /// </summary>
    public class PolicyRepository : IPolicyRepository
    {
        private readonly ILogger<PolicyRepository> _logger;
        private readonly AzureStorageConfiguration _storageConfig;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyRepository"/> class
        /// </summary>
        /// <param name="storageConfig">The storage configuration for Azure Blob Storage.</param>
        /// <param name="logger">logger</param>
        public PolicyRepository(
            IOptions<AzureStorageConfiguration> storageConfig,
            ILogger<PolicyRepository> logger)
        {
            _logger = logger;
            _storageConfig = storageConfig.Value;
        }

        /// <inheritdoc />
        public async Task<Stream> GetPolicyAsync(string filepath)
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
        public async Task<Azure.Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                return await blockBlob.UploadAsync(fileStream, true);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save policy file {filepath}. " + ex);
                throw;
            }
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
