using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Platform.Events.Authorization;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Services
{
    /// <inheritdoc/>
    public class SubscriptionService : ISubscriptionService
    {
        private readonly IPostgresRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionService"/> class.
        /// </summary>
        public SubscriptionService(IPostgresRepository repository)
        {
            _repository = repository;
        }

        /// <inheritdoc/>
        public async Task<int> CreateSubscription(EventsSubscription eventsSubcrition)
        {
            return await _repository.CreateEventsSubscription(eventsSubcrition);
        }

        /// <inheritdoc/>
        public void DeleteSubscription(int id)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public List<EventsSubscription> FindSubscriptions(string receiver, string source, string org)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public EventsSubscription GetSubscription(int id)
        {
            throw new NotImplementedException();
        }
    }
}
