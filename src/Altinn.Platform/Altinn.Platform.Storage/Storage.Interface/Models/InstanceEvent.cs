using System;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Model for the instance event.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceEvent
    {
        /// <summary>
        /// unique identifier of the event.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public Guid? Id { get; set; }

        /// <summary>
        /// the instance the event refers to {instanceOwnerId}/{instanceGuid}.
        /// </summary>
        [JsonProperty(PropertyName = "instanceId")]
        public string InstanceId { get; set; }

        /// <summary>
        /// the data element which the event refers to, or null.
        /// </summary>
        [JsonProperty(PropertyName = "dataId")]
        public string DataId { get; set; }

        /// <summary>
        /// event creation date-time
        /// </summary>
        [JsonProperty(PropertyName = "created")]
        public DateTime? Created { get; set; }

        /// <summary>
        /// the event type, e.g. created, saved, process-change.
        /// </summary>
        [JsonProperty(PropertyName = "eventType")]
        public string EventType { get; set; }

        /// <summary>
        /// the instance owner party id.
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerPartyId")]
        public string InstanceOwnerPartyId { get; set; }

        /// <summary>
        /// the user who triggered the event.
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
}
