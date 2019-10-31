using System;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for the instance event.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class InstanceEvent
    {
        /// <summary>
        /// unique identifier of the event
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public Guid? Id { get; set; }

        /// <summary>
        /// the instance the event refers to
        /// </summary>
        [JsonProperty(PropertyName = "instanceId")]
        public string InstanceId { get; set; }

        /// <summary>
        /// the data element which the event refers to
        /// </summary>
        [JsonProperty(PropertyName = "dataId")]
        public string DataId { get; set; }

        /// <summary>
        /// event creation date-time
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime? CreatedDateTime { get; set; }

        /// <summary>
        /// the event type, e.g. created, saved, workflow-change
        /// </summary>
        [JsonProperty(PropertyName = "eventType")]
        public string EventType { get; set; }

        /// <summary>
        /// the instance owner id
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerId")]
        public string InstanceOwnerId { get; set; }

        /// <summary>
        /// the user who created
        /// </summary>
        [JsonProperty(PropertyName = "userId")]
        public int? UserId { get; set; }

        /// <summary>
        /// the authentication level for the user which triggered the event
        /// </summary>
        [JsonProperty(PropertyName = "authenticationLevel")]
        public int AuthenticationLevel { get; set; }

        /// <summary>
        /// the end user system that triggered the event
        /// </summary>
        [JsonProperty(PropertyName = "endUserSystemId")]
        public int? EndUserSystemId { get; set; }

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
