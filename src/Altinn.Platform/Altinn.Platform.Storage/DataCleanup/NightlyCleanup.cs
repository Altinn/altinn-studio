using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Storage.DataCleanup.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

#pragma warning disable IDE0060
namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Azure Function class for handling tasks related to nightly data cleanup.
    /// </summary>
    public class NightlyCleanup
    {
        private readonly ICosmosService _cosmosService;
        private readonly IBlobService _blobService;

        /// <summary>
        /// Initializes a new instance of the <see cref="NightlyCleanup"/> class.
        /// </summary>
        /// <param name="cosmosService">The Cosmos DB service.</param>
        /// <param name="blobService">The blob service.</param>
        public NightlyCleanup(ICosmosService cosmosService, IBlobService blobService)
        {
            _cosmosService = cosmosService;
            _blobService = blobService;
        }

        /// <summary>
        /// Runs nightly cleanup.
        /// </summary>
        /// <param name="timer">The trigger timer.</param>
        /// <param name="log">The log.</param>
        [FunctionName("NightlyCleanup")]
        public async Task Run([TimerTrigger("0 0 3 * * 1-5", RunOnStartup = false)] TimerInfo timer, ILogger log)
        {
            List<Instance> instances = await _cosmosService.GetHardDeletedInstances();

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

                    if (dataElementMetadataDeleted)
                    {
                        await _cosmosService.DeleteInstanceDocument(instance.Id, instance.InstanceOwner.PartyId);
                        log.LogInformation($"NightlyCleanup // Run // Instance deleted: {instance.AppId}/{instance.InstanceOwner.PartyId}/{instance.Id}");
                    }
                }
                catch (Exception e)
                {
                    log.LogError($"NightlyCleanup // Run // Error occured when deleting instance: {instance.AppId}/{instance.InstanceOwner.PartyId}/{instance.Id}."
                        + $"\r Exception {e}");
                }
            }
        }
    }
}
