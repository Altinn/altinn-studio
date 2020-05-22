using System;
using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents an instance.
    /// Instances are metadata containers that are used to track the state of one use of an application.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Instance : ChangableElement
    {
        /// <summary>
        /// Gets or sets the unique id of the instance {instanceOwnerId}/{instanceGuid}.
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the instance owner information. 
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwner")]
        public InstanceOwner InstanceOwner { get; set; }

        /// <summary>
        /// Gets or sets the id of the application this is an instance of, e.g. {org}/{app22}.
        /// </summary>
        [JsonProperty(PropertyName = "appId")]
        public string AppId { get; set; }

        /// <summary>
        /// Gets or sets application owner identifier, usually a abbreviation of organisation name. All in lower case.
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets a set of URLs to access the instance metadata resource.
        /// </summary>
        [JsonProperty(PropertyName = "selfLinks")]
        public ResourceLinks SelfLinks { get; set; }

        /// <summary>
        /// Gets or sets the due date to submit the instance to application owner.
        /// </summary>
        [JsonProperty(PropertyName = "dueBefore")]
        public DateTime? DueBefore { get; set; }

        /// <summary>
        /// Gets or sets date and time for when the instance should first become visible for the instance owner.
        /// </summary>
        [JsonProperty(PropertyName = "visibleAfter")]
        public DateTime? VisibleAfter { get; set; }

        /// <summary>
        /// Gets or sets an object containing the instance process state.
        /// </summary>
        [JsonProperty(PropertyName = "process")]
        public ProcessState Process { get; set; }

        /// <summary>
        /// Gets or sets the type of finished status of the instance.
        /// </summary>
        [JsonProperty(PropertyName = "status")]
        public InstanceStatus Status { get; set; }

        /// <summary>
        /// Gets or sets an object for application owner properties.
        /// </summary>
        [JsonProperty(PropertyName = "appOwner")]
        public ApplicationOwnerState AppOwner { get; set; }

        /// <summary>
        /// Gets or sets a list of <see cref="CompleteConfirmation"/> elements.
        /// </summary>
        [JsonProperty(PropertyName = "completeConfirmations")]
        public List<CompleteConfirmation> CompleteConfirmations { get; set; }

        /// <summary>
        /// Gets or sets a list of data elements associated with the instance
        /// </summary>
        [JsonProperty(PropertyName = "data")]
        public List<DataElement> Data { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }

        /// <summary>
        /// Sets platform self links for the instance.
        /// </summary>
        /// <param name="storageHostAndBase">The host and basepath for platform storage. E.g. 'at22.altinn.cloud/storage/api/v1/'. Must end with '/'.</param>
        public void SetPlatformSelflink(string storageHostAndBase)
        {
            if (SelfLinks == null)
            {
                SelfLinks = new ResourceLinks();
            }

            SelfLinks.Platform = $"https://platform.{storageHostAndBase}instances/{this.Id}";

            if (Data != null)
            {
                foreach (DataElement element in Data)
                {
                    element.SetPlatformSelflink(storageHostAndBase, int.Parse(this.InstanceOwner.PartyId));
                }
            }

        }

        /// <summary>
        /// Represents a container object with a list of instances.
        /// </summary>
        /// <remarks>
        /// This should be used only when an API endpoint would otherwise return a list of instances.
        /// Not when the list is a property of a separate class.
        /// </remarks>
        [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
        public class InstanceList
        {
            /// <summary>
            /// The actual list of instances.
            /// </summary>
            [JsonProperty(PropertyName = "instances")]
            public List<Instance> Instances { get; set; }
        }
    }
}
