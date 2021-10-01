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
            BlobClient blobClient = CreateBlobClient(filepath);

            return await GetBlobStreamInternal(blobClient);
        }

        /// <inheritdoc/>
        public async Task<Stream> GetPolicyVersionAsync(string filepath, string version)
        {
            BlobClient blobClient = CreateBlobClient(filepath).WithVersion(version);

            return await GetBlobStreamInternal(blobClient);
        }

        /// <inheritdoc/>
        public async Task<(Stream, ETag)> GetPolicyVersionAndETagAsync(string filepath, string version)
        {
            try
            {
                BlobClient blobClient = CreateBlobClient(filepath).WithVersion(version);

                if (await blobClient.ExistsAsync())
                {
                    Response<BlobProperties> properties = await blobClient.GetPropertiesAsync();

                    return (await GetBlobStreamInternal(blobClient), properties.Value.ETag);
                }

                return (null, ETag.All);
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
            BlobClient blobClient = CreateBlobClient(filepath);

            return await WriteBlobStreamInternal(blobClient, fileStream);
        }

        /// <inheritdoc/>
        public async Task<Response<BlobContentInfo>> WritePolicyConditionallyAsync(string filepath, Stream fileStream, ETag originalETag)
        {
            BlobClient blobClient = CreateBlobClient(filepath);

            BlobUploadOptions blobUploadOptions = new BlobUploadOptions()
            {
                Conditions = new BlobRequestConditions()
                {
                    IfMatch = originalETag
                }
            };

            return await WriteBlobStreamInternal(blobClient, fileStream, blobUploadOptions);
        }

        /// <inheritdoc/>
        public async Task<Response> DeletePolicyVersionAsync(string filepath, string version)
        {
            try
            {
                BlobClient blockBlob = CreateBlobClient(filepath);

                return await blockBlob.WithVersion(version).DeleteAsync();
            }
            catch (RequestFailedException ex)
            {
                if (ex.Status == (int)HttpStatusCode.Forbidden && ex.ErrorCode == "OperationNotAllowedOnRootBlob")
                {
                    _logger.LogError($"Failed to delete version {version} of policy file at {filepath}. Not allowed to delete current version. \n" + ex);
                    throw;
                }

                _logger.LogError($"Failed to delete version {version} of policy file at {filepath}. RequestFailedException: \n" + ex);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to delete version {version} of policy file at {filepath}. Unexpected error: \n" + ex);
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

        private async Task<Stream> GetBlobStreamInternal(BlobClient blobClient)
        {
            try
            {
                Stream memoryStream = new MemoryStream();

                if (await blobClient.ExistsAsync())
                {
                    await blobClient.DownloadToAsync(memoryStream);
                    memoryStream.Position = 0;

                    return memoryStream;
                }

                return memoryStream;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to read policy file at {blobClient.Name}. " + ex);
                throw;
            }
        }

        private async Task<Response<BlobContentInfo>> WriteBlobStreamInternal(BlobClient blobClient, Stream fileStream, BlobUploadOptions blobUploadOptions = null)
        {
            try
            {
                if (blobUploadOptions != null)
                {
                    return await blobClient.UploadAsync(fileStream, blobUploadOptions);
                }

                return await blobClient.UploadAsync(fileStream);
            }
            catch (RequestFailedException ex)
            {
                if (ex.Status == (int)HttpStatusCode.PreconditionFailed)
                {
                    _logger.LogError($"Failed to save policy file {blobClient.Name}. Precondition failed: Blob's ETag does not match ETag provided. \n" + ex);
                    throw;
                }

                _logger.LogError($"Failed to save policy file {blobClient.Name}. RequestFailedException: \n" + ex);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to save policy file {blobClient.Name}. Unexpected exception: \n" + ex);
                throw;
            }
        }
    }
}
