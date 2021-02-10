using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Events.Models
{
    /// <summary>
    /// Class that describes a events subscriptions
    /// </summary>
    public class EventsSubscription
    {
        /// <summary>
        /// Endpoint to receive matching events
        /// </summary>
        public string EndPoint { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Filter on source
        /// </summary>
        public string SourceFilter { get; set; }

        /// <summary>
        /// Filter on subject
        /// </summary>
        public string SubjectFilter { get; set; }

        /// <summary>
        /// Filter on 
        /// </summary>
        public string AlternativeSubject { get; set; }
     }
}
