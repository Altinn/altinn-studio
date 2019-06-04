using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Holds metadata of an application instance for a particular instance owner.
    /// </summary>
    public class Instance
    {
        /// <summary>
        /// unique id of the instance {integer}/{guid}
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// owner of the instance.
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerId")]
        public string InstanceOwnerId { get; set; }

        /// <summary>
        /// instance owner lookup. Only to be used when instantiating an application instance. Will be set to null by storage.
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerLookup")]
        public InstanceOwnerLookup InstanceOwnerLookup { get; set; }

        /// <summary>
        /// Links to access the instance resource
        /// </summary>
        [JsonProperty(PropertyName = "selfLinks")]
        public ResourceLinks SelfLinks { get; set; }

        /// <summary>
        /// id of the application, e.g. org/app22
        /// </summary>
        [JsonProperty(PropertyName = "appId")]
        public string AppId { get; set; }

        /// <summary>
        /// application owner for the service, should be lower case.
        /// </summary>
        [JsonProperty(PropertyName = "org")]
        public string Org { get; set; }

        /// <summary>
        /// Label mechanism, can be used to set external system references
        /// </summary>
        [JsonProperty(PropertyName = "labels")]
        public List<string> Labels { get; set; }

        /// <summary>
        /// create date and time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// user id of the user who created the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime? LastChangedDateTime { get; set; }

        /// <summary>
        /// user id of the user who last changed the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

        /// <summary>
        /// due date to submit the instance to application owner.
        /// </summary>
        [JsonProperty(PropertyName = "dueDateTime")]
        public DateTime? DueDateTime { get; set; }

        /// <summary>
        /// date time to show the instance in inbox
        /// </summary>
        [JsonProperty(PropertyName = "visibleDateTime")]
        public DateTime? VisibleDateTime { get; set; }

        /// <summary>
        /// title of the instance
        /// </summary>
        [JsonProperty(PropertyName = "presentationField")]
        public LanguageString PresentationField { get; set; }

        /// <summary>
        /// Workflow state section
        /// </summary>
        [JsonProperty(PropertyName = "workflow")]
        public WorkflowState Workflow { get; set; }

        /// <summary>
        /// Section for instance state properties
        /// </summary>
        [JsonProperty(PropertyName = "instanceState")]
        public InstanceState InstanceState { get; set; }

        /// <summary>
        /// Section for app owner state properties
        /// </summary>
        [JsonProperty(PropertyName = "appOwnerState")]
        public ApplicationOwnerState AppOwnerState { get; set; }

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
