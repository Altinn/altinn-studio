using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Platform.Events.Authorization;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Services
{
    /// <inheritdoc/>
    public class EventsSubscriptionService : IEventsSubscriptionService
    {
        /// <inheritdoc/>
        public void CreateSubscription(EventsSubscription eventsSubcrition)
        {
            // TODO call repository


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
