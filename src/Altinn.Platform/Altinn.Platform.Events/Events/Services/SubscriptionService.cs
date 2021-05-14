using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services.Interfaces;

namespace Altinn.Platform.Events.Services
{
    /// <inheritdoc/>
    public class SubscriptionService : ISubscriptionService
    {
        private readonly ISubscriptionRepository _repository;
        private readonly IQueueService _queue;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionService"/> class.
        /// </summary>
        public SubscriptionService(ISubscriptionRepository repository, IQueueService queue)
        {
            _repository = repository;
            _queue = queue;
        }

        /// <inheritdoc/>
        public async Task<Subscription> CreateSubscription(Subscription eventsSubcrition)
        {
            Subscription subscription = await _repository.CreateSubscription(eventsSubcrition);
            await _queue.PushToValidationQueue(JsonSerializer.Serialize(subscription));
            return subscription;
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

        /// <inheritdoc/>
        public async Task<List<Subscription>> GetOrgSubscriptions(string source, string subject, string type)
        {
            List<Subscription> searchresult = await _repository.GetSubscriptionsByConsumer("/org/%");
            return searchresult.Where(s =>
                source.StartsWith(s.SourceFilter.OriginalString) &&
                (s.SubjectFilter == null || s.SubjectFilter.Equals(subject)) &&
                (s.TypeFilter == null || s.TypeFilter.Equals(type))).ToList();
        }

        /// <inheritdoc/>
        public async Task<List<Subscription>> GetSubscriptions(string source, string subject, string type)
        {
            return await _repository.GetSubscriptionsExcludeOrg(source, subject, type);
        }

        /// <inheritdoc/>
        public async Task SetValidSubscription(int id)
        {
            await _repository.SetValidSubscription(id);
        }
    }
}
