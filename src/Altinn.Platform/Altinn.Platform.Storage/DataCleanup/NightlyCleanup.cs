using System;
using System.Collections.Generic;
using System.Linq;
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
        public async Task Run([TimerTrigger("0 0 3 * * *", RunOnStartup = false)] TimerInfo timer, ILogger log)
        {
            List<Instance> instances = await _cosmosService.GetHardDeletedInstances();
            List<Application> applications = await _cosmosService.GetApplications(instances.Select(i => i.AppId).ToList());
            List<string> autoDeleteAppIds = applications.Where(a => a.AutoDeleteOnProcessEnd == true).Select(a => a.Id).ToList();

            foreach (Instance instance in instances)
            {
                bool dataElementsDeleted = false;
                bool instanceEventsDeleted = false;
                bool dataElementMetadataDeleted = false;

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

                    if (autoDeleteAppIds.Contains(instance.AppId))
                    {
                        instanceEventsDeleted = await _cosmosService.DeleteInstanceEventDocuments(instance.Id, instance.InstanceOwner.PartyId);
                    }

                    if ((instance.Data.Count == 0 || dataElementMetadataDeleted) && (!autoDeleteAppIds.Contains(instance.AppId) || instanceEventsDeleted))
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
