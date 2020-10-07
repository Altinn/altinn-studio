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
    public class EventsPostgresService : IEventsPostgresService
    {
        private IEventsRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsPostgresService"/> class.
        /// </summary>
        public EventsPostgresService(IEventsRepository repository, ILogger<EventsPostgresService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> StoreItemToPostgresDb(CloudEvent cloudEvent)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            string cloudtext = "something json";
            return await _repository.Create(cloudEvent, cloudtext);
        }
    }
}