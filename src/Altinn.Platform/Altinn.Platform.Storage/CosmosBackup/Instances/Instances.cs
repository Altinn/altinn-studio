using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.Azure.Documents;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json.Linq;

namespace CosmosBackup.Functions
{
    public static class Instances
    {
        [FunctionName("InstancesCollectionBackup")]
        public static async void InstancesCollectionBackup([CosmosDBTrigger(
            databaseName: "Storage",
            collectionName: "instances",
            ConnectionStringSetting = "DBConnection",
            LeaseCollectionName = "leases",
            CreateLeaseCollectionIfNotExists = true)]IReadOnlyList<Document> input,
            ExecutionContext context,
            ILogger log)
        {
            if (input != null && input.Count > 0)
            {
                IConfiguration config = LoadConfig(context);
                string blobName = string.Empty;

                try
                {
                    dynamic data = JObject.Parse(input[0].ToString());
                    string id = input[0].Id;
                    string partitionKey = data.instanceOwner.partyId;
                    blobName = $"{partitionKey}/{id}";

                    await StoreBlob(config, $"instances/{blobName}", input[0].ToString());
                }
                catch (Exception e)
                {
                    log.LogError($"Exception occured when storing element {blobName}. Exception: {e}. Message: {e.Message}");
                }
            }
        }

        private async static Task StoreBlob(IConfiguration config, string name, string data)
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

        private static IConfiguration LoadConfig(ExecutionContext context)
        {
            IConfiguration config = new ConfigurationBuilder()
                .SetBasePath(context.FunctionAppDirectory)
                .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables() 
                .Build();

            return config;
        }
    }
}
