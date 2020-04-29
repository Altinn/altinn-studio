using System;
using System.IO;
using System.Reflection.Metadata;
using System.Threading.Tasks;
using Azure.Core;
using Azure.Storage;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Configuration;

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
            BlobClient client;

            StorageSharedKeyCredential storageCredentials = new StorageSharedKeyCredential(config["AccountName"], config["AccountKey"]);
            BlobServiceClient serviceClient = new BlobServiceClient(new Uri(config["BlobEndPoint"]), storageCredentials);
            BlobContainerClient blobContainerClient = serviceClient.GetBlobContainerClient(config["StorageContainer"]);

            client = blobContainerClient.GetBlobClient(name);
            
            Stream stream = new MemoryStream();
            StreamWriter writer = new StreamWriter(stream);
            writer.Write(data);
            writer.Flush();
            stream.Position = 0;
            await client.UploadAsync(stream, true);
            stream.Dispose();
        }
    }
}
