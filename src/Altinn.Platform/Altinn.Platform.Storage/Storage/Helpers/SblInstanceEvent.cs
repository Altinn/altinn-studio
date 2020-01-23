using System;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for the instance event for interaction with the SBL solution
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class SblInstanceEvent
    {
        /// <summary>
        /// unique identifier of the event
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public Guid? Id { get; set; }

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
        /// the user who triggered the event
        /// </summary>
        [JsonProperty(PropertyName = "user")]
        public PlatformUser User { get; set; }
        
        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
