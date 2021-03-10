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
            OutboundQue = new Dictionary<string, List<CloudEventEnvelope>>();
        }

        /// <summary>
        /// Quee
        /// </summary>
        public static Dictionary<string, List<CloudEventEnvelope>> OutboundQue { get; set; }

        public Task<PushQueueReceipt> PushToOutboundQueue(string content)
        {
            CloudEventEnvelope cloudEventEnvelope = JsonSerializer.Deserialize<CloudEventEnvelope>(content);

            if (!OutboundQue.ContainsKey(cloudEventEnvelope.CloudEvent.Id))
            {
                OutboundQue.Add(cloudEventEnvelope.CloudEvent.Id, new List<CloudEventEnvelope>());
            }

            OutboundQue[cloudEventEnvelope.CloudEvent.Id].Add(cloudEventEnvelope);

            return Task.FromResult(new PushQueueReceipt { Success = true });
        }

        public Task<PushQueueReceipt> PushToQueue(string content)
        {
            return Task.FromResult(new PushQueueReceipt { Success = true});
        }
    }
}
