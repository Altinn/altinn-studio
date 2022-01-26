using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Storage.Queue.Protocol;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorzation.Functions
{
    public class DelegationEvents
    {
        private readonly ILogger _logger;

        public DelegationEvents(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<DelegationEvents>();
        }

        [Function("DelegationEvents")]
        public async Task Run([QueueTrigger("delegationevents", Connection = "DelegationEventsQueueStorage")] string myQueueItem)
        {
            _logger.LogInformation($"C# Queue trigger function processed: {myQueueItem}");
            await Task.CompletedTask;
        }
    }
}
