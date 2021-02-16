using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Altinn.Platform.Events.Services.Interfaces;

using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Handles events sevice. 
    /// Notice when saving cloudevent:
    /// - the id for the cloudevent is created by the app
    /// - time is set to null, it will be created in the database
    /// </summary>
    public class EventsService : IEventsService
    {
        private readonly IPostgresRepository _repository;
        private readonly IQueueService _queue;
        private readonly ILogger<IEventsService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsService"/> class.
        /// </summary>
        public EventsService(
            IPostgresRepository repository,
            IQueueService queue,
            ILogger<IEventsService> logger)
        {
            _repository = repository;
            _queue = queue;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> StoreCloudEvent(CloudEvent cloudEvent)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            cloudEvent.Time = null;
            string cloudEventId = await _repository.Create(cloudEvent);
            PushQueueReceipt receipt = await _queue.PushToQueue(JsonSerializer.Serialize(cloudEvent));

            if (!receipt.Success)
            {
                _logger.LogError("// EventsService // StoreCloudEvent // Failed to push event {EventId} to queue. Exception {Exception}", cloudEventId, receipt.Exception);
            }

            return cloudEventId;
        }

        /// <inheritdoc/>
        public async Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, int partyId, List<string> source, List<string> type, int size = 50)
        {
            string subject = partyId == 0 ? string.Empty : $"/party/{partyId}";
            source = source.Any() ? source : null;
            type = type.Any() ? type : null;
            after ??= string.Empty;

            return await _repository.Get(after, from, to, subject, source, type, size);
        }
    }
}
