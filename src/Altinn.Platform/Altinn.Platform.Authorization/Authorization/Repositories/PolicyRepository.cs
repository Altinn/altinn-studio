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
using Azure.Storage.Blobs.Specialized;
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
        private readonly BlobContainerClient _metadataContainerClient;
        private readonly BlobContainerClient _delegationsContainerClient;

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

            StorageSharedKeyCredential metadataCredentials = new StorageSharedKeyCredential(_storageConfig.MetadataAccountName, _storageConfig.MetadataAccountKey);
            BlobServiceClient metadataServiceClient = new BlobServiceClient(new Uri(_storageConfig.MetadataBlobEndpoint), metadataCredentials);
            _metadataContainerClient = metadataServiceClient.GetBlobContainerClient(_storageConfig.MetadataContainer);

            StorageSharedKeyCredential delegationsCredentials = new StorageSharedKeyCredential(_storageConfig.DelegationsAccountName, _storageConfig.DelegationsAccountKey);
            BlobServiceClient delegationsServiceClient = new BlobServiceClient(new Uri(_storageConfig.DelegationsBlobEndpoint), delegationsCredentials);
            _delegationsContainerClient = delegationsServiceClient.GetBlobContainerClient(_storageConfig.DelegationsContainer);           
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
        public async Task<Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream)
        {
            BlobClient blobClient = CreateBlobClient(filepath);

            return await WriteBlobStreamInternal(blobClient, fileStream);
        }

        /// <inheritdoc/>
        public async Task<Response<BlobContentInfo>> WritePolicyConditionallyAsync(string filepath, Stream fileStream, string blobLeaseId)
        {
            BlobClient blobClient = CreateBlobClient(filepath);

            BlobUploadOptions blobUploadOptions = new BlobUploadOptions()
            {
                Conditions = new BlobRequestConditions()
                {
                    LeaseId = blobLeaseId
                }
            };

            return await WriteBlobStreamInternal(blobClient, fileStream, blobUploadOptions);
        }

        /// <inheritdoc/>
        public async Task<string> TryAcquireBlobLease(string filepath)
        {
            BlobClient blobClient = CreateBlobClient(filepath);
            BlobLeaseClient blobLeaseClient = blobClient.GetBlobLeaseClient();

            try
            {
                BlobLease blobLease = await blobLeaseClient.AcquireAsync(TimeSpan.FromSeconds(_storageConfig.DelegationsBlobLeaseTimeout));
                return blobLease.LeaseId;
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "Failed to acquire blob lease for policy file at {filepath}. RequestFailedException", filepath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to acquire blob lease for policy file at {filepath}. Unexpected error", filepath);
            }

            return null;
        }

        /// <inheritdoc/>
        public async void ReleaseBlobLease(string filepath, string leaseId)
        {
            BlobClient blobClient = CreateBlobClient(filepath);
            BlobLeaseClient blobLeaseClient = blobClient.GetBlobLeaseClient(leaseId);
            await blobLeaseClient.ReleaseAsync();
        }

        /// <inheritdoc/>
        public async Task<bool> PolicyExistsAsync(string filepath)
        {
            try
            {
                BlobClient blobClient = CreateBlobClient(filepath);
                return await blobClient.ExistsAsync();
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "Failed to check if blob exists for policy file at {filepath}. RequestFailedException", filepath);
            }

            return false;
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
                    _logger.LogError(ex, "Failed to delete version {version} of policy file at {filepath}. Not allowed to delete current version.", version, filepath);
                    throw;
                }

                _logger.LogError(ex, "Failed to delete version {version} of policy file at {filepath}. RequestFailedException", version, filepath);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete version {version} of policy file at {filepath}. Unexpected error", version, filepath);
                throw;
            }
        }

        private BlobClient CreateBlobClient(string blobName)
        {
            if (blobName.Contains("delegationpolicy.xml"))
            {
                return _delegationsContainerClient.GetBlobClient(blobName);
            }

            return _metadataContainerClient.GetBlobClient(blobName);
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
                _logger.LogError(ex, "Failed to read policy file at {blobClient.Name}.", blobClient.Name);
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
                    _logger.LogError(ex, "Failed to save policy file {blobClient.Name}. Precondition failed", blobClient.Name);
                    throw;
                }

                _logger.LogError(ex, "Failed to save policy file {blobClient.Name}. RequestFailedException", blobClient.Name);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save policy file {blobClient.Name}. Unexpected exception", blobClient.Name);
                throw;
            }
        }
    }
}
