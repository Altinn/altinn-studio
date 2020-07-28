using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Storage.DataCleanup;
using Altinn.Platform.Storage.DataCleanup.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Hosting;
using Microsoft.Extensions.Logging;

[assembly: WebJobsStartup(typeof(Startup))]
#pragma warning disable IDE0060

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Azure Function class for handling tasks related to nightly data cleanup.
    /// </summary>
    public class NightlyCleanup
    {
        private readonly ICosmosService _cosmosService;

        /// <summary>
        /// Initializes a new instance of the <see cref="NightlyCleanup"/> class.
        /// </summary>
        /// <param name="cosmosService">The Cosmos DB service</param>
        public NightlyCleanup(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService;
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
                if (instance.Data.Count > 0)
                {
                    await _cosmosService.DeleteDataElementDocuments(new Guid(instance.Id));
                }

                await _cosmosService.DeleteInstanceDocument(new Guid(instance.Id), instance.InstanceOwner.PartyId);
            }
        }
    }
}
