using System;
using System.Collections.Generic;

using Altinn.Platform.Storage.CosmosBackup;

using Microsoft.Azure.Documents;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace CosmosBackup.Instances
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
                IConfiguration config = ConfigHelper.LoadConfig(context);
                string blobName = string.Empty;

                try
                {
                    dynamic data = JObject.Parse(input[0].ToString());
                    string id = input[0].Id;
                    string partitionKey = data.instanceOwner.partyId;
                    blobName = $"{partitionKey}/{id}";

                    await BlobService.SaveBlob(config, $"instances/{blobName}", input[0].ToString());
                }
                catch (Exception e)
                {
                    log.LogError($"Exception occured when storing element {blobName}. Exception: {e}. Message: {e.Message}");
                }
            }
        }
    }
}
