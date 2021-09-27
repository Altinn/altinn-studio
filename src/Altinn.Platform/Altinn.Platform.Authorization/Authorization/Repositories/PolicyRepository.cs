using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Repositories.Interface;
using Azure;
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

        /// <inheritdoc/>
        public async Task<Stream> GetPolicyAsync(string filepath)
        {
            try
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
            catch (Exception ex)
            {
                _logger.LogError($"Failed to read policy file {filepath}. " + ex);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Tuple<Stream, ETag>> GetPolicyAndETagByVersionAsync(string filepath, string version)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);
                Stream memoryStream = new MemoryStream();

                if (await blockBlob.ExistsAsync())
                {
                    Response<BlobProperties> properties = await blockBlob.WithVersion(version).GetPropertiesAsync();

                    await blockBlob.WithVersion(version).DownloadToAsync(memoryStream);
                    memoryStream.Position = 0;

                    return new Tuple<Stream, ETag>(memoryStream, properties.Value.ETag);
                }

                ETag eTag;
                return new Tuple<Stream, ETag>(memoryStream, eTag);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to read policy file at {filepath} with version {version}. " + ex);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                return await blockBlob.UploadAsync(fileStream);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save policy file {filepath}. Unexpected exception: \n" + ex);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Response<BlobContentInfo>> WritePolicyConditionallyAsync(string filepath, Stream fileStream, ETag originalETag)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                BlobUploadOptions blobUploadOptions = new BlobUploadOptions()
                {
                    Conditions = new BlobRequestConditions()
                    {
                        IfMatch = new ETag("LOL")
                    }
                };

                return await blockBlob.UploadAsync(fileStream, blobUploadOptions);
            }
            catch (RequestFailedException ex)
            {
                if (ex.Status == (int)HttpStatusCode.PreconditionFailed)
                {
                    _logger.LogError($"Failed to save policy file {filepath}. Precondition failure. Blob's ETag does not match ETag provided. \n" + ex);
                    throw;
                }
                else
                {
                    _logger.LogError($"Failed to save policy file {filepath}. RequestFailedException: \n" + ex);
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save policy file {filepath}. Unexpected exception: \n" + ex);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Response> DeletePolicyVersionAsync(string filepath, string version)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                return await blockBlob.WithVersion(version).DeleteAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to delete version {version} of policy file at {filepath}. RequestFailedException: \n" + ex);
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
