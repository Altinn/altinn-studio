using Azure.Storage.Queues.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Functions
{
    public class DelegationEventsPoison
    {
        [FunctionName(nameof(DelegationEventsPoison))]
        public void Run([QueueTrigger("delegationevents-poison", Connection = "QueueStorage")] QueueMessage queueMessage, ILogger log)
        {
            log.LogCritical("Failed processing delegation queue item: id={id}, inserted={inserted}, expires={expires}, body={body}",
                queueMessage.MessageId,
                queueMessage.InsertedOn,
                queueMessage.ExpiresOn,
                queueMessage.Body.ToString()
            );
        }
    }
}
