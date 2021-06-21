using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Azure.Documents;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Altinn.Platform.Storage.CosmosBackup
{
    /// <summary>
    /// Azure Function class for handling tasks related to instance events.
    /// </summary>
    public static class InstanceEvents
    {
        /// <summary>
        /// Backs up Cosmos DB application documents in Blob Storage.
        /// </summary>
        /// <param name="input">DataElements document.</param>
        /// <param name="context">Function context.</param>
        /// <param name="log">Logger.</param>
        [FunctionName("InstanceEventsCollectionBackup")]
        public static async Task InstanceEventsCollectionBackup(
            [CosmosDBTrigger(
            databaseName: "Storage",
            collectionName: "instanceEvents",
            ConnectionStringSetting = "DBConnection",
            LeaseCollectionName = "leases",
            LeaseCollectionPrefix = "instanceEvents",
            CreateLeaseCollectionIfNotExists = true)]IReadOnlyList<Document> input,
            ExecutionContext context,
            ILogger log)
        {
            if (input != null && input.Count > 0)
            {
                IConfiguration config = ConfigHelper.LoadConfig(context);
                string blobName = string.Empty;

                foreach (Document item in input)
                {
                    try
                    {
                        dynamic data = JObject.Parse(item.ToString());
                        string id = item.Id;
                        string partitionKey = data.instanceId;
                        blobName = $"{partitionKey}/{id}";

                        await BlobService.SaveBlob(config, $"instanceEvents/{blobName}", item.ToString());
                    }
                    catch (Exception e)
                    {
                        log.LogError($"Exception occured when storing element {blobName}. Exception: {e}. Message: {e.Message}");
                    }
                }
            }
        }
    }
}
