using System;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    /// Class that handles all interaction with Azure Blob Storage.
    /// </summary>
    public class BlobService : IBlobService
    {
        private readonly ILogger<IBlobService> _logger;
        private readonly IKeyVaultService _keyVaultService;
        private readonly ISasTokenProvider _sasTokenProvider;
        private readonly string _accountName = "{0}altinn{1}strg01";
        private readonly string _storageContainer = "{0}-{1}-appsdata-blob-db";
        private readonly string _accountKey;
        private readonly string _blobEndpoint;
        private readonly string _environment;

        /// <summary>
        /// Initializes a new instance of the <see cref="BlobService"/> class.
        /// </summary>
        /// <param name="logger">The logger.</param>
        /// <param name="sasTokenProvider">The sas token provider</param>
        /// <param name="keyVaultService">The key vault service</param>
        public BlobService(ILogger<IBlobService> logger, ISasTokenProvider sasTokenProvider, IKeyVaultService keyVaultService)
        {
            _logger = logger;
            _sasTokenProvider = sasTokenProvider;
            _keyVaultService = keyVaultService;
            _accountKey = Environment.GetEnvironmentVariable("AccountKey");
            _blobEndpoint = Environment.GetEnvironmentVariable("BlobEndpoint");
            _environment = Environment.GetEnvironmentVariable("Environment");
            _accountName = _environment.Equals("dev") ? "devstoreaccount1" : _accountName;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataBlobs(Instance instance)
        {
            BlobContainerClient container = await CreateBlobClient(instance.Org);

            if (container == null)
            {
                _logger.LogError($"BlobService // DeleteDataBlobs // Could not connect to blob container.");
                return false;
            }

            try
            {
                await foreach (BlobItem item in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, $"{instance.AppId}/{instance.Id}", CancellationToken.None))
                {
                    container.DeleteBlobIfExists(item.Name, DeleteSnapshotsOption.IncludeSnapshots);
                }
            }
            catch (Exception e)
            {
                _sasTokenProvider.InvalidateSasToken(instance.Org);
                _logger.LogError(e, $"BlobService // DeleteDataBlobs // Org: {instance.Org} // Exeption: {e.Message}");
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataBlob(DataElement dataElement)
        {
            string org = dataElement.BlobStoragePath.Split("/")[0];
            BlobContainerClient container = await CreateBlobClient(org);

            if (container == null)
            {
                _logger.LogError($"BlobService // DeleteDataBlob // Could not connect to blob container.");
                return false;
            }

            try
            {
                await container.DeleteBlobIfExistsAsync(dataElement.BlobStoragePath, DeleteSnapshotsOption.IncludeSnapshots);
            }
            catch (Exception e)
            {
                _sasTokenProvider.InvalidateSasToken(org);
                _logger.LogError(e, $"BlobService // DeleteDataBlob // Org: {org} // Blobstoragepath: {dataElement.BlobStoragePath} // Exeption: {e.Message}");
                return false;
            }

            return true;
        }

        private async Task<BlobContainerClient> CreateBlobClient(string org)
        {
            if (!_accountName.Equals("devstoreaccount1"))
            {
                string sasToken = await _sasTokenProvider.GetSasToken(org);

                string accountName = string.Format(_accountName, org, _environment);
                string containerName = string.Format(_storageContainer, org, _environment);

                UriBuilder fullUri = new UriBuilder
                {
                    Scheme = "https",
                    Host = $"{accountName}.blob.core.windows.net",
                    Path = $"{containerName}",
                    Query = sasToken,
                };

                return new BlobContainerClient(fullUri.Uri, null);
            }

            StorageSharedKeyCredential storageCredentials = new StorageSharedKeyCredential(_accountName, _accountKey);
            Uri storageUrl = new Uri(_blobEndpoint);
            BlobServiceClient commonBlobClient = new BlobServiceClient(storageUrl, storageCredentials);
            BlobContainerClient blobContainerClient = commonBlobClient.GetBlobContainerClient(string.Format(_storageContainer, org, _environment));
            return blobContainerClient;
        }
    }
}
