using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Platform.Storage.DataCleanup.Data;
using Altinn.Platform.Storage.DataCleanup.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Azure Function class for handling tasks related update instances.
    /// </summary>
    public class UpdateInstances
    {
        private readonly ICosmosService _cosmosService;

        /// <summary>
        /// Initializes a new instance of the <see cref="UpdateInstances"/> class.
        /// </summary>
        /// <param name="cosmosService">The Cosmos DB service.</param>
        public UpdateInstances(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService;
        }

        /// <summary>
        /// Runs nightly cleanup.
        /// </summary>
        /// <param name="req">The http request.</param>
        /// <param name="log">The log.</param>
        [FunctionName("UpdateInstances")]
        public async Task Run([HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequest req, ILogger log)
        {
            Stopwatch stopWatch = new Stopwatch();
            InstanceList instanceList = new InstanceList();
            int failed = 0;
            int total = 0;
            do
            {
                stopWatch.Restart();
                instanceList = await _cosmosService.GetAllInstances(instanceList.ContinuationToken);

                foreach (Instance instance in instanceList.Instances)
                {
                    try
                    {
                        if (instance.Status == null)
                        {
                            instance.Status = new InstanceStatus();
                        }

                        instance.Status.IsArchived = instance.Status.Archived.HasValue;
                        instance.Status.IsHardDeleted = instance.Status.HardDeleted != null ? true : false;
                        instance.Status.IsSoftDeleted = instance.Status.SoftDeleted != null ? true : false;
                        if (instance.VisibleAfter == null)
                        {
                            instance.VisibleAfter = instance.Created;
                        }

                        await _cosmosService.UpdateInstance(instance);
                    }
                    catch (Exception e)
                    {
                        log.LogError($"UpdateInstances // Run // Error occured when updating instance: {instance.AppId}/{instance.InstanceOwner.PartyId}/{instance.Id}."
                            + $"\r Exception {e}");
                        failed++;
                    }
                }

                stopWatch.Stop();
                log.LogInformation($"Update of {instanceList.Instances.Count} instances, time used " + stopWatch.Elapsed.ToString());
                total += instanceList.Instances.Count;
            }
            while (instanceList.ContinuationToken != null);
            log.LogInformation($"Update complete. Total instances updated: {total}, count of failed updates: {failed}");
        }
    }
}
