using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for the instance event
    /// </summary>
    public class InstanceEvent
    {
        /// <summary>
        /// Gets or sets identifier used to identify unique instance events.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public Guid? Id { get; set; }

        /// <summary>
        /// Gets or sets identifier used to identify unique instance
        /// </summary>
        [JsonProperty(PropertyName = "instanceId")]
        public string InstanceId { get; set; }

        /// <summary>
        /// Gets or sets identifier used to identify when Authentication Event was created
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime? CreatedDateTime { get; set; }

        /// <summary>
        /// Gets or sets identifier used to identify what type of Instance Event
        /// </summary>
        [JsonProperty(PropertyName = "eventType")]
        public string EventType { get; set; }

        /// <summary>
        /// Gets or sets identifier used to identify unique instance owner
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerId")]
        public string InstanceOwnerId { get; set; }

        /// <summary>
        /// Gets or sets identifier used to identify user who created Authorization Event
        /// </summary>
        [JsonProperty(PropertyName = "userId")]
        public int? UserId { get; set; }

        /// <summary>
        /// Gets or sets Identifier used to identify the authentication level for the user which triggered the event
        /// </summary>
        [JsonProperty(PropertyName = "authenticationLevel")]
        public int AuthenticationLevel { get; set; }

        /// <summary>
        /// Get or sets identifier used to identify the end user system that triggered the event
        /// </summary>
        [JsonProperty(PropertyName = "endUserSystemId")]
        public int? EndUserSystemId { get; set; }

        /// <summary>
        /// Gets or sets identifier used to identify the workflow step during which the event occured
        /// </summary>
        [JsonProperty(PropertyName = "workflowStep")]
        public string WorkflowStep { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
