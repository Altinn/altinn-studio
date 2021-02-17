using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;

using Azure.Storage.Queues;

using Microsoft.Extensions.Options;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// The queue service that handles actions related to the queue storage.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class QueueService : IQueueService
    {
        private readonly QueueStorageSettings _settings;

        private QueueClient _inboundQueueClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="QueueService"/> class.
        /// </summary>
        /// <param name="settings">The queue storage settings</param>
        public QueueService(IOptions<QueueStorageSettings> settings)
        {
            _settings = settings.Value;
        }

        /// <inheritdoc/>
        public async Task<PushQueueReceipt> PushToQueue(string content)
        {
            if (!_settings.EnablePushToQueue)
            {
                return new PushQueueReceipt { Success = true };
            }

            try
            {
                QueueClient client = await GetInboundQueueClient();
                await client.SendMessageAsync(content);
            }
            catch (Exception e)
            {
                return new PushQueueReceipt { Success = false, Exception = e };
            }

            return new PushQueueReceipt { Success = true };
        }

        private async Task<QueueClient> GetInboundQueueClient()
        {
            if (_inboundQueueClient == null)
            {
                _inboundQueueClient = new QueueClient(_settings.ConnectionString, _settings.InboundQueueName);
                await _inboundQueueClient.CreateIfNotExistsAsync();
            }

            return _inboundQueueClient;
        }
    }
}
