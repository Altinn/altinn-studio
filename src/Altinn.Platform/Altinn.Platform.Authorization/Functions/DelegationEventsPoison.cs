using Azure.Storage.Queues.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

// ReSharper disable UnusedMember.Global
namespace Altinn.Platform.Authorization.Functions;

/// <summary>
/// Function endpoint handling queue messages that failed multiple times
/// </summary>
public class DelegationEventsPoison
{
    /// <summary>
    /// Logs the failed message to Application Insights.
    /// </summary>
    /// <param name="queueMessage">The queue message.</param>
    /// <param name="log">The log.</param>
    [FunctionName(nameof(DelegationEventsPoison))]
    public void Run([QueueTrigger("delegationevents-poison", Connection = "QueueStorage")] QueueMessage queueMessage, ILogger log)
    {
        log.LogCritical(
            "Failed processing delegation queue item: id={id}, inserted={inserted}, expires={expires}, body={body}",
            queueMessage.MessageId,
            queueMessage.InsertedOn,
            queueMessage.ExpiresOn,
            queueMessage.Body.ToString());
    }
}
