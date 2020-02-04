using System;

using Altinn.Platform.Storage.Configuration;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
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

        private readonly GeneralSettings _generalSettings;
        private readonly AzureStorageConfiguration _storageConfiguration;

        /// <summary>
        /// Creates an instance of a <see cref="OrgDataContext"></see>
        /// </summary>
        /// <param name="org">Application owner name</param>
        /// <param name="generalSettings">The application general settings section.</param>
        /// <param name="storageConfiguration">the storage configuration for azure blob storage</param>
        public OrgDataContext(string org, GeneralSettings generalSettings, AzureStorageConfiguration storageConfiguration)
        {
            _generalSettings = generalSettings;
            _storageConfiguration = storageConfiguration;

            OrgBlobContainer = CreateCloudBlobContainer(org);
        }

        private CloudBlobContainer CreateCloudBlobContainer(string org)
        {
            string containerName = string.Format(_storageConfiguration.OrgStorageContainer, org, _generalSettings.EnvironmentName);
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
                string secretUri = string.Format(_storageConfiguration.OrgKeyVaultURI, org, _generalSettings.EnvironmentName);
                string storageAccount = string.Format(_storageConfiguration.OrgStorageAccount, org, _generalSettings.EnvironmentName);
                string sasDefinition = string.Format(_storageConfiguration.OrgSasDefinition, org, _generalSettings.EnvironmentName);
                string blobEndpoint = string.Format(_storageConfiguration.BlobEndPoint, storageAccount);

                KeyVaultClient kv = Startup.PlatformKeyVaultClient;
                SecretBundle sb = kv.GetSecretAsync(secretUri, $@"{storageAccount}-{sasDefinition}").Result;
                StorageCredentials accountSasCredential = new StorageCredentials(sb.Value);

                CloudStorageAccount accountWithSas = new CloudStorageAccount(accountSasCredential, new Uri(blobEndpoint), null, null, null);

                return accountWithSas.CreateCloudBlobClient();
            }
            catch
            {
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
