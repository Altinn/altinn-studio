using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.DataCleanup.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Azure Function class for handling tasks related to load testing cleanup
    /// </summary>
    public class LoadTestingCleanup
    {
        private readonly ICosmosService _cosmosService;
        private readonly IBlobService _blobService;

        /// <summary>
        /// Initializes a new instance of the <see cref="LoadTestingCleanup"/> class.
        /// </summary>
        /// <param name="cosmosService">The Cosmos DB service.</param>
        /// <param name="blobService">The blob service.</param>
        public LoadTestingCleanup(ICosmosService cosmosService, IBlobService blobService)
        {
            _cosmosService = cosmosService;
            _blobService = blobService;
        }

        /// <summary>
        /// Runs load testing cleanup.
        /// </summary>
        /// <param name="req">The http request.</param>
        /// <param name="log">The log.</param>
        [FunctionName("LoadTestingCleanup")]
        public async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            string app = req.Query["app"];

            if (string.IsNullOrEmpty(app))
            {
                return new BadRequestObjectResult("Pass an app name in the query string to clean up load testing data.");
            }

            List<Instance> instances = await _cosmosService.GetAllInstancesOfApp(app.ToLower().Trim());

            foreach (Instance instance in instances)
            {
                bool dataElementsDeleted, dataElementMetadataDeleted = false;

                try
                {
                    if (instance.Data.Count > 0)
                    {
                        dataElementsDeleted = await _blobService.DeleteDataBlobs(instance);

                        if (dataElementsDeleted)
                        {
                            dataElementMetadataDeleted = await _cosmosService.DeleteDataElementDocuments(instance.Id);
                        }
                    }

                    bool instanceEventsDeleted = await _cosmosService.DeleteInstanceEventDocuments(instance.Id, instance.InstanceOwner.PartyId);

                    if ((instance.Data.Count == 0 || dataElementMetadataDeleted) && instanceEventsDeleted)
                    {
                        await _cosmosService.DeleteInstanceDocument(instance.Id, instance.InstanceOwner.PartyId);
                        log.LogInformation($"LoadTestingCleanup // Run // Instance deleted: {instance.AppId}/{instance.InstanceOwner.PartyId}/{instance.Id}");
                    }
                }
                catch (Exception e)
                {
                    log.LogError($"LoadTestingCleanup // Run // Error occured when deleting instance: {instance.AppId}/{instance.InstanceOwner.PartyId}/{instance.Id}."
                        + $"\r Exception {e}");
                }
            }

            return new OkObjectResult($"{instances.Count} instances and all related data has been successfully deleted.");
        }
    }
}
