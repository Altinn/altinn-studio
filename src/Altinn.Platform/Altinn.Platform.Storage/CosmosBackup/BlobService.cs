using System;
using System.Threading.Tasks;

using Microsoft.Extensions.Configuration;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;

namespace Altinn.Platform.Storage.CosmosBackup
{
    /// <summary>
    /// Class that handles integration with Azure Blob Storage.
    /// </summary>
    public static class BlobService
    {
        /// <summary>
        /// Saves data in blob storage defined in configuration.
        /// </summary>
        /// <param name="config">Configuration.</param>
        /// <param name="name">Blob name.</param>
        /// <param name="data">Blob data.</param>
        public static async Task SaveBlob(IConfiguration config, string name, string data)
        {
            StorageCredentials storageCredentials = new StorageCredentials(config["AccountName"], config["AccountKey"]);
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);
            CloudBlobClient client;

            if (config["AccountName"].StartsWith("devstoreaccount1"))
            {
                StorageUri storageUrl = new StorageUri(new Uri(config["BlobEndPoint"]));
                client = new CloudBlobClient(storageUrl, storageCredentials);
            }
            else
            {
                client = storageAccount.CreateCloudBlobClient();
            }

            CloudBlobContainer container = client.GetContainerReference(config["StorageContainer"]);

            await container.CreateIfNotExistsAsync();

            CloudBlockBlob blob = container.GetBlockBlobReference(name);
            blob.Properties.ContentType = "application/json";

            await blob.UploadTextAsync(data);
        }
    }
}
