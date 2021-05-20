using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;

namespace Altinn.Platform.Events.Tests.Mocks
{
    public class QueueServiceMock : IQueueService
    {
        public QueueServiceMock()
        {
            OutboundQueue = new Dictionary<string, List<CloudEventEnvelope>>();
        }

        /// <summary>
        /// Queumock for unit test
        /// </summary>
        public static Dictionary<string, List<CloudEventEnvelope>> OutboundQueue { get; set; }

        public Task<PushQueueReceipt> PushToOutboundQueue(string content)
        {
            CloudEventEnvelope cloudEventEnvelope = JsonSerializer.Deserialize<CloudEventEnvelope>(content);

            if (!OutboundQueue.ContainsKey(cloudEventEnvelope.CloudEvent.Id))
            {
                OutboundQueue.Add(cloudEventEnvelope.CloudEvent.Id, new List<CloudEventEnvelope>());
            }

            OutboundQueue[cloudEventEnvelope.CloudEvent.Id].Add(cloudEventEnvelope);

            return Task.FromResult(new PushQueueReceipt { Success = true });
        }

        public Task<PushQueueReceipt> PushToQueue(string content)
        {
            return Task.FromResult(new PushQueueReceipt { Success = true });
        }

        public Task<PushQueueReceipt> PushToValidationQueue(string content)
        {
            return Task.FromResult(new PushQueueReceipt { Success = true });
        }
    }
}
