using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// This interface describes the public contract of a repository implementation for <see cref="Subscription"/>
    /// </summary>
    public interface ISubscriptionRepository
    {
        /// <summary>
        /// Creates an subscription in repository
        /// </summary>
        Task<Subscription> CreateSubscription(Subscription eventsSubscription);

        /// <summary>
        /// Gets a specific subscription
        /// </summary>
        Task<Subscription> GetSubscription(int id);

        /// <summary>
        /// Deletes a given subscription
        /// </summary>
        Task DeleteSubscription(int id);

        /// <summary>
        /// Set a subscription as Valid
        /// </summary>
        Task SetValidSubscription(int id);

        /// <summary>
        /// Gets subscriptions by source excluding orgs
        /// </summary>
        Task<List<Subscription>> GetSubscriptionsExcludeOrg(string source, string subject, string type);

        /// <summary>
        /// Gets subscriptions for a given consumer
        /// consumer = "/org/%" will return subscriptions for all orgs
        /// </summary>
        Task<List<Subscription>> GetSubscriptionsByConsumer(string consumer);
    }
}
