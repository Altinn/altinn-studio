using System;
using Newtonsoft.Json;

namespace AltinnCore.Common.Models
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
        [JsonProperty(PropertyName = "reporteeId")]
        public string ReporteeId { get; set; }

        /// <summary>
        /// id of the service
        /// </summary>
        [JsonProperty(PropertyName = "serviceId")]
        public string ServiceId { get; set; }

        /// <summary>
        /// Type of the instance
        /// </summary>
        [JsonProperty(PropertyName = "instanceType")]
        public string InstanceType { get; set; }

        /// <summary>
        /// status of the instance
        /// </summary>
        [JsonProperty(PropertyName = "instanceStatus")]
        public string InstanceStatus { get; set; }

        /// <summary>
        /// create date and time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who created the instance
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who last changed the instance
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

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
        [JsonProperty(PropertyName = "title")]
        public string Title { get; set; }

        /// <summary>
        /// service owner code for the service
        /// </summary>
        [JsonProperty(PropertyName = "serviceOwner")]
        public string ServiceOwner { get; set; }

        /// <summary>
        /// external system reference if the element is sent from external systems
        /// </summary>
        [JsonProperty(PropertyName = "externalSystemReference")]
        public string ExternalSystemReference { get; set; }

        /// <summary>
        /// the associated workflow id for the service
        /// </summary>
        [JsonProperty(PropertyName = "workflowId")]
        public string WorkflowId { get; set; }

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
        [JsonProperty(PropertyName = "isArchived")]
        public bool IsArchived { get; set; }

        /// <summary>
        /// Gets or sets the number of forms associated with the instance
        /// </summary>
        [JsonProperty(PropertyName = "numberOfForms")]
        public int NumberOfForms { get; set; }

        /// <summary>
        /// Gets or sets the form ids associated with the instance
        /// </summary>
        [JsonProperty(PropertyName = "formId")]
        public string[] FormId { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
