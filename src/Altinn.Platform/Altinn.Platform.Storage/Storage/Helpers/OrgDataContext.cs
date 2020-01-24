using System;
using Altinn.Platform.Storage.Configuration;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Contaxt to manage the organisations storage client
    /// </summary>
    public class OrgDataContext: IDisposable
    {
        /// <summary>
        /// Gets the application owner blog container
        /// </summary>
        public CloudBlobContainer OrgBlobContainer { get; private set; }

        private readonly AzureStorageConfiguration _storageConfiguration;

        /// <summary>
        /// Creates an instance of a <see cref="OrgDataContext"></see>
        /// </summary>
        /// <param name="org">Application owner name</param>
        /// <param name="storageConfiguration">the storage configuration for azure blob storage</param>
        public OrgDataContext(string org, AzureStorageConfiguration storageConfiguration)
        {
            _storageConfiguration = storageConfiguration;
            OrgBlobContainer = GetCloudBlobContainer(org);
        }

        private CloudBlobContainer GetCloudBlobContainer(string org)
        {
            string containerName = string.Format(_storageConfiguration.OrgStorageContainer, org, Startup.EnvironmentName);
            CloudBlobClient blobClient = GetCloudBlobClient(org);
            if (blobClient != null)
            {
                return blobClient.GetContainerReference(containerName);
            }

            return null;
        }

        private CloudBlobClient GetCloudBlobClient(string org)
        {
            try
            {
                string secretUri = string.Format(_storageConfiguration.OrgKeyVaultURI, org, Startup.EnvironmentName);
                string storageAccount = string.Format(_storageConfiguration.OrgStorageAccount, org, Startup.EnvironmentName);
                string sasDefinition = string.Format(_storageConfiguration.OrgSasDefinition, org, Startup.EnvironmentName);

                KeyVaultClient kv = Startup.PlatformKeyVaultClient;
                SecretBundle sb = kv.GetSecretAsync(secretUri, $@"{storageAccount}-{sasDefinition}").Result;
                StorageCredentials accountSasCredential = new StorageCredentials(sb.Value);
                CloudStorageAccount accountWithSas = new CloudStorageAccount(accountSasCredential, new Uri($@"https://{storageAccount}.blob.core.windows.net/"), null, null, null);

                return accountWithSas.CreateCloudBlobClient();
            }
            catch
            {
                return null;
            }
        }

        private bool disposedValue = false; // To detect redundant calls

        /// <summary>
        /// Disposes organisation storage client
        /// </summary>
        /// <param name="disposing">Flag for disposing values</param>
        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    OrgBlobContainer = null;
                }

                disposedValue = true;
            }
        }

        /// <summary>
        /// Disposes organisation storage client
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
        }
    }
}
