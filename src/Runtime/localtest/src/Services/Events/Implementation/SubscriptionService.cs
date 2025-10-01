using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;

namespace Altinn.Platform.Events.Services
{
    /// <inheritdoc/>
    public class SubscriptionService : ISubscriptionService
    {
        private const string OrganisationPrefix = "/org/";
        private const string PersonPrefix = "/person/";
        private const string UserPrefix = "/user/";
        private const string OrgPrefix = "/org/";
        private const string PartyPrefix = "/party/";

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionService"/> class.
        /// </summary>
        public SubscriptionService()
        {
        }

        /// <inheritdoc/>
        public Task<(Subscription Subscription, ServiceError Error)> CreateSubscription(Subscription eventsSubscription)
        {
            return Task.FromResult<(Subscription, ServiceError)>((eventsSubscription, null));
        }

        /// <inheritdoc/>
        public Task<ServiceError> DeleteSubscription(int id)
        {
           throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<(Subscription Subscription, ServiceError Error)> GetSubscription(int id)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<List<Subscription>> GetOrgSubscriptions(string source, string subject, string type)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<List<Subscription>> GetSubscriptions(string source, string subject, string type)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<(List<Subscription> Subscription, ServiceError Error)> GetAllSubscriptions(string consumer)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<(Subscription Subscription, ServiceError Error)> SetValidSubscription(int id)
        {
            throw new NotImplementedException();
        }
    }
}
