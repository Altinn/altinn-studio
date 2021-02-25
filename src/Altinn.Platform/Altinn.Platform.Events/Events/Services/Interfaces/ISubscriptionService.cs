using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface for 
    /// </summary>
    public interface ISubscriptionService
    {
        /// <summary>
        /// Operation to create a subscription
        /// </summary>
        /// <param name="eventsSubcrition">The event subscription</param>
        public Task<int> CreateSubscription(EventsSubscription eventsSubcrition);

        /// <summary>
        /// Operation to delete a given subscriptions
        /// </summary>
        public Task DeleteSubscription(int id);

        /// <summary>
        /// Opeation to list all events 
        /// </summary>
        public List<EventsSubscription> FindSubscriptions(string receiver, string source, string org);

        /// <summary>
        /// Get a given subscription
        /// </summary>
        /// <param name="id">The subcription Id</param>
        /// <returns></returns>
        public Task<EventsSubscription> GetSubscription(int id);
    }
}
