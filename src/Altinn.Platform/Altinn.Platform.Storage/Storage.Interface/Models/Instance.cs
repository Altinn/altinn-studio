using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Holds metadata of an application instance for a particular instance owner.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Instance : ChangableElement
    {
        /// <summary>
        /// The unique id of the instance {instanceOwnerId}/{instanceGuid}.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// instance owner information. 
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwner")]
        public InstanceOwner InstanceOwner { get; set; }

        /// <summary>
        /// id of the application this is an instance of, e.g. {org}/{app22}.
        /// </summary>
        [JsonProperty(PropertyName = "appId")]
        public string AppId { get; set; }

        /// <summary>
        /// application owner identifier, usually a abbreviation of organisation name. All in lower case.
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

        /// <summary>
        /// Links to access the instance metadata resource.
        /// </summary>
        [JsonProperty(PropertyName = "selfLinks")]
        public ResourceLinks SelfLinks { get; set; }

        /// <summary>
        /// Due date to submit the instance to application owner.
        /// </summary>
        [JsonProperty(PropertyName = "dueBefore")]
        public DateTime? DueBefore { get; set; }

        /// <summary>
        /// Process state section
        /// </summary>
        [JsonProperty(PropertyName = "process")]
        public ProcessState Process { get; set; }

        /// <summary>
        /// Section for inbox properties
        /// </summary>
        [JsonProperty(PropertyName = "inbox")]
        public InboxState Inbox { get; set; }

        /// <summary>
        /// Section for app owner properties.
        /// </summary>
        [JsonProperty(PropertyName = "appOwner")]
        public ApplicationOwnerState AppOwner { get; set; }

        /// <summary>
        /// the data elements associated with the instance
        /// </summary>
        [JsonProperty(PropertyName = "data")]
        public List<DataElement> Data { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
