using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
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
        private IPostgresRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsService"/> class.
        /// </summary>
        public EventsService(IPostgresRepository repository, ILogger<EventsService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> StoreCloudEvent(CloudEvent cloudEvent)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            cloudEvent.Time = null;
            return await _repository.Create(cloudEvent);
        }
    }
}