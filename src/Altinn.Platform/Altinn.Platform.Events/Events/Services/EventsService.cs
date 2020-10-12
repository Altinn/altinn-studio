using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Services
{
    /// <summary>
    /// Class that handles storing and retrieving data from Postgres Db
    /// </summary>
    public class EventsService : IEventsService
    {
        private IEventsPostgresRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsService"/> class.
        /// </summary>
        public EventsService(IEventsPostgresRepository repository, ILogger<EventsService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> StoreCloudEvent(CloudEvent cloudEvent)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            return await _repository.Create(cloudEvent);
        }
    }
}