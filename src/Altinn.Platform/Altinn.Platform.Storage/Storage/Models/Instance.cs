using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Models
{
    /// <summary>
    /// Model for the instance
    /// </summary>
    public class Instance
    {
        /// <summary>
        /// unique id
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// owner of the instance
        /// </summary>
        [JsonProperty(PropertyName = "instanceOwnerId")]
        public string InstanceOwnerId { get; set; }

        /// <summary>
        /// id of the service
        /// </summary>
        [JsonProperty(PropertyName = "applicationId")]
        public string ApplicationId { get; set; }

        /// <summary>
        /// service owner code for the service
        /// </summary>
        [JsonProperty(PropertyName = "applicationOwnerId")]
        public string ApplicationOwnerId { get; set; }

        /// <summary>
        /// create date and time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who created the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public int CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who last changed the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public int LastChangedBy { get; set; }

        /// <summary>
        /// Due date to submit the form(instance)
        /// </summary>
        [JsonProperty(PropertyName = "dueDateTime")]
        public DateTime DueDateTime { get; set; }

        /// <summary>
        /// date time to show the instance in inbox
        /// </summary>
        [JsonProperty(PropertyName = "visibleDateTime")]
        public DateTime VisibleDateTime { get; set; }

        /// <summary>
        /// title of the instance
        /// </summary>
        [JsonProperty(PropertyName = "presentationField")]
        public string PresentationField { get; set; }

        /// <summary>
        /// external system reference if the element is sent from external systems
        /// </summary>
        [JsonProperty(PropertyName = "externalSystemReference")]
        public string ExternalSystemReference { get; set; }

        /// <summary>
        /// name of the current step / status
        /// </summary>
        [JsonProperty(PropertyName = "currentWorkflowStep")]
        public string CurrentWorkflowStep { get; set; }

        /// <summary>
        /// Gets or sets whether the element is deleted
        /// </summary>
        [JsonProperty(PropertyName = "isDeleted")]
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Gets or sets whether the element is archived
        /// </summary>
        [JsonProperty(PropertyName = "isCompleted")]
        public bool IsCompleted { get; set; }

        /// <summary>
        /// Gets or sets the form ids associated with the instance
        /// </summary>
        [JsonProperty(PropertyName = "data")]
        public Dictionary<string, Dictionary<string, Data>> Data { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }  
}
