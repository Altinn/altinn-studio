using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Cloud event envelope to push
    /// </summary>
    public class CloudEventEnvelope
    {
        /// <summary>
        /// The Event to push
        /// </summary>
        public CloudEvent CloudEvent { get; set; }

        /// <summary>
        /// The time the event was pushed to queue
        /// </summary>
        public DateTime Pushed { get; set; }

        /// <summary>
        /// Target URI to push event
        /// </summary>
        public Uri Endpoint { get; set; }

        /// <summary>
        /// The consumer of the events
        /// </summary>
        public string Consumer { get; set; }

        /// <summary>
        /// The subscription id that matched.
        /// </summary>
        public int SubscriptionId { get; set; }
    }
}
