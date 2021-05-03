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
    /// Class that handles all interaction with the backup blob Storage.
    /// </summary>
    public class BackupBlobService : IBackupBlobService
    {
        private readonly ILogger<IBackupBlobService> _logger;
        private readonly IKeyVaultService _keyVaultService;
        private readonly string _accountName = "altinn{0}backup01";
        private readonly string _accountEndpoint = "https://altinn{0}backup01.blob.core.windows.net/";
        private readonly string _keyVaultUri;
        private readonly string _accountKey;
        private readonly string _blobEndpoint;
        private readonly string _environment;

        /// <summary>
        /// Initializes a new instance of the <see cref="BackupBlobService"/> class.
        /// </summary>
        /// <param name="logger">The logger.</param>
        /// <param name="sasTokenProvider">The sas token provider</param>
        /// <param name="keyVaultService">The key vault service</param>
        public BackupBlobService(ILogger<IBackupBlobService> logger, ISasTokenProvider sasTokenProvider, IKeyVaultService keyVaultService)
        {
            _logger = logger;
            _keyVaultService = keyVaultService;
            _accountKey = Environment.GetEnvironmentVariable("AccountKey");
            _blobEndpoint = Environment.GetEnvironmentVariable("BlobEndpoint");
            _environment = Environment.GetEnvironmentVariable("Environment");
            _keyVaultUri = Environment.GetEnvironmentVariable("KeyVaultUri");
            _accountName = _environment.Equals("dev") ? "devstoreaccount1" : _accountName;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteInstanceBackup(string instanceOwnerPartyId, string instanceGuid)
        {
            BlobContainerClient container = await CreateBackupBlobClient();

            try
            {
                await foreach (BlobItem item in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, $"instances/{instanceOwnerPartyId}/{instanceGuid}", CancellationToken.None))
                {
                    container.DeleteBlobIfExists(item.Name, DeleteSnapshotsOption.IncludeSnapshots);
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, "BackupBlobService // DeleteInstanceBackup // Instance: {InstanceOwnerPartyId}/{InstanceGuid} // Exeption: {Exception}", instanceOwnerPartyId, instanceGuid, e);
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteInstanceEventsBackup(string instanceOwnerPartyId, string instanceGuid)
        {
            BlobContainerClient container = await CreateBackupBlobClient();

            try
            {
                await foreach (BlobItem item in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, $"instanceEvents/{instanceOwnerPartyId}/{instanceGuid}", CancellationToken.None))
                {
                    container.DeleteBlobIfExists(item.Name, DeleteSnapshotsOption.IncludeSnapshots);
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, "BackupBlobService // DeleteInstanceEventsBackup // Instance: {InstanceOwnerPartyId}/{InstanceGuid} // Exeption: {Exception}", instanceOwnerPartyId, instanceGuid, e);
                return false;
            }

            return true;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDataBackup(string instanceGuid)
        {
            BlobContainerClient container = await CreateBackupBlobClient();

            try
            {
                await foreach (BlobItem item in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, $"dataElements/{instanceGuid}", CancellationToken.None))
                {
                    container.DeleteBlobIfExists(item.Name, DeleteSnapshotsOption.IncludeSnapshots);
                }
            }
            catch (Exception e)
            {
                _logger.LogError(e, "BackupBlobService // DeleteInstanceEventsBackup // Instance: {InstanceGuid} // Exeption: {Exception}", instanceGuid, e);
                return false;
            }

            return true;
        }

        private async Task<BlobContainerClient> CreateBackupBlobClient()
        {
            if (_accountName.Equals("devstoreaccount1"))
            {
                StorageSharedKeyCredential credentials = new StorageSharedKeyCredential(_accountName, _accountKey);
                BlobServiceClient client = new BlobServiceClient(new Uri(_blobEndpoint), credentials);
                return client.GetBlobContainerClient("backup");
            }

            string backupAccountKey = await _keyVaultService.GetSecretAsync(
            _keyVaultUri,
            "AzureStorageConfiguration--BackupAccountKey");
    
            StorageSharedKeyCredential storageCredentials = new StorageSharedKeyCredential(string.Format(_accountName, _environment), backupAccountKey);
            Uri storageUrl = new Uri(string.Format(_accountEndpoint, _environment));

            BlobServiceClient commonBlobClient = new BlobServiceClient(storageUrl, storageCredentials);
            BlobContainerClient blobContainerClient = commonBlobClient.GetBlobContainerClient("backup");
            return blobContainerClient;
        }
    }
}
