using System;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Repository;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Logging;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Context to manage the organisations storage client
    /// </summary>
    public class OrgDataContext : IDisposable
    {
        private bool disposed = false;

        /// <summary>
        /// Gets the application owner blog container
        /// </summary>
        public CloudBlobContainer OrgBlobContainer { get; private set; }

        private readonly AzureStorageConfiguration _storageConfiguration;
        private readonly ILogger<DataRepository> _logger;

        /// <summary>
        /// Creates an instance of a <see cref="OrgDataContext"></see>
        /// </summary>
        /// <param name="org">Application owner name</param>
        /// <param name="storageConfiguration">the storage configuration for azure blob storage</param>
        /// <param name="logger">The logger to use when writing to logs.</param>
        public OrgDataContext(string org, AzureStorageConfiguration storageConfiguration, ILogger<DataRepository> logger)
        {
            _storageConfiguration = storageConfiguration;
            _logger = logger;

            OrgBlobContainer = CreateCloudBlobContainer(org);
        }

        private CloudBlobContainer CreateCloudBlobContainer(string org)
        {
            string containerName = string.Format(_storageConfiguration.OrgStorageContainer, org);
            CloudBlobClient blobClient = CreateCloudBlobClient(org);
            if (blobClient != null)
            {
                return blobClient.GetContainerReference(containerName);
            }

            return null;
        }

        private CloudBlobClient CreateCloudBlobClient(string org)
        {
            try
            {
                _logger.LogInformation($"Preparing to connect to storage for '{org}'.");

                string secretUri = string.Format(_storageConfiguration.OrgKeyVaultURI, org);
                string storageAccount = string.Format(_storageConfiguration.OrgStorageAccount, org);
                string sasDefinition = string.Format(_storageConfiguration.OrgSasDefinition, org);

                string blobEndpoint = string.Format(_storageConfiguration.BlobEndPoint, storageAccount);

                _logger.LogInformation($"Getting secret '{storageAccount}-{sasDefinition}' from '{secretUri}'.");

                KeyVaultClient kv = Startup.PlatformKeyVaultClient;
                SecretBundle sb = kv.GetSecretAsync(secretUri, $@"{storageAccount}-{sasDefinition}").Result;
                StorageCredentials accountSasCredential = new StorageCredentials(sb.Value);

                _logger.LogInformation($"Creating CloudStorageAccount for storage endpoint '{blobEndpoint}'.");

                CloudStorageAccount accountWithSas = new CloudStorageAccount(accountSasCredential, new Uri(blobEndpoint), null, null, null);
                CloudBlobClient cloudBlobClient = accountWithSas.CreateCloudBlobClient();

                _logger.LogInformation($"Successfully connected");

                return cloudBlobClient;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Exception when attempting to create a CloudBlobClient.");
                return null;
            }
        }

        /// <summary>
        /// Disposes organisation storage client
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Disposes organisation storage client
        /// </summary>
        /// <param name="disposing">Flag for disposing values</param>
        protected virtual void Dispose(bool disposing)
        {
            if (disposed)
            {
                return;
            }

            if (disposing)
            {
                OrgBlobContainer = null;
            }
            
            disposed = true;
        }
    }
}
