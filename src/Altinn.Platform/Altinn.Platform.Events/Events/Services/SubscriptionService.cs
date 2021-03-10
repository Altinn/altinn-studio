using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Altinn.Platform.Events.Services.Interfaces;

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
        public async Task<int> CreateSubscription(Subscription eventsSubcrition)
        {
            return await _repository.CreateEventsSubscription(eventsSubcrition);
        }

        /// <inheritdoc/>
        public async Task DeleteSubscription(int id)
        {
            await _repository.DeleteSubscription(id);
        }

        /// <inheritdoc/>
        public List<Subscription> FindSubscriptions(string receiver, string source, string org)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public async Task<Subscription> GetSubscription(int id)
        {
            return await _repository.GetSubscription(id);
        }
    }
}
