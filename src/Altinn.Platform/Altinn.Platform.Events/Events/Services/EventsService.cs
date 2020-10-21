using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Altinn.Platform.Events.Services.Interfaces;

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

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsService"/> class.
        /// </summary>
        public EventsService(IPostgresRepository repository)
        {
            _repository = repository;
        }

        /// <inheritdoc/>
        public async Task<string> StoreCloudEvent(CloudEvent cloudEvent)
        {
            cloudEvent.Id = Guid.NewGuid().ToString();
            cloudEvent.Time = null;
            return await _repository.Create(cloudEvent);
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
