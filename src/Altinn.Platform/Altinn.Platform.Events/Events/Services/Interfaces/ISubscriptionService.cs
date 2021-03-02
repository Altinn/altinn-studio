using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface for subscription service
    /// </summary>
    public interface ISubscriptionService
    {
        /// <summary>
        /// Operation to create a subscription
        /// </summary>
        /// <param name="eventsSubcrition">The event subscription</param>
        public Task<int> CreateSubscription(Subscription eventsSubcrition);

        /// <summary>
        /// Operation to delete a given subscriptions
        /// </summary>
        public Task DeleteSubscription(int id);

        /// <summary>
        /// Opeation to list all events 
        /// </summary>
        public List<Subscription> FindSubscriptions(string receiver, string source, string org);

        /// <summary>
        /// Get a given subscription
        /// </summary>
        /// <param name="id">The subcription Id</param>
        public Task<Subscription> GetSubscription(int id);
    }
}
