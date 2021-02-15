using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Model for process history items.
    /// Represents a step in an instances' process and holds metadata.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ProcessHistoryItem
    {
        /// <summary>
        /// The event type
        /// </summary>
        public string EventType { get; set; }

        /// <summary>
        /// The element id
        /// </summary>
        public string ElementId { get; set; }

        /// <summary>
        /// The occured
        /// </summary>
        public DateTime? Occured { get; set; }

        /// <summary>
        /// The start time
        /// </summary>
        public DateTime? Started { get; set; }

        /// <summary>
        /// The end time for process
        /// </summary>
        public DateTime? Ended { get; set; }
    }

    /// <summary>
    /// Represents a container object with a list of process history items.
    /// </summary>
    /// <remarks>
    /// This should be used only when an API endpoint would otherwise return a list of process history items.
    /// Not when a list is a property of a separate class.
    /// </remarks>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class ProcessHistoryList
    {
        /// <summary>
        /// The actual list of process history items.
        /// </summary>
        [JsonProperty(PropertyName = "processHistory")]
        public List<ProcessHistoryItem> ProcessHistory { get; set; }
    }
}
