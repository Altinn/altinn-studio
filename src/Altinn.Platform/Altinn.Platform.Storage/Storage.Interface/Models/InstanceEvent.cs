using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    ///Represents the an event related to an instance.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceEvent
    {
        /// <summary>
        /// Unique identifier of the event.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public Guid? Id { get; set; }

        /// <summary>
        /// The instance the event is referring to {instanceOwnerId}/{instanceGuid}.
        /// </summary>
        [JsonProperty(PropertyName = "instanceId")]
        public string InstanceId { get; set; }

        /// <summary>
        /// The data element which the event refers to, or null.
        /// </summary>
        [JsonProperty(PropertyName = "dataId")]
        public string DataId { get; set; }

        /// <summary>
        /// Event creation date-time
        /// </summary>
        [JsonProperty(PropertyName = "created")]
        public DateTime? Created { get; set; }

        /// <summary>
        /// The event type, e.g. created, saved, process-change.
        /// </summary>
        [JsonProperty(PropertyName = "eventType")]
        public string EventType { get; set; }

        /// <summary>
        /// The instance owner party id.
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerPartyId")]
        public string InstanceOwnerPartyId { get; set; }

        /// <summary>
        /// The user who triggered the event.
        /// </summary>
        [JsonProperty(PropertyName = "user")]
        public PlatformUser User;

        /// <summary>
        /// More information about the process event.
        /// Contains a snapshot of the changed currentTask element of the instance.
        /// If event type does not start with process: this field is not present.
        /// </summary>
        [JsonProperty(PropertyName = "processInfo")]
        public ProcessState ProcessInfo { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    /// <summary>
    /// Represents a container object with a list of events related to instances.
    /// </summary>
    /// <remarks>
    /// This should be used only when an API endpoint would otherwise return a list of instance events.
    /// Not when the list is a property of a separate class.
    /// </remarks>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceEventList
    {
        /// <summary>
        /// The actual list of instance events.
        /// </summary>
        [JsonProperty(PropertyName = "instanceEvents")]
        public List<InstanceEvent> InstanceEvents { get; set; }
    }
}
