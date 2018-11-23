using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace AltinnCore.Runtime.Db.Models
{
    /// <summary>
    /// Model for the reportee element
    /// </summary>
    public class ReporteeElement
    {
        /// <summary>
        /// unique id
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        /// <summary>
        /// owner of the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "reporteeId")]
        public string ReporteeId { get; set; }

        /// <summary>
        /// id of the service
        /// </summary>
        [JsonProperty(PropertyName = "serviceId")]
        public string ServiceId { get; set; }

        /// <summary>
        /// Id of the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "reporteeElementId")]
        public string ReporteeElementId { get; set; }

        /// <summary>
        /// Type of the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "reporteeElementType")]
        public string ReporteeElementType { get; set; }

        /// <summary>
        /// status of the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "reporteeElementStatus")]
        public string ReporteeElementStatus { get; set; }

        /// <summary>
        /// create date and time for the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who created the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        /// <summary>
        /// last changed date time for the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        /// <summary>
        /// reportee id of the user who last changed the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

        /// <summary>
        /// Due date to submit the form(reportee element)
        /// </summary>
        [JsonProperty(PropertyName = "dueDateTime")]
        public DateTime DueDateTime { get; set; }

        /// <summary>
        /// date time to show the reportee element in inbox
        /// </summary>
        [JsonProperty(PropertyName = "visibleDateTime")]
        public DateTime VisibleDateTime { get; set; }

        /// <summary>
        /// title of the reportee element
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
        /// Gets or sets the number of forms associated with the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "numberOfForms")]
        public int NumberOfForms { get; set; }

        /// <summary>
        /// Gets or sets the form ids associated with the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "formId")]
        public string[] FormId { get; set; }

        /// <summary>
        /// the attachment list associated witht the reportee element
        /// </summary>
        [JsonProperty(PropertyName = "Attachments")]
        public Attachments ReporteeElementAttachment { get; set; }

        /// <summary>
        /// the correspondence message 
        /// </summary>
        [JsonProperty(PropertyName = "message")]
        public Correspondence Message { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    /// <summary>
    /// attachment model
    /// </summary>
    public class Attachments
    {
        /// <summary>
        /// Gets or sets unique id for the attachment
        /// </summary>
        [JsonProperty(PropertyName = "attachmentId")]
        public string AttachmentId { get; set; }

        /// <summary>
        /// Gets or sets content type of the attachment file
        /// </summary>
        [JsonProperty(PropertyName = "contentType")]
        public string ContentType { get; set; }

        /// <summary>
        /// Gets or sets the attachment name 
        /// </summary>
        [JsonProperty(PropertyName = "attachmentName")]
        public string AttachmentName { get; set; }

        /// <summary>
        /// Gets or sets the path where the attachment is stored
        /// </summary>
        [JsonProperty(PropertyName = "attachmentPath")]
        public string AttachmentPath { get; set; }
    }

    /// <summary>
    /// correspondence model
    /// </summary>
    public class Correspondence
    {
        /// <summary>
        /// Gets or sets the message title
        /// </summary>
        [JsonProperty(PropertyName = "messageTitle")]
        public string MessageTitle { get; set; }

        /// <summary>
        /// Gets or sets the summary of the message
        /// </summary>
        [JsonProperty(PropertyName = "messageSummary")]
        public string MessageSummary { get; set; }

        /// <summary>
        /// Gets or sets the body of the message
        /// </summary>
        [JsonProperty(PropertyName = "messageBody")]
        public string MessageBody { get; set; }

        /// <summary>
        /// Gets or sets the custom message
        /// </summary>
        [JsonProperty(PropertyName = "customMessage")]
        public string CustomMessage { get; set; }
    }
}
