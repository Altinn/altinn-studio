using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AltinnCore.Runtime.Db.Models
{
    public class ReporteeElement
    {
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        [JsonProperty(PropertyName = "reporteeId")]
        public string ReporteeId { get; set; }

        [JsonProperty(PropertyName = "serviceId")]
        public string ServiceId { get; set; }

        [JsonProperty(PropertyName = "reporteeElementId")]
        public string ReporteeElementId { get; set; }

        [JsonProperty(PropertyName = "reporteeElementType")]
        public string ReporteeElementType { get; set; }

        [JsonProperty(PropertyName = "reporteeElementStatus")]
        public string ReporteeElementStatus { get; set; }

        [JsonProperty(PropertyName = "createdDateTime")]
        public DateTime CreatedDateTime { get; set; }

        [JsonProperty(PropertyName = "createdBy")]
        public string CreatedBy { get; set; }

        [JsonProperty(PropertyName = "lastChangedDateTime")]
        public DateTime LastChangedDateTime { get; set; }

        [JsonProperty(PropertyName = "lastChangedBy")]
        public string LastChangedBy { get; set; }

        [JsonProperty(PropertyName = "dueDateTime")]
        public DateTime DueDateTime { get; set; }

        [JsonProperty(PropertyName = "visibleDateTime")]
        public DateTime VisibleDateTime { get; set; }

        [JsonProperty(PropertyName = "title")]
        public string Title { get; set; }

        [JsonProperty(PropertyName = "serviceOwner")]
        public string ServiceOwner { get; set; }

        [JsonProperty(PropertyName = "externalSystemReference")]
        public string ExternalSystemReference { get; set; }

        [JsonProperty(PropertyName = "visibleDateTime")]
        public string VisisbleDateTime { get; set; }

        [JsonProperty(PropertyName = "workflowId")]
        public string WorkflowId { get; set; }

        [JsonProperty(PropertyName = "currentWorkflowStep")]
        public string CurrentWorkflowStep { get; set; }

        [JsonProperty(PropertyName = "isDeleted")]
        public bool IsDeleted { get; set; }

        [JsonProperty(PropertyName = "isArchived")]
        public bool IsArchived { get; set; }

        [JsonProperty(PropertyName = "numberOfForms")]
        public int NumberOfForms { get; set; }

        [JsonProperty(PropertyName = "formId")]
        public string[] FormId { get; set; }

        [JsonProperty(PropertyName = "Attachments")]
        public Attachments ReporteeElementAttachment { get; set; }

        [JsonProperty(PropertyName = "message")]
        public Correspondence Message { get; set; }
        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    public class Attachments
    {
        [JsonProperty(PropertyName = "attachmentId")]
        public string AttachmentId { get; set; }

        [JsonProperty(PropertyName = "contentType")]
        public string ContentType { get; set; }

        [JsonProperty(PropertyName = "attachmentName")]
        public string AttachmentName { get; set; }

        [JsonProperty(PropertyName = "attachmentPath")]
        public string AttachmentPath { get; set; }
    }

    public class Correspondence
    {
        [JsonProperty(PropertyName = "messageTitle")]
        public string MessageTitle { get; set; }

        [JsonProperty(PropertyName = "messageSummary")]
        public string MessageSummary { get; set; }

        [JsonProperty(PropertyName = "messageBody")]
        public string MessageBody { get; set; }

        [JsonProperty(PropertyName = "customMessage")]
        public string CustomMessage { get; set; }
    }
}
